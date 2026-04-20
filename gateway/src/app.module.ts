import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EssentialModule } from './essential/essential.module';
import { EvmSettlementModule } from './evm/evm-settlement.module';
import { IntentsModule } from './intents/intents.module';
import { BidsModule } from './bids/bids.module';
import { SettlementModule } from './settlement/settlement.module';
import { HealthController } from './health/health.controller';

/**
 * ZK-RFQ Sovereign Gateway -- Root Application Module
 *
 * Module hierarchy:
 *   ConfigModule -> EssentialModule (private intent pool)
 *                -> EvmSettlementModule (Sepolia public settlement)
 *                -> IntentsModule -> BidsModule -> SettlementModule
 *
 * Two-layer architecture:
 *   Essential = private intent pool + execution masking
 *   Sepolia = public settlement + finality (ERC-20 transfers, Etherscan-visible)
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    EssentialModule,
    EvmSettlementModule,
    IntentsModule,
    BidsModule,
    SettlementModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
