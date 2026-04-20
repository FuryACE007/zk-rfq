import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EvmSettlementService } from '../evm/evm-settlement.service';
import { NoirProverService } from './noir-prover.service';

interface StoredProof {
  orderHash: string;
  solverAddress: string;
  aggregateQuote: string;
  solverProof: string;
  timestamp: number;
}

/**
 * Settlement Service
 *
 * Orchestrates the two-proof settlement flow:
 *   1. Solver submits bid + Circuit 1 proof (aggregate_derivation) -> stored here
 *   2. Institution approves + Circuit 2 proof (limit_check) -> triggers on-chain settlement
 *   3. Both proofs submitted to ZkRfqSettlement on Sepolia
 *   4. On-chain verification + atomic ERC-20 transfers
 */
@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  // In-memory store of solver proofs awaiting institution approval
  private solverProofs = new Map<string, StoredProof>();

  // Completed settlements (orderHash -> Sepolia tx details)
  private settlements = new Map<
    string,
    { txHash: string; blockNumber: number; etherscanUrl: string }
  >();

  constructor(
    private readonly evmSettlement: EvmSettlementService,
    private readonly events: EventEmitter2,
    private readonly noirProver: NoirProverService,
  ) {}

  /**
   * Store solver's proof after Essential accepts the bid.
   * Called from BidsService when a solver bid is accepted.
   */
  storeSolverProof(
    orderHash: string,
    solverAddress: string,
    aggregateQuote: string,
    solverProof: string,
  ) {
    this.solverProofs.set(orderHash, {
      orderHash,
      solverAddress,
      aggregateQuote,
      solverProof,
      timestamp: Date.now(),
    });

    this.logger.log(
      `Solver proof stored for ${orderHash.slice(0, 16)}... (awaiting institution approval)`,
    );
  }

  /**
   * Get the stored solver proof for an order (used by frontend to show bid details).
   */
  getSolverProof(orderHash: string): StoredProof | undefined {
    return this.solverProofs.get(orderHash);
  }

  /**
   * Institution approves settlement by submitting their limit_check proof.
   * This triggers the on-chain settlement with both proofs.
   */
  async approveSettlement(
    orderHash: string,
    institutionProof: string,
    publicInputs: string[],
  ): Promise<{
    settled: boolean;
    txHash?: string;
    blockNumber?: number;
    etherscanUrl?: string;
    error?: string;
  }> {
    const stored = this.solverProofs.get(orderHash);
    if (!stored) {
      return {
        settled: false,
        error: 'No solver proof found for this order. Solver must bid first.',
      };
    }

    this.logger.log(
      `Institution approved settlement for ${orderHash.slice(0, 16)}... ` +
        `Submitting both proofs to Sepolia...`,
    );

    // Submit both proofs to Sepolia settlement contract
    const result = await this.evmSettlement.settleOnChain(
      orderHash,
      stored.solverAddress,
      stored.aggregateQuote,
      stored.solverProof,
      institutionProof,
      publicInputs,
    );

    if (result) {
      const etherscanUrl = this.evmSettlement.getEtherscanUrl(result.txHash);

      // Store settlement result
      this.settlements.set(orderHash, {
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        etherscanUrl,
      });

      // Clean up stored proof
      this.solverProofs.delete(orderHash);

      // Emit settlement event
      this.events.emit('settlement.onchain', {
        orderHash,
        solver: stored.solverAddress,
        aggregateQuote: stored.aggregateQuote,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        etherscanUrl,
      });

      this.logger.log(
        `ON-CHAIN SETTLEMENT COMPLETE: ${orderHash.slice(0, 16)}... | ` +
          `tx=${result.txHash} | ${etherscanUrl}`,
      );

      return {
        settled: true,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        etherscanUrl,
      };
    }

    return {
      settled: false,
      error: 'On-chain settlement failed. Check Sepolia connection and contract state.',
    };
  }

  /**
   * Institution submits their secret limit price.
   * Gateway generates the limit_check proof server-side, then triggers on-chain settlement.
   *
   * NOTE: In production this proof would be generated client-side (browser WASM via @noir-lang/noir_js)
   * so the limit never leaves the institution's machine. Server-side is used here for the demo.
   */
  async proveAndSettle(
    orderHash: string,
    institutionLimit: string,
  ): Promise<{
    settled: boolean;
    txHash?: string;
    blockNumber?: number;
    etherscanUrl?: string;
    error?: string;
  }> {
    const stored = this.solverProofs.get(orderHash);
    if (!stored) {
      return {
        settled: false,
        error: 'No solver proof found for this order. Solver must bid first.',
      };
    }

    this.logger.log(
      `Generating limit_check proof for ${orderHash.slice(0, 16)}... ` +
        `limit=${institutionLimit} aggregate=${stored.aggregateQuote}`,
    );

    let proof: string;
    let publicInputs: string[];

    try {
      ({ proof, publicInputs } = await this.noirProver.generateLimitCheckProof(
        institutionLimit,
        stored.aggregateQuote,
      ));
    } catch (e: any) {
      return { settled: false, error: e.message };
    }

    return this.approveSettlement(orderHash, proof, publicInputs);
  }

  /**
   * Get settlement status for an order.
   */
  getSettlement(orderHash: string) {
    const onChain = this.settlements.get(orderHash);
    const pending = this.solverProofs.get(orderHash);

    if (onChain) {
      return {
        status: 'settled',
        ...onChain,
      };
    }

    if (pending) {
      return {
        status: 'awaiting_institution_approval',
        solverAddress: pending.solverAddress,
        aggregateQuote: pending.aggregateQuote,
        bidTimestamp: pending.timestamp,
      };
    }

    return { status: 'not_found' };
  }
}
