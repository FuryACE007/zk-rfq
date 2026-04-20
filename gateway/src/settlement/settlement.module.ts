import { Module } from '@nestjs/common';
import { EvmSettlementModule } from '../evm/evm-settlement.module';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { NoirProverService } from './noir-prover.service';

@Module({
  imports: [EvmSettlementModule],
  controllers: [SettlementController],
  providers: [SettlementService, NoirProverService],
  exports: [SettlementService],
})
export class SettlementModule {}
