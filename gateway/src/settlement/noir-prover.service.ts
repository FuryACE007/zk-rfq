import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';

/**
 * NoirProverService — Server-side Noir proof generation.
 *
 * Generates the limit_check proof for the institution's settlement approval.
 * In production this would be generated client-side in the browser (noir_js WASM)
 * so the limit price never leaves the institution's machine.
 * For the testnet demo, server-side generation is used for simplicity.
 *
 * Requires nargo + bb CLI on PATH, or falls back to a mock proof (hex bytes)
 * suitable for use with MockVerifier-deployed contracts.
 */
@Injectable()
export class NoirProverService {
  private readonly logger = new Logger(NoirProverService.name);
  private readonly circuitsPath: string;
  private readonly hasToolchain: boolean;

  constructor(private readonly config: ConfigService) {
    this.circuitsPath = this.config.get<string>('CIRCUITS_PATH') ?? path.join(__dirname, '..', '..', '..', '..', 'circuits');
    this.hasToolchain = this.checkToolchain();
  }

  private checkToolchain(): boolean {
    try {
      execSync('nargo --version', { stdio: 'ignore' });
      execSync('bb --version', { stdio: 'ignore' });
      this.logger.log('Noir toolchain available (nargo + bb)');
      return true;
    } catch {
      this.logger.warn('nargo/bb not found — limit_check proof will use mock bytes (requires MockVerifier)');
      return false;
    }
  }

  /**
   * Generate a limit_check proof attesting that aggregate >= institutionLimit.
   *
   * @param institutionLimit  Secret limit price (1e6 fixed-point, e.g. 2490000000)
   * @param aggregateQuote    Solver's final aggregate quote (same units, public)
   * @returns Hex-encoded proof bytes
   */
  async generateLimitCheckProof(
    institutionLimit: string,
    aggregateQuote: string,
  ): Promise<{ proof: string; publicInputs: string[] }> {
    const limitMicro = BigInt(institutionLimit);
    const aggregateMicro = BigInt(aggregateQuote);

    if (aggregateMicro < limitMicro) {
      throw new Error(
        `Aggregate quote $${(Number(aggregateMicro) / 1e6).toFixed(4)} is below ` +
        `institution limit $${(Number(limitMicro) / 1e6).toFixed(4)}. Proof cannot be generated.`,
      );
    }

    const publicInputs = [aggregateQuote];

    if (this.hasToolchain) {
      try {
        const proof = await this.generateRealProof(institutionLimit, aggregateQuote);
        return { proof, publicInputs };
      } catch (e) {
        this.logger.warn(`Real proof generation failed: ${e}. Falling back to mock.`);
      }
    }

    // Mock proof — works only with MockVerifier-deployed contracts
    const proof = this.generateMockProof(institutionLimit, aggregateQuote);
    this.logger.warn('Using mock limit_check proof. Deploy with runDemo() for mock verifier support.');
    return { proof, publicInputs };
  }

  private async generateRealProof(
    institutionLimit: string,
    aggregateQuote: string,
  ): Promise<string> {
    const circuitDir = path.join(this.circuitsPath, 'limit_check');

    if (!fs.existsSync(circuitDir)) {
      throw new Error(`Circuit not found: ${circuitDir}`);
    }

    const proverToml = `institutional_limit = "${institutionLimit}"\nfinal_aggregate_quote = "${aggregateQuote}"\n`;
    fs.writeFileSync(path.join(circuitDir, 'Prover.toml'), proverToml);

    this.logger.log('Running nargo execute for limit_check...');
    execSync('nargo execute --package limit_check', {
      cwd: this.circuitsPath,
      stdio: 'pipe',
    });

    const circuitJson = path.join(this.circuitsPath, 'target', 'limit_check.json');
    const witnessFile = path.join(this.circuitsPath, 'target', 'limit_check.gz');
    const proofOutput = path.join(this.circuitsPath, 'target', 'limit_proof');

    const vkDir = path.join(this.circuitsPath, 'target', 'limit_vk');
    const vkPath = path.join(vkDir, 'vk');
    if (!fs.existsSync(vkPath)) {
      fs.mkdirSync(vkDir, { recursive: true });
      execSync(
        `bb write_vk -b "${circuitJson}" -o "${vkDir}" --oracle_hash keccak`,
        { stdio: 'pipe' },
      );
    }

    this.logger.log('Generating UltraHonk proof for limit_check...');
    execSync(
      `bb prove -b "${circuitJson}" -w "${witnessFile}" -o "${proofOutput}" --oracle_hash keccak`,
      { stdio: 'pipe' },
    );

    const proofBytes = fs.readFileSync(proofOutput);
    this.logger.log(`limit_check proof generated: ${proofBytes.length} bytes`);
    return proofBytes.toString('hex');
  }

  private generateMockProof(institutionLimit: string, aggregateQuote: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${institutionLimit},${aggregateQuote},noir_limit_check_v1`)
      .digest();
    return hash.toString('hex');
  }
}
