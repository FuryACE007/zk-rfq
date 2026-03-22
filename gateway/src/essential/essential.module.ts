import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EssentialService } from './essential.service';

/**
 * ─── Essential Protocol Module ───────────────────────────────────────────────
 *
 * Global NestJS module providing the EssentialService — the sole interface
 * between our gateway and the Essential declarative protocol server.
 *
 * The EssentialService wraps the essential-rest-server REST API:
 *   POST /deploy-contract     — Deploy compiled Pint bytecode
 *   POST /submit-solution     — Submit a solution (state mutation)
 *   GET  /query-state          — Query contract storage
 *   GET  /list-solutions-pool  — List pending solutions
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [EssentialService],
  exports: [EssentialService],
})
export class EssentialModule {}
