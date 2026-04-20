//! Real Jupiter V6 API price fetcher (Solana mainnet, read-only).
//!
//! Fetches a swap quote from Jupiter's public API to get the SOL/USDC price,
//! then derives the ETH/USDC price using the SOL/ETH ratio.
//!
//! This is read-only price discovery — no Solana transactions are executed.

use serde::Deserialize;
use std::time::Instant;
use tracing::{info, warn};

use crate::JitQuote;

// SOL mint on Solana mainnet
const SOL_MINT: &str = "So11111111111111111111111111111111111111112";
// USDC mint on Solana mainnet
const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JupiterQuoteResponse {
    out_amount: String,
    #[serde(default)]
    price_impact_pct: Option<String>,
}

/// Fetch a real price quote from Jupiter V6 API.
///
/// Quotes 1 SOL → USDC on Solana mainnet, then scales to ETH/USDC
/// using a known SOL/ETH ratio (for cross-chain price discovery).
pub async fn fetch_price(client: &reqwest::Client) -> anyhow::Result<JitQuote> {
    let start = Instant::now();

    // Quote 1 SOL (1e9 lamports) → USDC
    let one_sol_lamports = 1_000_000_000u64;

    let url = format!(
        "https://api.jup.ag/quote?inputMint={}&outputMint={}&amount={}&slippageBps=50",
        SOL_MINT, USDC_MINT, one_sol_lamports
    );

    let resp = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await?;

    if !resp.status().is_success() {
        anyhow::bail!("Jupiter API returned HTTP {}", resp.status());
    }

    let quote: JupiterQuoteResponse = resp.json().await?;
    let sol_usdc_raw: u64 = quote.out_amount.parse()?;

    // sol_usdc_raw is in USDC (6 decimals) for 1 SOL
    // e.g., 145_000000 = $145.00 per SOL
    let sol_price_usdc = sol_usdc_raw as f64 / 1e6;

    // Convert SOL/USDC → ETH/USDC using a reference ratio
    // SOL/ETH ratio is approximately SOL_price / ETH_price
    // For demo: we use this as a cross-chain price signal
    // ETH/USDC ~= SOL/USDC * (ETH/SOL ratio)
    // Typical: ETH ~= 17x SOL price
    let eth_sol_ratio = 17.2; // Approximate ETH/SOL ratio
    let eth_price_usdc = sol_price_usdc * eth_sol_ratio;

    // Convert to 1e6 fixed-point (our internal micro format)
    let price_micro = (eth_price_usdc * 1e6) as u64;

    let latency_ms = start.elapsed().as_millis() as u64;

    info!(
        "Jupiter V6 quote: SOL=${:.2}, derived ETH=${:.2} ({}ms)",
        sol_price_usdc, eth_price_usdc, latency_ms
    );

    Ok(JitQuote {
        source: "Jupiter V6".into(),
        chain: "Solana".into(),
        price_micro,
        depth_usd: 8_000_000, // Estimated Jupiter liquidity depth
        latency_ms,
    })
}

/// Fallback: simulated Jupiter price when API is unreachable.
pub async fn fetch_price_mock() -> anyhow::Result<JitQuote> {
    use std::time::Duration;

    let latency = 200 + (rand::random::<u64>() % 150);
    tokio::time::sleep(Duration::from_millis(latency)).await;

    let base_price = 2_493_000_000u64;
    let jitter = (rand::random::<u64>() % 8_000_000) as i64 - 4_000_000;
    let price = (base_price as i64 + jitter) as u64;

    warn!("Using MOCK Jupiter price (API unreachable)");

    Ok(JitQuote {
        source: "Jupiter V6 (mock)".into(),
        chain: "Solana".into(),
        price_micro: price,
        depth_usd: 8_200_000 + (rand::random::<u64>() % 3_000_000),
        latency_ms: latency,
    })
}
