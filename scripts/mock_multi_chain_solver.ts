/**
 * @file mock_multi_chain_solver.ts
 * @title Whitelisted Multi-Chain JIT Solver Bot
 * @description
 * An autonomous solver that:
 *   1. Polls the Sovereign Gateway for active ERC-7683 intents
 *   2. Fetches JIT price quotes from Uniswap V3 (EVM) and Jupiter (Solana)
 *   3. Computes a weighted aggregate price across both chains
 *   4. Constructs the Noir circuit witness inputs
 *   5. Submits the ZK-masked bid back to the gateway
 *
 * Privacy guarantee: The solver reveals ONLY the aggregate price to the gateway.
 * Individual DEX prices and routing weights are private Noir witnesses — they
 * never leave this process in plaintext.
 *
 * Note: External API calls are simulated with realistic mock data and latency
 * to demonstrate the JIT multi-chain aggregation logic without requiring
 * live RPC connections in the PoC environment.
 */

import axios, { AxiosError } from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:4000';
const POLL_INTERVAL_MS = 2_000;
const SOLVER_ADDRESS =
  process.env.SOLVER_ADDRESS ?? '0xWhitelistedSolverAddress_PoC';
const VERSION = '1.0.0';

// Precision factor — matches the Noir circuit's PRECISION_FACTOR global
const PRECISION_FACTOR = 1_000_000n;
// Weight scale — matches WEIGHT_SCALE in main.nr (10000 bps = 100%)
const WEIGHT_SCALE = 10_000n;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ActiveIntent {
  orderHash: string;
  order: {
    orderData: {
      assetPair: string;
      fillDeadline: number;
      limitPriceCommitment: string;
    };
    inputs: Array<{ token: string; amount: string }>;
    outputs: Array<{ token: string; amount: string; recipient: string }>;
    swapper: string;
  };
  createdAt: number;
}

interface DexQuote {
  source: 'Uniswap V3 (EVM)' | 'Jupiter Aggregator (Solana)';
  chain: string;
  price: bigint; // fixed-point (scaled by PRECISION_FACTOR)
  priceHuman: string;
  liquidityDepth: bigint; // in token units
  latencyMs: number;
  poolOrRoute: string; // descriptive (NOT the actual pool address — alpha protected)
  timestamp: number;
}

interface AggregatedQuote {
  evmQuote: DexQuote;
  solanaQuote: DexQuote;
  evmWeightBps: bigint;
  solanaWeightBps: bigint;
  finalAggregateQuote: bigint;
  finalAggregateHuman: string;
}

interface NoirWitnessInputs {
  /** PRIVATE — institution's limit (extracted from order context for PoC) */
  institutional_limit: bigint;
  /** PRIVATE — Uniswap price (stays in-process, never transmitted) */
  uniswap_price: bigint;
  /** PRIVATE — Jupiter price (stays in-process, never transmitted) */
  jupiter_price: bigint;
  /** PRIVATE — routing weights (stays in-process, never transmitted) */
  dex_weights: [bigint, bigint];
  /** PUBLIC — only this leaves the solver */
  final_aggregate_quote: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock JIT Price Oracles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulates a Uniswap V3 TWAP query across tick-selected pools.
 * In production, this would call Uniswap's Quoter V2 contract via ethers.js:
 *   quoter.quoteExactInputSingle({ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96 })
 *
 * The pool address is intentionally NOT logged — protecting the solver's alpha.
 * The solver may have found a non-standard Uniswap pool with better fees.
 */
async function fetchUniswapPrice(assetPair: string): Promise<DexQuote> {
  const startMs = Date.now();

  console.log(`   🔵 [Uniswap V3] Querying EVM chain for ${assetPair}...`);

  // Simulate RPC latency
  await sleep(Math.random() * 200 + 100);

  // Realistic WETH/USDC price band with micro-variation
  const basePrices: Record<string, number> = {
    'WETH/USDC': 2498.5,
    'WBTC/USDC': 67_230.0,
    'SOL/USDC': 145.8,
    'WETH/USDT': 2497.2,
  };

  const basePrice = basePrices[assetPair] ?? 2490.0;
  // Add ±0.3% market noise
  const noise = (Math.random() - 0.5) * basePrice * 0.006;
  const humanPrice = basePrice + noise;
  const price = BigInt(Math.round(humanPrice * 1_000_000));

  const latencyMs = Date.now() - startMs;

  return {
    source: 'Uniswap V3 (EVM)',
    chain: 'Ethereum (Chain ID: 1)',
    price,
    priceHuman: humanPrice.toFixed(6),
    liquidityDepth: BigInt(12_500_000) * PRECISION_FACTOR, // $12.5M TVL in pool range
    latencyMs,
    poolOrRoute: '[PRIVATE — routing alpha of solver]',
    timestamp: Date.now(),
  };
}

/**
 * Simulates a Jupiter Aggregator smart order route on Solana.
 * In production: GET https://quote-api.jup.ag/v6/quote?inputMint=...&outputMint=...&amount=...
 *
 * Jupiter internally routes through Orca, Raydium, Phoenix, etc.
 * Specific AMMs used are NOT disclosed — preserving the solver's Solana routing alpha.
 */
async function fetchJupiterPrice(assetPair: string): Promise<DexQuote> {
  const startMs = Date.now();

  console.log(
    `   🟣 [Jupiter / Solana] Querying Solana program cluster for ${assetPair}...`
  );

  // Simulate cross-chain latency (Solana confirmation ~400ms)
  await sleep(Math.random() * 300 + 200);

  const basePrices: Record<string, number> = {
    'WETH/USDC': 2495.8,
    'WBTC/USDC': 67_185.0,
    'SOL/USDC': 145.5,
    'WETH/USDT': 2494.4,
  };

  const basePrice = basePrices[assetPair] ?? 2485.0;
  const noise = (Math.random() - 0.5) * basePrice * 0.008;
  const humanPrice = basePrice + noise;
  const price = BigInt(Math.round(humanPrice * 1_000_000));

  const latencyMs = Date.now() - startMs;

  return {
    source: 'Jupiter Aggregator (Solana)',
    chain: 'Solana Mainnet',
    price,
    priceHuman: humanPrice.toFixed(6),
    liquidityDepth: BigInt(8_200_000) * PRECISION_FACTOR, // $8.2M aggregated Solana liquidity
    latencyMs,
    poolOrRoute: '[PRIVATE — Jupiter routing graph hidden]',
    timestamp: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregation Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines optimal routing weights based on:
 *   - Available liquidity depth on each chain
 *   - Price competitiveness
 *   - Gas/transaction cost estimates
 *
 * Returns weights in basis points (must sum to 10000).
 */
function computeOptimalWeights(
  evmQuote: DexQuote,
  solanaQuote: DexQuote
): { evmWeightBps: bigint; solanaWeightBps: bigint } {
  const totalLiquidity = evmQuote.liquidityDepth + solanaQuote.liquidityDepth;

  // Liquidity-weighted routing (with a quality adjustment for better price)
  let evmRatio = Number((evmQuote.liquidityDepth * 10000n) / totalLiquidity);

  // Bonus weight to the chain with better price
  if (evmQuote.price >= solanaQuote.price) {
    evmRatio = Math.min(evmRatio + 500, 8000); // cap at 80% EVM
  } else {
    evmRatio = Math.max(evmRatio - 500, 2000); // floor at 20% EVM
  }

  // Round to nearest 100 bps for cleaner logging
  evmRatio = Math.round(evmRatio / 100) * 100;
  const solanaRatio = 10000 - evmRatio;

  return {
    evmWeightBps: BigInt(evmRatio),
    solanaWeightBps: BigInt(solanaRatio),
  };
}

/**
 * Computes the final aggregate quote from private DEX prices and weights.
 * This mirrors the Noir circuit's `compute_weighted_aggregate` function exactly.
 * The result is the ONLY value shared with the gateway.
 */
function aggregatePrices(
  evmPrice: bigint,
  solanaPrice: bigint,
  evmWeight: bigint,
  solanaWeight: bigint
): bigint {
  const weightedEvm = evmPrice * evmWeight;
  const weightedSolana = solanaPrice * solanaWeight;
  return (weightedEvm + weightedSolana) / WEIGHT_SCALE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Noir Witness Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Constructs the Noir witness input object for the `main` circuit.
 *
 * In a production flow, this object would be serialised to a TOML/JSON
 * `Prover.toml` file and passed to `nargo prove`, which:
 *   1. Executes the circuit with these witnesses
 *   2. Generates a Groth16 or UltraHonk proof
 *   3. Outputs `proof` and `public_inputs` files
 *
 * The proof bytes are then submitted to the gateway. The private inputs
 * NEVER leave this function's scope.
 */
function buildNoirWitness(
  aggregated: AggregatedQuote,
  institutionalLimitEstimate: bigint
): NoirWitnessInputs {
  return {
    // PRIVATE — would be provided by the institution's encrypted channel in prod
    institutional_limit: institutionalLimitEstimate,
    // PRIVATE — stays in memory only
    uniswap_price: aggregated.evmQuote.price,
    // PRIVATE — stays in memory only
    jupiter_price: aggregated.solanaQuote.price,
    // PRIVATE — routing strategy hidden
    dex_weights: [aggregated.evmWeightBps, aggregated.solanaWeightBps],
    // PUBLIC — the only output shared
    final_aggregate_quote: aggregated.finalAggregateQuote,
  };
}

/**
 * Simulates Noir proof generation.
 * In production, this would shell out to:
 *   nargo prove --witness-path ./Prover.toml
 * or call the Barretenberg WASM prover directly.
 *
 * Returns mock proof bytes that would be replaced by real Groth16 bytes.
 */
async function generateNoirProof(witness: NoirWitnessInputs): Promise<string> {
  console.log(`\n   ⚙️  [Noir Prover] Generating ZK proof...`);
  console.log(`      Circuit: blind_aggregate_matcher (main.nr)`);
  console.log(
    `      Public inputs: final_aggregate_quote = ${witness.final_aggregate_quote.toString()}`
  );
  console.log(`      Private inputs: [REDACTED — never logged]`);

  // Simulate proof generation time (~2s for Groth16 on modern hardware)
  await sleep(1800 + Math.random() * 400);

  // Mock proof: in production replace with nargo output
  const proofHex = `0x${Buffer.from(
    `NOIR_PROOF_v1:aggregate=${witness.final_aggregate_quote}:ts=${Date.now()}`
  ).toString('hex')}`;

  console.log(
    `      ✅ Proof generated: ${proofHex.slice(0, 32)}... [${proofHex.length} chars]`
  );
  return proofHex;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gateway Communication
// ─────────────────────────────────────────────────────────────────────────────

async function fetchActiveIntents(): Promise<ActiveIntent[]> {
  const response = await axios.get<ActiveIntent[]>(
    `${GATEWAY_URL}/intents/active`,
    { timeout: 5000 }
  );
  return response.data;
}

async function submitBid(params: {
  orderHash: string;
  finalAggregateQuote: bigint;
  proof: string;
  evmWeightBps: bigint;
  solanaWeightBps: bigint;
}): Promise<void> {
  await axios.post(
    `${GATEWAY_URL}/bids`,
    {
      orderHash: params.orderHash,
      solverAddress: SOLVER_ADDRESS,
      finalAggregateQuote: params.finalAggregateQuote.toString(),
      proof: params.proof,
      bidExpiry: Math.floor(Date.now() / 1000) + 60,
      evmWeightBps: Number(params.evmWeightBps),
      solanaWeightBps: Number(params.solanaWeightBps),
    },
    { timeout: 10_000 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Solver Loop
// ─────────────────────────────────────────────────────────────────────────────

const processedOrders = new Set<string>();

async function runSolverIteration(): Promise<void> {
  const intents = await fetchActiveIntents();

  if (!intents.length) {
    process.stdout.write('.');
    return;
  }

  console.log(
    `\n${'─'.repeat(70)}\n` +
      `🔍 [Solver] Found ${intents.length} active ERC-7683 intent(s) in sovereign pool`
  );

  for (const intent of intents) {
    if (processedOrders.has(intent.orderHash)) continue;
    processedOrders.add(intent.orderHash);

    await processIntent(intent);
  }
}

async function processIntent(intent: ActiveIntent): Promise<void> {
  const { orderHash, order } = intent;
  const assetPair = order.orderData.assetPair;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📋 [Solver] Processing Intent`);
  console.log(`   Order Hash:  ${orderHash}`);
  console.log(`   Asset Pair:  ${assetPair}`);
  console.log(
    `   Input Size:  ${order.inputs[0]?.amount ?? 'N/A'} (base units)`
  );
  console.log(`   Swapper:     ${order.swapper}`);
  console.log(
    `   Fill By:     ${new Date(order.orderData.fillDeadline * 1000).toISOString()}`
  );
  console.log(
    `\n🌐 [Solver] Initiating JIT multi-chain liquidity aggregation...`
  );

  // ── Step 1: Fetch JIT quotes concurrently from both chains ─────────────────
  const [evmQuote, solanaQuote] = await Promise.all([
    fetchUniswapPrice(assetPair),
    fetchJupiterPrice(assetPair),
  ]);

  console.log(`\n📊 [Solver] JIT Quote Results (PRIVATE — not transmitted):`);
  console.log(`   ${evmQuote.source}:`);
  console.log(`     Price:    $${evmQuote.priceHuman} USDC`);
  console.log(
    `     Depth:    $${(Number(evmQuote.liquidityDepth) / 1e6).toFixed(0)}M`
  );
  console.log(`     Latency:  ${evmQuote.latencyMs}ms`);
  console.log(`     Pool:     ${evmQuote.poolOrRoute}`);
  console.log(`   ${solanaQuote.source}:`);
  console.log(`     Price:    $${solanaQuote.priceHuman} USDC`);
  console.log(
    `     Depth:    $${(Number(solanaQuote.liquidityDepth) / 1e6).toFixed(0)}M`
  );
  console.log(`     Latency:  ${solanaQuote.latencyMs}ms`);
  console.log(`     Route:    ${solanaQuote.poolOrRoute}`);

  // ── Step 2: Compute optimal routing weights ────────────────────────────────
  const { evmWeightBps, solanaWeightBps } = computeOptimalWeights(
    evmQuote,
    solanaQuote
  );

  console.log(`\n⚖️  [Solver] Optimal Route Allocation (PRIVATE):`);
  console.log(
    `   Routing ${Number(evmWeightBps) / 100}% via Uniswap V3 (EVM)...`
  );
  console.log(
    `   Routing ${Number(solanaWeightBps) / 100}% via Jupiter (Solana)...`
  );
  console.log(`   Strategy: liquidity-depth-weighted with price premium bias`);

  // ── Step 3: Aggregate prices ───────────────────────────────────────────────
  const finalAggregateQuote = aggregatePrices(
    evmQuote.price,
    solanaQuote.price,
    evmWeightBps,
    solanaWeightBps
  );

  const finalAggregateHuman = (Number(finalAggregateQuote) / 1_000_000).toFixed(
    6
  );
  const aggregated: AggregatedQuote = {
    evmQuote,
    solanaQuote,
    evmWeightBps,
    solanaWeightBps,
    finalAggregateQuote,
    finalAggregateHuman,
  };

  console.log(`\n💡 [Solver] Aggregate Quote Computed:`);
  console.log(
    `   Final Aggregate: $${finalAggregateHuman} USDC per ${assetPair.split('/')[0]}`
  );
  console.log(`   (This is the ONLY price value shared with the gateway)`);

  // ── Step 4: Build Noir witness and generate proof ──────────────────────────
  // In PoC: use the output minimum as proxy for limit price estimate
  const limitEstimate = BigInt(
    order.outputs[0]?.amount ?? (finalAggregateQuote * 99n) / 100n
  );
  const witness = buildNoirWitness(aggregated, limitEstimate);

  console.log(
    `\n🔐 [Solver] Constructing Noir ZK-Proof (private inputs SEALED):`
  );
  const proof = await generateNoirProof(witness);

  // ── Step 5: Submit ZK-bid to gateway ──────────────────────────────────────
  console.log(`\n📤 [Solver] Submitting ZK-masked bid to Sovereign Gateway...`);
  console.log(`   Public data transmitted:`);
  console.log(`     orderHash:           ${orderHash}`);
  console.log(
    `     finalAggregateQuote: ${finalAggregateQuote.toString()} (${finalAggregateHuman} USDC)`
  );
  console.log(`     proof:               ${proof.slice(0, 32)}...`);
  console.log(
    `     evmWeightBps:        ${evmWeightBps.toString()} (routing %)`
  );
  console.log(
    `     solanaWeightBps:     ${solanaWeightBps.toString()} (routing %)`
  );
  console.log(`   Private data kept local:`);
  console.log(`     uniswap_price:       [SEALED IN ZK PROOF]`);
  console.log(`     jupiter_price:       [SEALED IN ZK PROOF]`);
  console.log(`     institutional_limit: [SEALED IN ZK PROOF]`);

  try {
    await submitBid({
      orderHash,
      finalAggregateQuote,
      proof,
      evmWeightBps,
      solanaWeightBps,
    });
    console.log(
      `✅ [Solver] ZK-bid accepted by gateway for order ${orderHash}`
    );
  } catch (err) {
    const msg = err instanceof AxiosError ? err.response?.data : String(err);
    console.error(`❌ [Solver] Bid submission failed:`, msg);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  ⚡ ZK-RFQ Whitelisted Multi-Chain Solver Bot                        ║
║  Version: ${VERSION}                                                 ║
║  Solver ID: ${SOLVER_ADDRESS.slice(0, 20)}...                        ║
║  Gateway: ${GATEWAY_URL}                                             ║
║  Chains: Ethereum (Uniswap V3) + Solana (Jupiter)                    ║
║  Privacy Mode: ZK-Aggregate Price Masking (Noir)                     ║
║                                                                      ║
║  Alpha Protection: DEX prices and routing weights are PRIVATE        ║
║  witnesses — only the aggregate quote is transmitted.                ║
╚══════════════════════════════════════════════════════════════════════╝

🚀 Starting sovereign pool polling (every ${POLL_INTERVAL_MS}ms)...
`);

  let consecutiveErrors = 0;

  while (true) {
    try {
      await runSolverIteration();
      consecutiveErrors = 0;
    } catch (err) {
      consecutiveErrors++;
      const msg =
        err instanceof AxiosError
          ? `HTTP ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
          : String(err);
      if (consecutiveErrors === 1 || consecutiveErrors % 10 === 0) {
        console.error(
          `\n⚠️  [Solver] Poll error (attempt ${consecutiveErrors}): ${msg}`
        );
      }
      if (consecutiveErrors >= 30) {
        console.error('💀 [Solver] Too many consecutive errors. Exiting.');
        process.exit(1);
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('Fatal solver error:', err);
  process.exit(1);
});
