import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IntentsService } from './intents.service';
import { SubmitIntentDto } from '../dto/gateway.dto';

@ApiTags('intents')
@Controller('intents')
export class IntentsController {
  private readonly logger = new Logger(IntentsController.name);

  constructor(private readonly intentsService: IntentsService) {}

  /**
   * POST /intents
   * Accepts raw trade parameters, formats to ERC-7683, and submits to Essential.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a new block trade intent',
    description:
      'Accepts raw institutional trade parameters. The gateway formats the order ' +
      'to ERC-7683 standard, commits the limit price (never stored in plaintext), ' +
      'generates an order hash, and submits the order to the Essential sovereign solution pool.',
  })
  @ApiResponse({
    status: 201,
    description: 'Intent created and cached in sovereign pool',
  })
  @ApiResponse({ status: 400, description: 'Invalid intent parameters' })
  @ApiResponse({ status: 409, description: 'Duplicate intent' })
  async submitIntent(@Body() dto: SubmitIntentDto) {
    this.logger.log(
      `[POST /intents] New intent received for asset pair ${dto.assetPair}`
    );
    return this.intentsService.submitIntent(dto);
  }

  /**
   * GET /intents/active
   * Returns active ERC-7683 orders for solver polling.
   */
  @Get('active')
  @ApiOperation({
    summary: 'Get all active ERC-7683 intents',
    description:
      'Whitelisted Solvers poll this endpoint to discover active block trade intents. ' +
      'Returns ERC-7683 CrossChainOrder objects. Expired orders are automatically purged.',
  })
  @ApiResponse({ status: 200, description: 'Array of active ERC-7683 orders' })
  async getActiveIntents() {
    return this.intentsService.getActiveIntents();
  }

  /**
   * GET /intents/:hash
   * Returns a specific intent by order hash.
   */
  @Get(':hash')
  @ApiOperation({ summary: 'Get a specific intent by order hash' })
  @ApiParam({
    name: 'hash',
    description: 'ERC-7683 order hash (0x-prefixed bytes32)',
  })
  @ApiResponse({ status: 200, description: 'Intent found' })
  @ApiResponse({ status: 404, description: 'Intent not found' })
  async getIntentByHash(@Param('hash') hash: string) {
    return this.intentsService.getIntentByHash(hash);
  }
}
