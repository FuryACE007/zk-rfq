import { Module } from '@nestjs/common';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { IntentsModule } from '../intents/intents.module';
import { SettlementModule } from '../settlement/settlement.module';

@Module({
  imports: [IntentsModule, SettlementModule],
  controllers: [BidsController],
  providers: [BidsService],
})
export class BidsModule {}
