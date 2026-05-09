import {
  IsString,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsEthereumAddress,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SubmitIntentDto {
  @ApiProperty({
    description: 'Asset pair to trade (e.g., "WETH/USDC")',
    example: 'WETH/USDC',
  })
  @IsString()
  @IsNotEmpty()
  assetPair!: string;

  @ApiProperty({
    description:
      "Trade size in the input token's base unit (e.g., 1e18 for 1 WETH)",
    example: '50000000000000000000', // 50 WETH
  })
  @IsString()
  @IsNotEmpty()
  amount!: string;

  @ApiProperty({
    description:
      'Secret limit price in fixed-point (1e6). This is hashed before storage. ' +
      'It is NEVER stored in plaintext — only a keccak256 commitment is persisted.',
    example: '2490000000', // $2,490.000000 per ETH
  })
  @IsString()
  @IsNotEmpty()
  limitPrice!: string;

  @ApiProperty({
    description:
      "Ethereum address of the institutional client's settlement wallet",
    example: '0xInstitutionalClientWalletAddress',
  })
  @IsString()
  @IsNotEmpty()
  swapperAddress!: string;

  @ApiPropertyOptional({
    description: 'Origin chain ID (default: 1 = Ethereum mainnet)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  originChainId?: number = 1;

  @ApiPropertyOptional({
    description: 'Destination chain ID',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  destinationChainId?: number = 1;

  @ApiPropertyOptional({
    description:
      'Intent validity duration in seconds from now (default: 300 = 5 minutes)',
    example: 300,
    default: 300,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(60)
  @Max(3600)
  @Type(() => Number)
  ttlSeconds?: number = 300;
}

export class SubmitBidDto {
  @ApiProperty({
    description: 'ERC-7683 order hash this bid responds to',
    example: '0xabcdef1234...',
  })
  @IsString()
  @IsNotEmpty()
  orderHash!: string;

  @ApiProperty({
    description: "Solver's on-chain address",
    example: '0xSolverAddress',
  })
  @IsString()
  @IsNotEmpty()
  solverAddress!: string;

  @ApiProperty({
    description:
      'Aggregate quote in fixed-point (1e6). This is the public output of ' +
      'the Noir circuit — the only price value that leaves the proof.',
    example: '2492000000',
  })
  @IsString()
  @IsNotEmpty()
  finalAggregateQuote!: string;

  @ApiProperty({
    description: 'Hex-encoded Noir proof bytes',
    example: '0x1234abcd...',
  })
  @IsString()
  @IsNotEmpty()
  proof!: string;

  @ApiProperty({
    description: 'Block number at which this bid expires',
    example: 20500000,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  bidExpiry!: number;
}
