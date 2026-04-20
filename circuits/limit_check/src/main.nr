// Limit Check Circuit -- Institution Proves (Client-Side)
//
// PURPOSE: Proves that a solver's aggregate quote meets the institution's
// secret limit price WITHOUT revealing the limit to anyone -- not the solver,
// not the settlement contract, not anyone on the public chain.
//
// This proof is generated CLIENT-SIDE in the institution's browser using
// @noir-lang/noir_js WASM + Barretenberg backend. The private limit price
// never leaves the browser's memory.
//
// PRIVACY PROPERTIES:
//   - institutional_limit is a private witness (never on-chain)
//   - final_aggregate_quote is the public input (shared with aggregate_derivation)
//   - The on-chain LimitCheckVerifier confirms limit <= aggregate without
//     learning what the limit is
//   - Combined with the keccak256(limit || salt) commitment stored on Essential,
//     this creates a complete privacy guarantee for institutional intent
//
// ON-CHAIN VERIFICATION:
// LimitCheckVerifier on Sepolia verifies this proof alongside
// AggregateDerivationVerifier. Both share the same public input
// (final_aggregate_quote), binding them cryptographically to the same price.
//
// FIELD ARITHMETIC:
// Prices: 1e6 fixed-point (2500_000000 = $2,500.000000 USDC)

fn main(
    // Private input -- institution's secret, stays in browser memory
    institutional_limit: Field,
    // Public input -- solver's committed aggregate (same as aggregate_derivation output)
    final_aggregate_quote: pub Field,
) {
    // Execution price guarantee
    // aggregate >= institution's secret limit
    // If the solver's quote is below the limit, proof generation fails in the
    // browser and the institution simply rejects the bid.
    let agg = final_aggregate_quote as u64;
    let lim = institutional_limit as u64;
    assert(agg >= lim, "Aggregate quote is below institutional limit price");
}

// -- Tests --

#[test]
fn test_quote_above_limit() {
    // Aggregate $2,492 >= Limit $2,490 -- OK
    main(2490_000000, 2492_000000);
}

#[test]
fn test_quote_exactly_at_limit() {
    // Aggregate $2,490 >= Limit $2,490 -- OK (equal is acceptable)
    main(2490_000000, 2490_000000);
}

#[test]
fn test_quote_well_above_limit() {
    // Aggregate $3,000 >= Limit $2,490 -- OK
    main(2490_000000, 3000_000000);
}

#[test(should_fail_with = "Aggregate quote is below institutional limit price")]
fn test_quote_below_limit_fails() {
    // Aggregate $2,475 < Limit $2,500 -- FAIL
    main(2500_000000, 2475_000000);
}

#[test(should_fail_with = "Aggregate quote is below institutional limit price")]
fn test_quote_slightly_below_limit_fails() {
    // Aggregate $2,489.999999 < Limit $2,490.000000 -- FAIL (off by 1 micro)
    main(2490_000000, 2489_999999);
}
