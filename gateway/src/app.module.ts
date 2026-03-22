import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EssentialModule } from './essential/essential.module';
import { IntentsModule } from './intents/intents.module';
import { BidsModule } from './bids/bids.module';
import { HealthController } from './health/health.controller';

/**
 * ─── ZK-RFQ Sovereign Gateway — Root Application Module ─────────────────────
 *
 * Module hierarchy:
 *   ConfigModule → EssentialModule → IntentsModule → BidsModule
 *
 * The EssentialModule provides the REST client for the Essential declarative
 * protocol server, handling intent storage, solution validation, and block
 * building natively.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    EssentialModule,
    IntentsModule,
    BidsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
