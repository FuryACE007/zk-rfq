import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * EVM Settlement Service
 *
 * Bridges the ZK-RFQ gateway to Sepolia for on-chain settlement.
 * Uses ethers.js v6 to:
 *   - Register orders on ZkRfqSettlement when intents are submitted
 *   - Execute settlement with both ZK proofs (solver + institution)
 *   - Query token balances (MockWETH/MockUSDC)
 */
@Injectable()
export class EvmSettlementService implements OnModuleInit {
  private readonly logger = new Logger(EvmSettlementService.name);

  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private settlement: ethers.Contract | null = null;
  private weth: ethers.Contract | null = null;
  private usdc: ethers.Contract | null = null;

  private configured = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const rpcUrl = this.config.get<string>('SEPOLIA_RPC_URL');
    const privateKey = this.config.get<string>('GATEWAY_PRIVATE_KEY');
    const settlementAddr = this.config.get<string>('SETTLEMENT_CONTRACT');
    const wethAddr = this.config.get<string>('MOCK_WETH_ADDRESS');
    const usdcAddr = this.config.get<string>('MOCK_USDC_ADDRESS');

    if (!rpcUrl || !privateKey || !settlementAddr) {
      this.logger.warn(
        'Sepolia EVM settlement not configured. ' +
          'Set SEPOLIA_RPC_URL, GATEWAY_PRIVATE_KEY, SETTLEMENT_CONTRACT in .env',
      );
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);

      // Load ABI
      const abiPath = path.join(__dirname, 'ZkRfqSettlement.abi.json');
      const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

      this.settlement = new ethers.Contract(settlementAddr, abi, this.signer);

      // ERC20 minimal ABI for balance queries
      const erc20Abi = [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ];

      if (wethAddr) {
        this.weth = new ethers.Contract(wethAddr, erc20Abi, this.provider);
      }
      if (usdcAddr) {
        this.usdc = new ethers.Contract(usdcAddr, erc20Abi, this.provider);
      }

      this.configured = true;

      const network = await this.provider.getNetwork();
      this.logger.log(
        `Sepolia EVM connected: chainId=${network.chainId}, gateway=${this.signer.address}`,
      );
    } catch (e) {
      this.logger.error(`Failed to initialize Sepolia connection: ${e}`);
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Register an order on the Sepolia settlement contract.
   * Called when an intent is submitted to Essential.
   */
  async registerOrder(
    orderHash: string,
    swapper: string,
    wethAmount: string,
  ): Promise<{ txHash: string } | null> {
    if (!this.settlement) {
      this.logger.warn('Settlement contract not configured, skipping registerOrder');
      return null;
    }

    try {
      this.logger.log(
        `Registering order on Sepolia: ${orderHash.slice(0, 16)}...`,
      );

      const tx = await this.settlement.registerOrder(
        orderHash,
        swapper,
        ethers.parseEther(wethAmount),
      );

      const receipt = await tx.wait();
      this.logger.log(
        `Order registered on Sepolia: tx=${receipt.hash}`,
      );

      return { txHash: receipt.hash };
    } catch (e: any) {
      this.logger.error(`registerOrder failed: ${e.message}`);
      return null;
    }
  }

  /**
   * Execute on-chain settlement with both ZK proofs.
   * Called after both solver proof (Circuit 1) and institution proof (Circuit 2) are available.
   */
  async settleOnChain(
    orderHash: string,
    solver: string,
    aggregateQuote: string,
    solverProof: string,
    institutionProof: string,
    publicInputs: string[],
  ): Promise<{ txHash: string; blockNumber: number } | null> {
    if (!this.settlement) {
      this.logger.warn('Settlement contract not configured, skipping settleOnChain');
      return null;
    }

    try {
      this.logger.log(
        `Settling order on Sepolia: ${orderHash.slice(0, 16)}... | solver=${solver.slice(0, 12)}...`,
      );

      // Convert hex proof strings to bytes
      const solverProofBytes = ethers.getBytes(
        solverProof.startsWith('0x') ? solverProof : `0x${solverProof}`,
      );
      const institutionProofBytes = ethers.getBytes(
        institutionProof.startsWith('0x') ? institutionProof : `0x${institutionProof}`,
      );

      // Public inputs as bytes32 array
      const publicInputsBytes32 = publicInputs.map((input) =>
        ethers.zeroPadValue(
          ethers.toBeHex(BigInt(input)),
          32,
        ),
      );

      const tx = await this.settlement.settleOrder(
        orderHash,
        solver,
        BigInt(aggregateQuote),
        solverProofBytes,
        institutionProofBytes,
        publicInputsBytes32,
      );

      const receipt = await tx.wait();
      this.logger.log(
        `Settlement executed on Sepolia: tx=${receipt.hash} block=${receipt.blockNumber}`,
      );

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (e: any) {
      this.logger.error(`settleOnChain failed: ${e.message}`);
      return null;
    }
  }

  /**
   * Query MockWETH and MockUSDC balances for an address.
   */
  async getTokenBalances(
    address: string,
  ): Promise<{ weth: string; usdc: string } | null> {
    if (!this.provider) return null;

    try {
      const wethBal = this.weth
        ? await this.weth.balanceOf(address)
        : BigInt(0);
      const usdcBal = this.usdc
        ? await this.usdc.balanceOf(address)
        : BigInt(0);

      return {
        weth: ethers.formatEther(wethBal),
        usdc: ethers.formatUnits(usdcBal, 6),
      };
    } catch (e: any) {
      this.logger.error(`getTokenBalances failed: ${e.message}`);
      return null;
    }
  }

  /**
   * Get the Sepolia Etherscan URL for a transaction.
   */
  getEtherscanUrl(txHash: string): string {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }
}
