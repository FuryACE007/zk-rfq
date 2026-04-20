import { Controller, Post, Get, Param, Body, Logger } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { EvmSettlementService } from '../evm/evm-settlement.service';

class ApproveSettlementDto {
  orderHash: string;
  institutionProof: string;
  publicInputs: string[];
}

class ProveAndSettleDto {
  orderHash: string;
  institutionLimit: string; // 1e6 fixed-point string, e.g. "2490000000"
}

/**
 * Settlement Controller
 *
 * Endpoints for the two-proof settlement flow:
 *   POST /settlement/approve  — Institution submits Circuit 2 proof to trigger on-chain settlement
 *   GET  /settlement/:hash    — Query settlement status (Essential + Sepolia)
 *   GET  /balances/:address   — Query MockWETH/MockUSDC balances on Sepolia
 */
@Controller()
export class SettlementController {
  private readonly logger = new Logger(SettlementController.name);

  constructor(
    private readonly settlement: SettlementService,
    private readonly evmSettlement: EvmSettlementService,
  ) {}

  /**
   * Institution submits their limit_check proof to approve settlement.
   *
   * Body: { orderHash, institutionProof, publicInputs }
   *
   * Gateway combines this with the stored solver proof (Circuit 1)
   * and calls ZkRfqSettlement.settleOrder() on Sepolia with both proofs.
   */
  @Post('settlement/approve')
  async approveSettlement(@Body() dto: ApproveSettlementDto) {
    this.logger.log(
      `Institution approval received for ${dto.orderHash.slice(0, 16)}...`,
    );

    return this.settlement.approveSettlement(
      dto.orderHash,
      dto.institutionProof,
      dto.publicInputs,
    );
  }

  /**
   * Institution submits their secret limit price — gateway generates limit_check proof
   * server-side and triggers on-chain settlement with both proofs.
   *
   * Body: { orderHash, institutionLimit }
   * institutionLimit: 1e6 fixed-point string (e.g. "2490000000" = $2,490.000000)
   *
   * NOTE: In production the proof would be generated client-side via @noir-lang/noir_js WASM
   * so the limit never leaves the browser. Server-side generation is used for the demo.
   */
  @Post('settlement/prove-and-settle')
  async proveAndSettle(@Body() dto: ProveAndSettleDto) {
    this.logger.log(
      `Institution prove-and-settle for ${dto.orderHash.slice(0, 16)}...`,
    );
    return this.settlement.proveAndSettle(dto.orderHash, dto.institutionLimit);
  }

  /**
   * Query settlement status: Essential (private) + Sepolia (public).
   */
  @Get('settlement/:orderHash')
  async getSettlement(@Param('orderHash') orderHash: string) {
    return this.settlement.getSettlement(orderHash);
  }

  /**
   * Query MockWETH/MockUSDC balances for an address on Sepolia.
   */
  @Get('balances/:address')
  async getBalances(@Param('address') address: string) {
    const balances = await this.evmSettlement.getTokenBalances(address);
    if (!balances) {
      return {
        error: 'Sepolia EVM not configured. Set SEPOLIA_RPC_URL in .env',
      };
    }
    return balances;
  }
}
