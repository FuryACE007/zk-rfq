import { Module } from '@nestjs/common';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { IntentsModule } from '../intents/intents.module';
import { EssentialModule } from '../essential/essential.module';
import { SettlementModule } from '../settlement/settlement.module';

@Module({
  imports: [IntentsModule, EssentialModule, SettlementModule],
  controllers: [BidsController],
  providers: [BidsService],
})
export class BidsModule {}
