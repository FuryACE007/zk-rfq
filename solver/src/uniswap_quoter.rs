//! Real Uniswap V3 QuoterV2 price fetcher on Sepolia.
//!
//! Calls `quoteExactInputSingle` as a static call to get the amount of USDC
//! received for 1 WETH, then converts to 1e6 fixed-point price.

use alloy::primitives::{Address, Uint, U256};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::sol;
use std::time::Instant;
use tracing::{info, warn};

use crate::JitQuote;

// QuoterV2 ABI (only the function we need)
sol! {
    #[sol(rpc)]
    interface IQuoterV2 {
        struct QuoteExactInputSingleParams {
            address tokenIn;
            address tokenOut;
            uint256 amountIn;
            uint24 fee;
            uint160 sqrtPriceLimitX96;
        }

        function quoteExactInputSingle(QuoteExactInputSingleParams memory params)
            external
            returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate);
    }
}

/// Fetch a real price quote from Uniswap V3 on Sepolia.
///
/// Calls QuoterV2.quoteExactInputSingle(WETH → USDC, 1 WETH, fee=3000).
/// Returns the price in 1e6 fixed-point (USDC per ETH).
pub async fn fetch_price(
    rpc_url: &str,
    quoter_address: &str,
    weth_address: &str,
    usdc_address: &str,
) -> anyhow::Result<JitQuote> {
    let start = Instant::now();

    let provider = ProviderBuilder::new().connect_http(rpc_url.parse()?);

    let quoter_addr: Address = quoter_address.parse()?;
    let weth_addr: Address = weth_address.parse()?;
    let usdc_addr: Address = usdc_address.parse()?;

    let quoter = IQuoterV2::new(quoter_addr, &provider);

    // Quote 1 WETH (1e18) → USDC
    let one_weth = U256::from(10u64).pow(U256::from(18u64));

    let params = IQuoterV2::QuoteExactInputSingleParams {
        tokenIn: weth_addr,
        tokenOut: usdc_addr,
        amountIn: one_weth,
        fee: Uint::from(3000u32), // 0.3% fee tier
        sqrtPriceLimitX96: Uint::ZERO,
    };

    let result = quoter.quoteExactInputSingle(params).call().await?;
    let amount_out: U256 = result.amountOut;

    // amountOut is in USDC (6 decimals). Convert to 1e6 fixed-point.
    // E.g., 2492_000000 USDC raw = $2,492.00 = 2_492_000_000 in our micro format
    // But our internal format uses price_micro where 2_492_000_000 = $2,492.00
    // amountOut for 1 WETH is already in 6 decimals, so it IS the price in micro
    // e.g., amountOut = 2492_000000 means $2,492.00 per ETH
    let price_micro: u64 = amount_out.try_into().unwrap_or(0);

    let latency_ms = start.elapsed().as_millis() as u64;

    // Estimate liquidity depth from the pool (simplified: use a fixed reasonable value)
    // In production, you'd query the pool's liquidity at the current tick
    let depth_usd = 10_000_000u64; // $10M estimated depth

    info!(
        "Uniswap V3 Sepolia quote: {} USDC for 1 WETH ({}ms)",
        price_micro as f64 / 1e6,
        latency_ms
    );

    Ok(JitQuote {
        source: "Uniswap V3".into(),
        chain: "Sepolia".into(),
        price_micro,
        depth_usd,
        latency_ms,
    })
}

/// Fallback: simulated Uniswap price when Sepolia RPC is not configured.
pub async fn fetch_price_mock() -> anyhow::Result<JitQuote> {
    use std::time::Duration;

    let latency = 120 + (rand::random::<u64>() % 80);
    tokio::time::sleep(Duration::from_millis(latency)).await;

    let base_price = 2_495_000_000u64;
    let jitter = (rand::random::<u64>() % 8_000_000) as i64 - 4_000_000;
    let price = (base_price as i64 + jitter) as u64;

    warn!("Using MOCK Uniswap price (no SEPOLIA_RPC_URL configured)");

    Ok(JitQuote {
        source: "Uniswap V3 (mock)".into(),
        chain: "EVM".into(),
        price_micro: price,
        depth_usd: 12_500_000 + (rand::random::<u64>() % 5_000_000),
        latency_ms: latency,
    })
}
