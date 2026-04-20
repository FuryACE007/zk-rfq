// Aggregate Derivation Circuit -- Solver Proves
//
// PURPOSE: Proves that final_aggregate_quote is the correct weighted average
// of private multi-chain DEX prices without revealing:
//   - Individual Uniswap V3 or Jupiter price quotes
//   - The routing weight allocation between EVM and Solana
//   - Which liquidity pools were queried (solver's routing alpha)
//
// The solver generates this proof server-side via Barretenberg Rust FFI.
// The proof is verified on-chain by AggregateDerivationVerifier on Sepolia
// as part of ZkRfqSettlement.settleOrder().
//
// PUBLIC OUTPUT: final_aggregate_quote (only value revealed on-chain)
//
// FIELD ARITHMETIC:
// Prices: 1e6 fixed-point (2500_000000 = $2,500.000000 USDC)
// Weights: basis points (10000 bps = 100%)

global WEIGHT_SCALE: Field = 10000;

fn main(
    // Private inputs -- solver's proprietary data, never revealed
    uniswap_price: Field,
    jupiter_price: Field,
    dex_weights: [Field; 2],
    // Public input -- the only value visible on-chain
    final_aggregate_quote: pub Field,
) {
    // C1: Weight integrity
    // Routing weights must sum to 100% (10000 bps).
    // Prevents phantom routing where solver claims more fill than sourced.
    let weight_sum = dex_weights[0] + dex_weights[1];
    assert(weight_sum == WEIGHT_SCALE, "DEX weight allocation must sum to 10000 bps");

    // C2: Price sanity
    // Neither DEX price can be zero (indicates failed JIT fetch).
    assert(uniswap_price != 0, "Uniswap price feed cannot be zero");
    assert(jupiter_price != 0, "Jupiter price feed cannot be zero");

    // C3: Accurate aggregate derivation (core privacy constraint)
    // Proves: final_aggregate_quote == (uni * w_evm + jup * w_sol) / 10000
    // On-chain verifier confirms this without learning any private input.
    let computed_aggregate = (uniswap_price * dex_weights[0] + jupiter_price * dex_weights[1]) / WEIGHT_SCALE;
    assert(
        computed_aggregate == final_aggregate_quote,
        "Aggregate quote does not match weighted DEX price derivation"
    );
}

// -- Tests --

#[test]
fn test_valid_60_40_split() {
    // 60% Uniswap ($2,500) + 40% Jupiter ($2,480) = $2,492
    main(2500_000000, 2480_000000, [6000, 4000], 2492_000000);
}

#[test]
fn test_valid_50_50_split() {
    // 50/50: ($2,500 + $2,480) / 2 = $2,490
    main(2500_000000, 2480_000000, [5000, 5000], 2490_000000);
}

#[test]
fn test_valid_100_evm_single_source() {
    // 100% EVM, 0% Solana
    main(2500_000000, 2480_000000, [10000, 0], 2500_000000);
}

#[test(should_fail_with = "DEX weight allocation must sum to 10000 bps")]
fn test_invalid_weights_fail() {
    main(2500_000000, 2480_000000, [5000, 3000], 2492_000000);
}

#[test(should_fail_with = "Uniswap price feed cannot be zero")]
fn test_zero_uniswap_price_fails() {
    main(0, 2480_000000, [6000, 4000], 992_000000);
}

#[test(should_fail_with = "Aggregate quote does not match weighted DEX price derivation")]
fn test_fabricated_aggregate_fails() {
    // Solver claims $2,600 when real aggregate is $2,492
    main(2500_000000, 2480_000000, [6000, 4000], 2600_000000);
}
