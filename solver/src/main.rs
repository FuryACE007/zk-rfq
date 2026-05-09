//! ZK-RFQ Solver Bot (Rust) — Sepolia / Uniswap V3
//!
//! Polls the gateway for active ERC-7683 intents, fetches a real Uniswap V3
//! Sepolia quote, generates a real Noir ZK proof (aggregate_derivation), and
//! submits a bid to the gateway. The Noir witness shape preserves the
//! `[uniswap_price, jupiter_price, dex_weights[2]]` layout of the circuit; we
//! pin `jupiter_price = 0` and `dex_weights = [10000, 0]` so the aggregate
//! collapses to 100% Uniswap. When we re-introduce a second source we just
//! swap the shim values without recompiling the circuit.

mod config;
mod noir_prover;
mod uniswap_quoter;

use clap::Parser;
use config::Args;
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tracing::{debug, error, info, warn};

// -- Types --

#[derive(Debug, Clone)]
pub struct JitQuote {
    pub source: String,
    pub chain: String,
    pub price_micro: u64,
    pub depth_usd: u64,
    pub latency_ms: u64,
}

#[derive(Debug, Clone)]
struct AggregateResult {
    final_quote_micro: u64,
    uniswap_price: u64,
}

#[derive(Debug, Clone, Serialize)]
struct NoirWitness {
    uniswap_price: u64,
    jupiter_price: u64,
    dex_weights: [u64; 2],
    final_aggregate_quote: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct EssentialSolution {
    data: Vec<SolutionData>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SolutionData {
    predicate_to_solve: PredicateAddress,
    decision_variables: Vec<Vec<u8>>,
    state_mutations: Vec<StateMutation>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PredicateAddress {
    contract: Vec<u8>,
    predicate: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
struct StateMutation {
    key: Vec<u8>,
    value: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CompiledContract {
    predicates: Vec<PredicateEntry>,
    salt: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PredicateEntry {
    name: String,
    bytecode: Vec<u8>,
}

#[derive(Debug, Deserialize)]
struct DeployResponse {
    address: Option<Vec<u8>>,
}

#[derive(Debug, Deserialize)]
struct GatewayIntent {
    #[serde(rename = "orderHash")]
    order_hash: String,
    #[serde(rename = "erc7683Order")]
    erc7683_order: Option<serde_json::Value>,
}

// -- Main --

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let args = Args::parse();
    let client = reqwest::Client::new();

    println!();
    println!("======================================================================");
    println!("  ZK-RFQ Solver Bot (Rust) — Sepolia / Uniswap V3");
    println!("======================================================================");
    println!();

    info!("Essential API:  {}", args.essential_url);
    info!("Gateway API:    {}", args.gateway_url);
    info!(
        "Solver Address: {}...{}",
        &args.solver_address[..10],
        &args.solver_address[args.solver_address.len() - 6..]
    );

    let has_noir_toolchain = noir_prover::check_toolchain();
    if has_noir_toolchain {
        info!("Real proof generation ENABLED (nargo + bb detected)");
    } else {
        warn!("Real proof generation DISABLED — using mock proofs");
    }

    let has_sepolia = !args.sepolia_rpc_url.is_empty()
        && !args.mock_weth_address.is_empty()
        && !args.mock_usdc_address.is_empty();
    if has_sepolia {
        info!("Sepolia Uniswap V3 quotes ENABLED");
    } else {
        warn!("Sepolia RPC not configured — using mock Uniswap prices");
    }

    println!();

    match client
        .get(format!("{}/health", args.essential_url))
        .send()
        .await
    {
        Ok(_) => info!("Essential server connected"),
        Err(e) => warn!(
            "Essential server not reachable: {}. Run: docker compose up -d",
            e
        ),
    }

    if args.deploy {
        return deploy_contract(&client, &args).await;
    }

    info!(
        "Starting sovereign pool polling (every {}ms)…",
        args.poll_interval_ms
    );
    println!();

    let poll_interval = Duration::from_millis(args.poll_interval_ms);

    loop {
        match poll_and_solve(&client, &args, has_noir_toolchain, has_sepolia).await {
            Ok(0) => debug!("No active intents."),
            Ok(n) => info!("Processed {} intent(s) this cycle", n),
            Err(e) => warn!("Polling error: {}", e),
        }
        tokio::time::sleep(poll_interval).await;
    }
}

// -- Contract Deployment --

async fn deploy_contract(client: &reqwest::Client, args: &Args) -> anyhow::Result<()> {
    info!("Deploying Pint contract to Essential server...");

    let contract_file = args
        .contract_path
        .join("zk_rfq_settlement")
        .join("zk_rfq_settlement.json");

    info!("Reading compiled contract from: {}", contract_file.display());

    let contract_json = match std::fs::read_to_string(&contract_file) {
        Ok(json) => json,
        Err(e) => {
            error!("Failed to read compiled contract: {}", e);
            error!("   Ensure you have run: cd predicates && pint build");
            return Err(anyhow::anyhow!("Contract file not found: {}", e));
        }
    };

    let contract: CompiledContract = serde_json::from_str(&contract_json)?;

    info!(
        "   Found {} predicate(s): {}",
        contract.predicates.len(),
        contract
            .predicates
            .iter()
            .map(|p| p.name.as_str())
            .collect::<Vec<_>>()
            .join(", ")
    );

    let deploy_url = format!("{}/deploy-contract", args.essential_url);
    let resp = client.post(&deploy_url).json(&contract).send().await?;

    if resp.status().is_success() {
        let body: serde_json::Value = resp.json().await?;
        info!("Contract deployed successfully!");
        info!("   Content address: {}", serde_json::to_string_pretty(&body)?);
        if let Some(addr) = body.as_array() {
            let hex_addr: String = addr
                .iter()
                .filter_map(|v| v.as_u64())
                .map(|b| format!("{:02x}", b))
                .collect();
            if !hex_addr.is_empty() {
                info!("   Hex address: 0x{}", hex_addr);
            }
        }
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        error!("Deploy failed: HTTP {} -- {}", status, body);
        return Err(anyhow::anyhow!("Deploy failed: HTTP {}", status));
    }

    Ok(())
}

// -- Core Solving Logic --

async fn poll_and_solve(
    client: &reqwest::Client,
    args: &Args,
    has_noir: bool,
    has_sepolia: bool,
) -> anyhow::Result<usize> {
    info!("Polling gateway for active ERC-7683 intents…");

    let intents_url = format!("{}/intents/active", args.gateway_url);
    let resp = client.get(&intents_url).send().await;

    let intents: Vec<GatewayIntent> = match resp {
        Ok(r) if r.status().is_success() => r.json().await.unwrap_or_default(),
        _ => {
            debug!("Gateway not reachable or no intents");
            return Ok(0);
        }
    };

    if intents.is_empty() {
        return Ok(0);
    }

    info!("Found {} active intent(s)", intents.len());

    for intent in &intents {
        solve_intent(client, args, intent, has_noir, has_sepolia).await?;
    }

    Ok(intents.len())
}

async fn solve_intent(
    client: &reqwest::Client,
    args: &Args,
    intent: &GatewayIntent,
    has_noir: bool,
    has_sepolia: bool,
) -> anyhow::Result<()> {
    let hash_short = &intent.order_hash[..16];

    info!("--- Solving intent: {}… ---", hash_short);
    println!();

    info!("Fetching Uniswap V3 (Sepolia) JIT quote…");

    let uni = if has_sepolia {
        uniswap_quoter::fetch_price(
            &args.sepolia_rpc_url,
            &args.quoter_v2_address,
            &args.mock_weth_address,
            &args.mock_usdc_address,
        )
        .await?
    } else {
        uniswap_quoter::fetch_price_mock().await?
    };

    info!(
        "[{}] quote: ${:.2} USDC — depth: ${:.0}M — latency: {}ms",
        uni.source,
        uni.price_micro as f64 / 1e6,
        uni.depth_usd as f64 / 1e6,
        uni.latency_ms,
    );

    let aggregate = AggregateResult {
        final_quote_micro: uni.price_micro,
        uniswap_price: uni.price_micro,
    };

    info!(
        "Aggregate quote: ${:.4} [Uniswap V3 only · 100% EVM]",
        aggregate.final_quote_micro as f64 / 1e6,
    );

    // Noir witness shape preserved from the existing aggregate_derivation
    // circuit: jupiter_price=0, dex_weights=[10000, 0] collapses the
    // weighted aggregate to 100% Uniswap without recompiling the circuit.
    let witness = NoirWitness {
        uniswap_price: aggregate.uniswap_price,
        jupiter_price: 0,
        dex_weights: [10_000, 0],
        final_aggregate_quote: aggregate.final_quote_micro,
    };

    info!("Building Noir witness (aggregate_derivation)…");
    info!(
        "   PUBLIC:  final_aggregate_quote = {}",
        witness.final_aggregate_quote
    );
    info!("   PRIVATE: uniswap_price, dex_weights → SEALED");

    info!("Generating Noir ZK-proof…");
    let bb_witness = noir_prover::AggregateWitness {
        uniswap_price: witness.uniswap_price,
        jupiter_price: witness.jupiter_price,
        dex_weights: witness.dex_weights,
        final_aggregate_quote: witness.final_aggregate_quote,
    };
    let proof_bytes = if has_noir {
        match noir_prover::generate_proof(&args.circuits_path, &bb_witness) {
            Ok(proof) => {
                info!("REAL UltraHonk proof generated ({} bytes)", proof.len());
                proof
            }
            Err(e) => {
                warn!("Real proof generation failed: {}. Falling back to mock.", e);
                noir_prover::generate_proof_mock(&bb_witness)
            }
        }
    } else {
        noir_prover::generate_proof_mock(&bb_witness)
    };

    info!("Proof generated ({} bytes)", proof_bytes.len());

    info!("Submitting ZK-masked bid to gateway…");

    let bid_body = serde_json::json!({
        "orderHash": intent.order_hash,
        "solverAddress": args.solver_address,
        "finalAggregateQuote": aggregate.final_quote_micro.to_string(),
        "proof": hex::encode(&proof_bytes),
        "bidExpiry": current_timestamp() + 120,
    });

    let bid_url = format!("{}/bids", args.gateway_url);
    match client.post(&bid_url).json(&bid_body).send().await {
        Ok(resp) if resp.status().is_success() => {
            let result: serde_json::Value = resp.json().await?;
            if result["settled"].as_bool().unwrap_or(false) {
                info!(
                    "SETTLEMENT COMPLETE! Order {} settled at ${:.4}",
                    hash_short,
                    aggregate.final_quote_micro as f64 / 1e6,
                );
                info!("   Solver proof verified (aggregate_derivation)");
                info!("   Awaiting institution limit_check proof for on-chain settlement");
            } else {
                info!("Bid accepted, awaiting Essential block inclusion");
            }
        }
        Ok(resp) => {
            warn!("Bid rejected: HTTP {}", resp.status());
        }
        Err(e) => {
            warn!("Gateway unreachable: {}", e);
        }
    }

    println!();
    Ok(())
}

// -- Utilities --

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}
