import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * ─── Essential Protocol Service ──────────────────────────────────────────────
 *
 * This service is the ONLY point of contact between the NestJS gateway and
 * the Essential declarative protocol. It wraps the essential-rest-server
 * REST API with typed methods.
 *
 * What Essential handles natively:
 *   ✓ Intent pool storage
 *   ✓ Solution validation (Pint predicate constraints)
 *   ✓ State persistence
 *   ✓ Block building + inclusion auction
 *   ✓ Competing solver coordination
 *
 * All we provide: formatted solutions that satisfy our Pint contract's
 * predicates. Essential validates everything else.
 */

// ─── Essential REST API Types ────────────────────────────────────────────────

/** Compiled Pint contract — output of `pint build` */
export interface CompiledContract {
  predicates: Array<{
    name: string;
    bytecode: number[]; // Pint bytecode
  }>;
  salt: number[];
}

/** A solution proposes state mutations that satisfy one or more predicates */
export interface EssentialSolution {
  data: SolutionData[];
}

export interface SolutionData {
  predicate_to_solve: PredicateAddress;
  decision_variables: number[][]; // Solver-provided values
  state_mutations: StateMutation[]; // Proposed state changes
}

export interface PredicateAddress {
  contract: number[]; // Contract content address (b256)
  predicate: number[]; // Predicate content address (b256)
}

export interface StateMutation {
  key: number[]; // Storage key (hashed)
  value: number[]; // New value (encoded)
}

/** Query response for contract state */
export interface StateQueryResponse {
  value: number[] | null;
}

/** Contract address after deployment */
export interface DeployResponse {
  address: number[]; // Content-addressed contract hash
}

/** Block information from Essential */
export interface EssentialBlock {
  number: number;
  solutions: EssentialSolution[];
  timestamp: number;
}

@Injectable()
export class EssentialService implements OnModuleInit {
  private readonly logger = new Logger(EssentialService.name);
  private client: AxiosInstance;
  private apiUrl: string;
  private contractAddress: number[] | null = null;

  constructor(private readonly config: ConfigService) {
    this.apiUrl =
      (config.get('ESSENTIAL_API_URL') as string) ?? 'http://localhost:3553';

    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.checkConnection();
  }

  // ─── Connection Health ──────────────────────────────────────────────────

  async checkConnection(): Promise<boolean> {
    try {
      await this.client.get('/health');
      this.logger.log(`✅ Connected to Essential server at ${this.apiUrl}`);
      return true;
    } catch {
      this.logger.warn(
        `⚠️  Essential server not reachable at ${this.apiUrl}. ` +
          `Run: docker compose up -d`
      );
      return false;
    }
  }

  // ─── Contract Deployment ────────────────────────────────────────────────

  /**
   * Deploy a compiled Pint contract to the Essential server.
   * The contract is content-addressed — deploying the same bytecode twice
   * returns the same address (idempotent).
   */
  async deployContract(contract: CompiledContract): Promise<number[]> {
    try {
      const res = await this.client.post<number[]>(
        '/deploy-contract',
        contract
      );
      this.contractAddress = res.data;
      this.logger.log(
        `📜 Contract deployed — address: ${this.formatB256(res.data)}`
      );
      return res.data;
    } catch (err) {
      this.logger.error(`Contract deployment failed: ${err}`);
      throw err;
    }
  }

  /** Get or set the active contract address */
  getContractAddress(): number[] | null {
    return this.contractAddress;
  }

  setContractAddress(address: number[]): void {
    this.contractAddress = address;
    this.logger.log(`📜 Contract address set: ${this.formatB256(address)}`);
  }

  // ─── Solution Submission ────────────────────────────────────────────────

  /**
   * Submit a solution to the Essential server. The server validates it
   * against all relevant Pint predicates and, if valid, includes it in
   * the next block.
   */
  async submitSolution(solution: EssentialSolution): Promise<{
    accepted: boolean;
    block?: number;
    error?: string;
  }> {
    try {
      const res = await this.client.post('/submit-solution', solution);
      this.logger.log(`✅ Solution accepted by Essential server`);
      return { accepted: true, block: res.data?.block_number };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ?? err.message ?? String(err);
      this.logger.warn(`❌ Solution rejected: ${errorMsg}`);
      return { accepted: false, error: errorMsg };
    }
  }

  /**
   * Check a solution without submitting (dry run).
   * Useful for solver-side validation before committing.
   */
  async checkSolution(
    solution: EssentialSolution
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      await this.client.post('/check-solution', solution);
      return { valid: true, errors: [] };
    } catch (err: any) {
      const errors = err.response?.data?.errors ?? [String(err)];
      return { valid: false, errors };
    }
  }

  // ─── State Queries ──────────────────────────────────────────────────────

  /**
   * Query a single storage slot from the deployed contract.
   * This is how we read order data, settlement status, solver whitelist, etc.
   */
  async queryState(
    contractAddr: number[],
    key: number[]
  ): Promise<number[] | null> {
    try {
      const res = await this.client.post<StateQueryResponse>('/query-state', {
        address: contractAddr,
        key,
      });
      return res.data?.value ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Query multiple storage keys in batch.
   */
  async queryStateBatch(
    contractAddr: number[],
    keys: number[][]
  ): Promise<Map<string, number[] | null>> {
    const results = new Map<string, number[] | null>();
    // Essential server may support batch queries; fall back to sequential
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.queryState(contractAddr, key);
        results.set(JSON.stringify(key), value);
      })
    );
    return results;
  }

  // ─── Solutions Pool ─────────────────────────────────────────────────────

  /**
   * List solutions waiting to be included in the next block.
   * This is the "mempool" view for the frontend dashboard.
   */
  async listSolutionPool(): Promise<EssentialSolution[]> {
    try {
      const res = await this.client.get<EssentialSolution[]>(
        '/list-solutions-pool'
      );
      return res.data;
    } catch {
      return [];
    }
  }

  // ─── Block Queries ──────────────────────────────────────────────────────

  /** Get the latest block from the Essential server */
  async getLatestBlock(): Promise<EssentialBlock | null> {
    try {
      const res = await this.client.get<EssentialBlock>('/latest-block');
      return res.data;
    } catch {
      return null;
    }
  }

  /** List recent blocks */
  async listBlocks(limit = 10): Promise<EssentialBlock[]> {
    try {
      const res = await this.client.get<EssentialBlock[]>(
        `/list-blocks?limit=${limit}`
      );
      return res.data;
    } catch {
      return [];
    }
  }

  // ─── Utility Methods ───────────────────────────────────────────────────

  /** Convert a b256 (number[]) to hex string for display */
  formatB256(bytes: number[]): string {
    return '0x' + bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** Convert a hex string to b256 (number[]) for Essential API */
  hexToB256(hex: string): number[] {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const padded = clean.padStart(64, '0');
    const bytes: number[] = [];
    for (let i = 0; i < 64; i += 2) {
      bytes.push(parseInt(padded.substring(i, i + 2), 16));
    }
    return bytes;
  }

  /** Encode an integer as a word array for Essential */
  intToWords(value: bigint | number): number[] {
    const val = BigInt(value);
    const bytes: number[] = [];
    for (let i = 0; i < 8; i++) {
      bytes.push(Number((val >> BigInt(8 * (7 - i))) & 0xffn));
    }
    return bytes;
  }

  /** Decode a word array back to integer */
  wordsToInt(words: number[]): bigint {
    let val = 0n;
    for (let i = 0; i < words.length && i < 8; i++) {
      val = (val << 8n) | BigInt(words[i]);
    }
    return val;
  }

  /** Build a storage key for mapped storage: hash(slot_index, map_key) */
  buildStorageKey(slotIndex: number, mapKey: number[]): number[] {
    // Essential uses content-addressed storage keys.
    // For mapped storage like `order_amount: (b256 => int)`,
    // the key is derived from the storage slot index and the map key.
    // In practice, this uses the ABI-generated key functions.
    // For the PoC, we construct them manually.
    const slot = this.intToWords(slotIndex);
    return [...slot, ...mapKey];
  }
}
