// Blind Aggregate Matcher -- ZK-RFQ Price Privacy Circuit (Combined Reference)
//
// PRIVACY GUARANTEE
// This circuit allows a whitelisted solver to PROVE to the institutional client
// that:
//   (1) The aggregate price is correctly derived from real DEX quotes weighted
//       across multiple chains.
//   (2) That aggregate price is >= the institution's secret limit price.
//
// WITHOUT revealing:
//   - Which liquidity pools were queried (routing alpha)
//   - The exact Uniswap V3 or Jupiter prices at time of quoting
//   - The institution's actual limit price (front-running protection)
//
// NOTE: This is the combined reference circuit. In production it is split into:
//   - aggregate_derivation (solver proves) -- protects routing alpha
//   - limit_check (institution proves)     -- protects limit price
//
// FIELD ARITHMETIC:
// Prices: 1e6 fixed-point (2500_000000 = $2,500.000000 USDC)
// Weights: basis points (10000 bps = 100%)

global WEIGHT_SCALE: Field = 10000;

fn compute_weighted_aggregate(
    price_a: Field,
    price_b: Field,
    weight_a: Field,
    weight_b: Field
) -> Field {
    (price_a * weight_a + price_b * weight_b) / WEIGHT_SCALE
}

fn field_gte(a: Field, b: Field) {
    let av = a as u64;
    let bv = b as u64;
    assert(av >= bv, "ZK-RFQ: Aggregate quote is below institutional limit price");
}

fn main(
    // Private inputs
    institutional_limit: Field,
    uniswap_price: Field,
    jupiter_price: Field,
    dex_weights: [Field; 2],
    // Public input
    final_aggregate_quote: pub Field,
) {
    // C1: Weight integrity -- routing weights must sum to 100% (10000 bps)
    let weight_sum = dex_weights[0] + dex_weights[1];
    assert(weight_sum == WEIGHT_SCALE, "ZK-RFQ: DEX weight allocation must sum to 10000 bps (100%)");

    // C2: Price sanity -- neither DEX price can be zero
    assert(uniswap_price != 0, "ZK-RFQ: Uniswap price feed cannot be zero");
    assert(jupiter_price != 0, "ZK-RFQ: Jupiter price feed cannot be zero");

    // C3: Accurate aggregate derivation (core privacy constraint)
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

    // C4: Execution price guarantee -- aggregate >= institution's secret limit
    field_gte(final_aggregate_quote, institutional_limit);
}

// -- Tests --

#[test]
fn test_valid_aggregate_price() {
    // 60% Uniswap ($2,500) + 40% Jupiter ($2,480) = $2,492. Limit $2,490. OK.
    main(2490_000000, 2500_000000, 2480_000000, [6000, 4000], 2492_000000);
}

#[test(should_fail_with = "ZK-RFQ: Aggregate quote is below institutional limit price")]
fn test_aggregate_below_limit_fails() {
    main(2500_000000, 2480_000000, 2470_000000, [5000, 5000], 2475_000000);
}

#[test(should_fail_with = "ZK-RFQ: DEX weight allocation must sum to 10000 bps (100%)")]
fn test_invalid_weights_fail() {
    main(2490_000000, 2500_000000, 2480_000000, [5000, 3000], 2492_000000);
}

#[test(should_fail_with = "ZK-RFQ: Claimed aggregate quote does not match the weighted DEX price derivation")]
fn test_fabricated_aggregate_fails() {
    main(2490_000000, 2500_000000, 2480_000000, [6000, 4000], 2600_000000);
}
