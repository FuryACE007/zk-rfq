import { Controller, Get, Query } from '@nestjs/common';
import { EssentialService } from '../essential/essential.service';

@Controller('health')
export class HealthController {
  constructor(private readonly essential: EssentialService) {}

  @Get()
  async check() {
    const essentialOnline = await this.essential.checkConnection();
    const contractAddr = this.essential.getContractAddress();
    return {
      gateway: 'operational',
      essential: essentialOnline ? 'connected' : 'offline',
      contract: contractAddr
        ? this.essential.formatB256(contractAddr)
        : 'not_deployed',
      architecture: 'Essential declarative protocol (no EVM simulation)',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('essential-block')
  async essentialBlock() {
    const block = await this.essential.getLatestBlock();
    if (block) {
      return { online: true, number: block.number, timestamp: block.timestamp };
    }
    return { online: false, number: null, timestamp: null };
  }
}
