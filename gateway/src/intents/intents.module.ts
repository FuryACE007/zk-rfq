import { Module } from '@nestjs/common';
import { IntentsController } from './intents.controller';
import { IntentsService } from './intents.service';
import { EvmSettlementModule } from '../evm/evm-settlement.module';

@Module({
  imports: [EvmSettlementModule],
  controllers: [IntentsController],
  providers: [IntentsService],
  exports: [IntentsService],
})
export class IntentsModule {}
