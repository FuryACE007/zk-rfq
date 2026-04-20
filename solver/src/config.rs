use clap::Parser;
use std::path::PathBuf;

#[derive(Parser, Debug, Clone)]
#[command(name = "zk-rfq-solver", about = "Multi-chain JIT liquidity solver")]
pub struct Args {
    /// Essential REST API URL
    #[arg(long, default_value = "http://localhost:3553")]
    pub essential_url: String,

    /// NestJS Gateway URL (for intent queries in dev mode)
    #[arg(long, default_value = "http://localhost:4000")]
    pub gateway_url: String,

    /// Solver's pseudonymous address (b256 hex)
    #[arg(long, default_value = "0x00000000000000000000000000000000000000000000000000000000deadbeef")]
    pub solver_address: String,

    /// Polling interval in milliseconds
    #[arg(long, default_value = "2000")]
    pub poll_interval_ms: u64,

    /// Deploy the Pint contract instead of solving
    #[arg(long)]
    pub deploy: bool,

    /// Path to the Pint build output directory (used with --deploy)
    #[arg(long, default_value = "predicates/out")]
    pub contract_path: PathBuf,

    /// Sepolia RPC URL for Uniswap V3 price quotes
    #[arg(long, env = "SEPOLIA_RPC_URL", default_value = "")]
    pub sepolia_rpc_url: String,

    /// MockWETH contract address on Sepolia
    #[arg(long, env = "MOCK_WETH_ADDRESS", default_value = "")]
    pub mock_weth_address: String,

    /// MockUSDC contract address on Sepolia
    #[arg(long, env = "MOCK_USDC_ADDRESS", default_value = "")]
    pub mock_usdc_address: String,

    /// Uniswap V3 QuoterV2 address on Sepolia
    #[arg(long, env = "QUOTER_V2_ADDRESS", default_value = "0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3")]
    pub quoter_v2_address: String,

    /// Path to compiled Noir circuit artifacts directory
    #[arg(long, default_value = "../circuits")]
    pub circuits_path: PathBuf,
}
