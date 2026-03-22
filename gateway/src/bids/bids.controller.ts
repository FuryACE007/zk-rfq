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
import { BidsService } from './bids.service';
import { SubmitBidDto } from '../dto/gateway.dto';

@ApiTags('bids')
@Controller('bids')
export class BidsController {
  private readonly logger = new Logger(BidsController.name);

  constructor(private readonly bidsService: BidsService) {}

  /**
   * POST /bids
   * Accepts a ZK-masked quote from a whitelisted solver.
   * After BID_THRESHOLD bids, triggers Noir proof verification and settlement.
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Submit a ZK-masked bid for an active intent',
    description:
      'Whitelisted Solvers submit their best aggregate price as a ZK-bid. ' +
      'The bid contains the public Noir circuit output (finalAggregateQuote) ' +
      'and the proof bytes. After 3 bids, settlement is automatically triggered.',
  })
  @ApiResponse({ status: 202, description: 'Bid accepted' })
  @ApiResponse({ status: 400, description: 'No active intent / invalid bid' })
  async submitBid(@Body() dto: SubmitBidDto) {
    this.logger.log(
      `[POST /bids] Solver ${dto.solverAddress} → order ${dto.orderHash}`
    );
    return this.bidsService.submitBid(dto);
  }

  /**
   * GET /bids/:orderHash
   * Returns all bids received for a given order hash.
   */
  @Get(':orderHash')
  @ApiOperation({ summary: 'Get all bids for an order' })
  @ApiParam({ name: 'orderHash', description: 'ERC-7683 order hash' })
  @ApiResponse({ status: 200, description: 'Bid list returned' })
  async getBidsForOrder(@Param('orderHash') orderHash: string) {
    const bids = await this.bidsService.getBidsForOrder(orderHash);
    return bids.map((b) => ({
      ...b,
      finalAggregateQuote: b.finalAggregateQuote.toString(),
    }));
  }
}
