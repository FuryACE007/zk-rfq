import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EssentialService,
  EssentialSolution,
  SolutionData,
} from '../essential/essential.service';
import { SubmitBidDto } from '../dto/gateway.dto';

/**
 * ─── Bids Service (Essential-Native) ─────────────────────────────────────────
 *
 * Handles solver bid submission by constructing Essential solutions that
 * target the SettleOrder predicate in our Pint contract.
 *
 * What Essential provides natively:
 *   ✓ Competing solver support — multiple solvers submit competing solutions;
 *     the block builder picks the optimal one based on bid inclusion auction
 *   ✓ Atomicity — invalid solutions are rejected before block inclusion
 *   ✓ No threshold logic needed — Essential's block builder is the aggregator
 */
@Injectable()
export class BidsService {
  private readonly logger = new Logger(BidsService.name);

  constructor(
    private readonly essential: EssentialService,
    private readonly events: EventEmitter2
  ) {}

  /**
   * Submit a solver's ZK-masked bid as an Essential solution.
   *
   * Flow:
   *   1. Solver has already: fetched JIT prices, computed aggregate, generated Noir proof
   *   2. We construct an Essential solution targeting SettleOrder predicate
   *   3. Submit to Essential server — if all Pint constraints pass, it settles
   *
   * In Essential's model, the "best bid selection" is handled by the
   * block builder's inclusion auction — NOT by our application code.
   * Solvers with better quotes (higher value to the institution) bid
   * more for inclusion, naturally selecting the best price.
   */
  async submitBid(dto: SubmitBidDto): Promise<{
    accepted: boolean;
    orderHash: string;
    settled: boolean;
    blockNumber?: number;
    error?: string;
  }> {
    this.logger.log(
      `📥 Solver bid received: ${dto.orderHash.slice(0, 16)}... | ` +
        `Quote: $${(Number(dto.finalAggregateQuote) / 1e6).toFixed(4)} | ` +
        `Solver: ${dto.solverAddress.slice(0, 12)}...`
    );

    const contractAddr = this.essential.getContractAddress();

    if (!contractAddr) {
      this.logger.warn(
        `⚠️  No Essential contract deployed. Bid queued locally.`
      );
      this.events.emit('bid.submitted', { dto, essentialAccepted: false });
      return {
        accepted: false,
        orderHash: dto.orderHash,
        settled: false,
        error: 'Essential contract not deployed',
      };
    }

    // ── Construct SettleOrder solution ─────────────────────────────────
    const solution = this.buildSettleOrderSolution(contractAddr, dto);

    // ── Optional: dry-run validation ──────────────────────────────────
    const check = await this.essential.checkSolution(solution);
    if (!check.valid) {
      this.logger.warn(
        `❌ Solution pre-check failed: ${check.errors.join(', ')}`
      );
      return {
        accepted: false,
        orderHash: dto.orderHash,
        settled: false,
        error: check.errors.join('; '),
      };
    }

    // ── Submit to Essential ────────────────────────────────────────────
    const result = await this.essential.submitSolution(solution);

    if (result.accepted) {
      this.logger.log(
        `🏆 Settlement solution accepted! Order ${dto.orderHash.slice(
          0,
          16
        )}... ` +
          `settled at $${(Number(dto.finalAggregateQuote) / 1e6).toFixed(
            4
          )} | ` +
          `Block: ${result.block ?? 'pending'}`
      );

      this.events.emit('settlement.completed', {
        orderHash: dto.orderHash,
        solver: dto.solverAddress,
        aggregateQuote: dto.finalAggregateQuote,
        block: result.block,
      });
    }

    return {
      accepted: result.accepted,
      orderHash: dto.orderHash,
      settled: result.accepted,
      blockNumber: result.block,
      error: result.error,
    };
  }

  /**
   * Query bids/settlements for a specific order from Essential state.
   */
  async getBidsForOrder(orderHash: string): Promise<any[]> {
    const contractAddr = this.essential.getContractAddress();
    if (!contractAddr) return [];

    const orderHashBytes = this.essential.hexToB256(orderHash);

    // Query settlement state
    const settledKey = this.essential.buildStorageKey(10, orderHashBytes); // settlement_completed slot
    const settled = await this.essential.queryState(contractAddr, settledKey);

    if (settled && settled[0] === 1) {
      // Get settlement details
      const solverKey = this.essential.buildStorageKey(7, orderHashBytes);
      const quoteKey = this.essential.buildStorageKey(8, orderHashBytes);
      const solver = await this.essential.queryState(contractAddr, solverKey);
      const quote = await this.essential.queryState(contractAddr, quoteKey);

      return [
        {
          orderHash,
          solverAddress: solver ? this.essential.formatB256(solver) : 'unknown',
          finalAggregateQuote: quote
            ? this.essential.wordsToInt(quote).toString()
            : '0',
          settled: true,
        },
      ];
    }

    // If not settled, check solutions pool for pending bids
    const pending = await this.essential.listSolutionPool();
    return pending.map((sol, i) => ({
      orderHash,
      index: i,
      status: 'pending_in_pool',
    }));
  }

  // ─── Private: Solution Construction ─────────────────────────────────────

  private buildSettleOrderSolution(
    contractAddr: number[],
    dto: SubmitBidDto
  ): EssentialSolution {
    const orderHashBytes = this.essential.hexToB256(dto.orderHash);
    const solverBytes = this.essential.hexToB256(dto.solverAddress);
    const quoteWords = this.essential.intToWords(
      BigInt(dto.finalAggregateQuote)
    );

    // Decision variables for SettleOrder predicate
    const decisionVariables = [
      orderHashBytes, // var order_hash: b256
      solverBytes, // var solver: b256
      quoteWords, // var aggregate_quote: int
      [1], // var proof_verified: bool = true
    ];

    // State mutations — mark order as settled
    const stateMutations = [
      // order_is_active → false
      { key: this.essential.buildStorageKey(5, orderHashBytes), value: [0] },
      // settlement_solver → solver address
      {
        key: this.essential.buildStorageKey(7, orderHashBytes),
        value: solverBytes,
      },
      // settlement_aggregate_quote → quote
      {
        key: this.essential.buildStorageKey(8, orderHashBytes),
        value: quoteWords,
      },
      // settlement_completed → true
      { key: this.essential.buildStorageKey(10, orderHashBytes), value: [1] },
    ];

    const solutionData: SolutionData = {
      predicate_to_solve: {
        contract: contractAddr,
        predicate: contractAddr, // SettleOrder predicate address
      },
      decision_variables: decisionVariables,
      state_mutations: stateMutations,
    };

    return { data: [solutionData] };
  }
}
