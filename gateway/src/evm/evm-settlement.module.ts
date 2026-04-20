import { Module } from '@nestjs/common';
import { EvmSettlementService } from './evm-settlement.service';

@Module({
  providers: [EvmSettlementService],
  exports: [EvmSettlementService],
})
export class EvmSettlementModule {}
