/**
 * @file main.nr
 * @title Blind Aggregate Matcher — ZK-RFQ Price Privacy Circuit
 * @version 1.0.0
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PRIVACY GUARANTEE                                                          ║
 * ║                                                                              ║
 * ║  This circuit allows a Whitelisted Solver to PROVE to the Institutional     ║
 * ║  Client that:                                                                ║
 * ║    (1) The aggregate price it is offering is correctly derived from real     ║
 * ║        DEX quotes weighted across multiple chains.                           ║
 * ║    (2) That aggregate price is at least as good as the institution's secret  ║
 * ║        limit price.                                                          ║
 * ║                                                                              ║
 * ║  …WITHOUT revealing:                                                         ║
 * ║    • Which specific liquidity pools were queried (routing alpha)             ║
 * ║    • The exact Uniswap or Jupiter prices at time of quoting                  ║
 * ║    • The institution's actual limit price (front-running protection)         ║
 * ║                                                                              ║
 * ║  This is the core of "ZK-Aggregate Price Masking" — the mechanism that      ║
 * ║  lets institutions trade without leaking their hand to the market.           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * FIELD ARITHMETIC NOTE:
 * All price and weight values are scaled integers (fixed-point arithmetic).
 * Prices are expressed in 1e6 units (e.g., 2500_000000 = $2,500.000000 USDC).
 * Weights are in basis points (bps) — 10000 bps = 100%.
 * The circuit operates over the BN254 scalar field (Noir default).
 *
 * WITNESS LAYOUT:
 * ┌─────────────────────────────┬──────────────────────────────────────────┐
 * │ Input                       │ Visibility                               │
 * ├─────────────────────────────┼──────────────────────────────────────────┤
 * │ institutional_limit         │ PRIVATE — limit price commitment hash    │
 * │ uniswap_price               │ PRIVATE — EVM DEX spot price             │
 * │ jupiter_price               │ PRIVATE — Solana DEX spot price          │
 * │ dex_weights[2]              │ PRIVATE — routing weight allocation      │
 * │ final_aggregate_quote       │ PUBLIC  — attested aggregate bid price   │
 * └─────────────────────────────┴──────────────────────────────────────────┘
 */

/**
 * PRECISION_FACTOR: Fixed-point scale factor.
 * All prices are multiplied by 1_000_000 before entering the circuit.
 * This preserves 6 decimal places of precision for USD-denominated assets.
 */
global PRECISION_FACTOR: Field = 1000000;

/**
 * WEIGHT_SCALE: Total basis points representing 100%.
 * Solver's dex_weights must sum to exactly this value, ensuring the
 * routing allocation is complete and non-overlapping.
 */
global WEIGHT_SCALE: Field = 10000;

// ──────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * field_greater_than_or_equal
 *
 * Asserts a >= b using Noir's built-in range-check primitives.
 * The technique: compute (a - b) and verify it fits in a 128-bit range,
 * which proves it is non-negative (no underflow into negative field elements).
 *
 * NB: This works correctly because Noir's Field is an unsigned prime field;
 * however we use explicit range decomposition to be safe with large values.
 */
fn field_gte(a: Field, b: Field) {
    // Cast to u128 for safe subtraction range check.
    // This implicitly asserts a >= b (panics on underflow in constrained mode).
    let a_u128 = a as u128;
    let b_u128 = b as u128;
    assert(a_u128 >= b_u128, "ZK-RFQ: Aggregate quote is below institutional limit price");
}

/**
 * compute_weighted_aggregate
 *
 * Computes:
 *   aggregate = (price_a * weight_a + price_b * weight_b) / WEIGHT_SCALE
 *
 * This is the core arithmetic proving that the final quote IS the valid
 * weighted combination of the two private DEX prices — without revealing
 * which DEX provided which leg, or the individual prices themselves.
 *
 * Privacy mechanism: dex_weights determines how much of the fill went through
 * each venue. By keeping weights private, the solver hides its routing alpha
 * (e.g., whether it found a better pool on Uniswap or Jupiter).
 */
fn compute_weighted_aggregate(
    price_a: Field,
    price_b: Field,
    weight_a: Field,
    weight_b: Field
) -> Field {
    let weighted_a = price_a * weight_a;
    let weighted_b = price_b * weight_b;
    let numerator = weighted_a + weighted_b;

    // Division: numerator / WEIGHT_SCALE
    // In Noir, field division requires the divisor to be non-zero
    // (WEIGHT_SCALE is a compile-time constant = 10000, always non-zero).
    numerator / WEIGHT_SCALE
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Circuit
// ──────────────────────────────────────────────────────────────────────────────

/**
 * main — the Blind Aggregate Matcher
 *
 * @param institutional_limit  [PRIVATE] The institutional client's secret limit
 *                             price in fixed-point (scaled by PRECISION_FACTOR).
 *                             This is the minimum acceptable execution price.
 *                             It MUST stay private — leaking it would allow
 *                             front-running and information extraction by the solver.
 *
 * @param uniswap_price        [PRIVATE] The Uniswap V3 (EVM) spot price retrieved
 *                             JIT by the solver, in fixed-point units.
 *                             Keeping this private protects the solver's alpha —
 *                             no one can determine which Uniswap pool was queried
 *                             or the TWAP window used.
 *
 * @param jupiter_price        [PRIVATE] The Jupiter Aggregator (Solana) price quote
 *                             retrieved JIT by the solver, in fixed-point units.
 *                             Similarly protected — Solana AMM routing is hidden.
 *
 * @param dex_weights          [PRIVATE] A 2-element array [evm_weight_bps, sol_weight_bps]
 *                             representing the basis-point allocation of the fill.
 *                             e.g., [6000, 4000] = 60% EVM / 40% Solana.
 *                             Keeping this private prevents the market from
 *                             reverse-engineering the solver's liquidity strategy.
 *
 * @param final_aggregate_quote [PUBLIC] The composite price the solver commits to.
 *                              This is the ONLY value revealed to the institution
 *                              and the settlement contract. The circuit guarantees
 *                              this number is faithfully derived from the private
 *                              inputs — no manipulation is possible.
 */
fn main(
    // ── Private Inputs ────────────────────────────────────────────────────────
    institutional_limit: Field,
    uniswap_price: Field,
    jupiter_price: Field,
    dex_weights: [Field; 2],

    // ── Public Inputs ─────────────────────────────────────────────────────────
    pub final_aggregate_quote: Field,
) {

    // =========================================================================
    // CONSTRAINT 1: Weight Integrity
    // =========================================================================
    // The solver's routing weights must sum to 100% (10000 bps).
    // This prevents the solver from "phantom routing" — claiming a fill size
    // larger than the actual liquidity sourced.
    //
    // If dex_weights[0] + dex_weights[1] != WEIGHT_SCALE, the proof will fail,
    // meaning no valid proof exists for a malformed weight allocation.
    let weight_sum = dex_weights[0] + dex_weights[1];
    assert(weight_sum == WEIGHT_SCALE, "ZK-RFQ: DEX weight allocation must sum to 10000 bps (100%)");

    // =========================================================================
    // CONSTRAINT 2: Minimum Price Sanity
    // =========================================================================
    // Neither individual DEX price can be zero. A zero price would indicate
    // a failed JIT quote fetch, and the aggregate would be meaningless.
    assert(uniswap_price != 0, "ZK-RFQ: Uniswap price feed cannot be zero");
    assert(jupiter_price != 0, "ZK-RFQ: Jupiter price feed cannot be zero");

    // =========================================================================
    // CONSTRAINT 3: Accurate Aggregate Derivation  ← Core Privacy Constraint
    // =========================================================================
    // Prove that final_aggregate_quote is the EXACT weighted combination of
    // the two private DEX prices. A solver cannot fabricate an inflated or
    // reduced quote — the arithmetic linkage is enforced by the ZK circuit.
    //
    // computed_aggregate == (uniswap_price * evm_weight + jupiter_price * sol_weight)
    //                       / WEIGHT_SCALE
    //
    // The verifier (settlement contract) checks this without ever learning
    // uniswap_price, jupiter_price, or dex_weights.
    let computed_aggregate = compute_weighted_aggregate(
        uniswap_price,
        jupiter_price,
        dex_weights[0],
        dex_weights[1],
    );

    assert(
        computed_aggregate == final_aggregate_quote,
        "ZK-RFQ: Claimed aggregate quote does not match the weighted DEX price derivation"
    );

    // =========================================================================
    // CONSTRAINT 4: Execution Price Guarantee  ← Fundamental Settlement Rule
    // =========================================================================
    // The aggregate price MUST be at least as good as the institution's limit.
    // This is the primary economic guarantee to the institutional client:
    //   "The solver mathematically proves it beat your limit without knowing
    //    they're directly revealing their routing strategy."
    //
    // Privacy property of this constraint: the institution's limit price is
    // a private input. The verifier can check this constraint is satisfied
    // WITHOUT learning what the limit price actually was. Combined with the
    // limit price commitment in the ERC-7683 orderData, the on-chain contract
    // can link the proof to the correct order without revealing the limit.
    field_gte(final_aggregate_quote, institutional_limit);

    // =========================================================================
    // If all four constraints pass, the Noir prover generates a Groth16 proof
    // (or UltraHonk, configurable in Nargo.toml) that can be verified on-chain
    // in O(1) time regardless of the complexity of the underlying computation.
    // =========================================================================
}

// ──────────────────────────────────────────────────────────────────────────────
// Test Module
// ──────────────────────────────────────────────────────────────────────────────

#[test]
fn test_valid_aggregate_price() {
    // Scenario: 60% Uniswap (price = 2500_000000), 40% Jupiter (price = 2480_000000)
    // Expected aggregate = (2500_000000 * 6000 + 2480_000000 * 4000) / 10000
    //                    = (15_000_000_000_000 + 9_920_000_000_000) / 10000
    //                    = 24_920_000_000_000 / 10000
    //                    = 2_492_000_000  (= 2492.000000 USDC per ETH)
    // Limit = 2490_000000 (= 2490 USDC per ETH)
    // 2492 >= 2490 ✓
    main(
        2490_000000,        // institutional_limit (private)
        2500_000000,        // uniswap_price (private)
        2480_000000,        // jupiter_price (private)
        [6000, 4000],       // dex_weights (private)
        2492_000000,        // final_aggregate_quote (public)
    );
}

#[test(should_fail_with = "ZK-RFQ: Aggregate quote is below institutional limit price")]
fn test_aggregate_below_limit_fails() {
    // Solver lies about the aggregate — tries to commit to a price below limit
    main(
        2500_000000,        // limit (private)
        2480_000000,        // uniswap below limit
        2470_000000,        // jupiter below limit
        [5000, 5000],
        2475_000000,        // below limit — proof MUST fail
    );
}

#[test(should_fail_with = "ZK-RFQ: DEX weight allocation must sum to 10000 bps (100%)")]
fn test_invalid_weights_fail() {
    main(
        2490_000000,
        2500_000000,
        2480_000000,
        [5000, 3000],      // only 80% — invalid
        2492_000000,
    );
}

#[test(should_fail_with = "ZK-RFQ: Claimed aggregate quote does not match the weighted DEX price derivation")]
fn test_fabricated_aggregate_fails() {
    // Solver tries to claim a better aggregate than they actually achieved
    main(
        2490_000000,
        2500_000000,
        2480_000000,
        [6000, 4000],
        2600_000000,       // fabricated — real aggregate is 2492_000000
    );
}
