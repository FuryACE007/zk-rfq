# ZK-RFQ Sovereign Gateway

> A self-hosted, zero-knowledge Request-for-Quote system for institutional block trading — resolving alpha leakage without sacrificing liquidity access or compliance.

---

## How It Works

An institution submits a private trade intent. Whitelisted solvers fetch a real Uniswap V3 quote on Sepolia, generate a Noir ZK proof that their aggregate price is honestly derived (without revealing which pools or prices they used), and submit a blinded bid. The institution approves — proving their limit was met — and the gateway calls `ZkRfqSettlement.settleOrder()` on Sepolia. No party ever sees the other's private value.

**Three properties in one system:**

| Property | Mechanism |
|---|---|
| Deep liquidity | ERC-7683 open intent standard |
| Alpha protection | Noir UltraHonk ZK proofs — routing stays private |
| Compliance / sovereignty | Essential declarative protocol — self-hosted settlement |

---

## Quick Start (Testnet Demo)

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| Rust | ≥ 1.75 | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Foundry | latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| Docker | any | [docker.com](https://docker.com) |
| Nargo + bb | 0.32.0 / 0.55.0 | `noirup -v 0.32.0` then `bbup -v 0.55.0` |

> Nargo and bb are only required for real on-chain settlement proofs. You can run the full UI flow and see solver bids without them — settlement will fail at the proof step until they're installed.

---

### 1. Clone and install

```bash
git clone <repo-url>
cd zk-rfq

# Install all packages
(cd gateway && npm install)
(cd frontend && npm install)
(cd solver && cargo build --release)
(cd contracts && forge install)
```

### 2. Deploy contracts to Sepolia

```bash
export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
export DEPLOYER_PRIVATE_KEY=0x...

cd contracts
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY --broadcast
```

Copy the five addresses printed at the end into `gateway/.env`:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
GATEWAY_PRIVATE_KEY=0x...your_deployer_key...

SETTLEMENT_CONTRACT=0x...
MOCK_WETH_ADDRESS=0x...
MOCK_USDC_ADDRESS=0x...
AGGREGATE_VERIFIER_ADDRESS=0x...
LIMIT_VERIFIER_ADDRESS=0x...

QUOTER_V2_ADDRESS=0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3
ESSENTIAL_URL=http://localhost:3553
CIRCUITS_PATH=../../circuits
```

> The deploy script mints 100 MockWETH to your wallet and 1,000,000 MockUSDC to the solver. No real money required.

### 3. Start Essential (private intent pool)

```bash
# From repo root
docker compose up -d
```

Wait for `zk-rfq-essential-server` to show healthy (`docker compose ps`).

### 4. Deploy Pint contract to Essential

```bash
cd predicates && pint build
cd ../solver && cargo run -- --deploy
```

### 5. Run the gateway

```bash
cd gateway
cp .env.example .env   # then fill in values from step 2
npm run start:dev
# Running on http://localhost:4000
```

### 6. Run the solver

```bash
cd solver
cargo run --release -- \
  --sepolia-rpc-url $SEPOLIA_RPC_URL \
  --mock-weth-address 0x... \
  --mock-usdc-address 0x... \
  --solver-address $YOUR_SOLVER_ADDRESS
# Polling gateway every 5s
```

### 7. Run the frontend

```bash
cd frontend
npm run dev
# http://localhost:3000
```

---

## Demo Walkthrough

### Step 1 — Connect wallet

Open `http://localhost:3000`. Click **Open Terminal**. Connect MetaMask on **Ethereum Sepolia**.

### Step 2 — Submit a trade intent

At `/terminal`:
- Token pair is WETH/USDC (only pair available on testnet)
- Enter **amount** (e.g. `1`) and a **limit price** (e.g. `2400`)
- Click **Submit Intent**

A success toast will show the `orderHash`. The intent is stored privately on Essential.

### Step 3 — Watch the solver respond

In the solver terminal you'll see within ~5 seconds:

```
Fetching Uniswap V3 (Sepolia) JIT quote…
[Uniswap V3] quote: $2493.27 USDC — depth: $1M — latency: 143ms
Aggregate quote: $2493.2700 [Uniswap V3 only · 100% EVM]
Building Noir witness (aggregate_derivation)…
  PUBLIC:  final_aggregate_quote = 2493270000
  PRIVATE: uniswap_price, dex_weights → SEALED
Generating Noir ZK-proof…
REAL UltraHonk proof generated (2048 bytes)
Bid accepted, awaiting Essential block inclusion
```

### Step 4 — Approve and settle

At `/mempool`:
1. Find your intent — the solver bid shows `Uniswap V3 · Sepolia` and the masked aggregate price
2. In the **Approve & Settle** panel, enter your limit price (must be ≤ aggregate)
3. Click **Approve & Settle**

The gateway:
- Generates a `limit_check` Noir proof server-side (your limit stays private)
- Calls `ZkRfqSettlement.settleOrder()` on Sepolia with both proofs
- Both proofs verified on-chain by `AggregateDerivationVerifier` and `LimitCheckVerifier`

### Step 5 — Verify settlement

At `/settlement?orderHash=0x...` you'll see real Essential block ticks and — once the tx lands — a Sepolia tx hash with an Etherscan link.

Or via CLI:

```bash
cast call $SETTLEMENT_CONTRACT \
  "isSettled(bytes32)(bool)" $ORDER_HASH \
  --rpc-url $SEPOLIA_RPC_URL
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 INSTITUTION BROWSER                  │
│  /terminal (submit) → /mempool (approve) → /settlement│
└──────────────────────┬──────────────────────────────┘
                       │ REST
┌──────────────────────▼──────────────────────────────┐
│                   NESTJS GATEWAY                     │
│  IntentsService  │  BidsService  │  SettlementService│
│  NoirProverService (limit_check proof, server-side)  │
└───┬──────────────────────────────────────────────────┘
    │                                  │ REST
    │  ┌───────────────────┐   ┌───────▼──────────────┐
    │  │   RUST SOLVER     │   │  ESSENTIAL SERVER    │
    │  │ Uniswap V3 Sepolia│   │  (private intent pool│
    │  │ Noir bb prover    │   │   Pint predicates)   │
    │  └───────────────────┘   └──────────────────────┘
    │
┌───▼─────────────────────────────────────────────────┐
│                 ETHEREUM SEPOLIA                      │
│  ZkRfqSettlement.sol (ERC-7683)                      │
│  AggregateDerivationVerifier + LimitCheckVerifier    │
│  MockWETH + MockUSDC (test tokens, free faucet)      │
└─────────────────────────────────────────────────────┘
```

---

## ZK Circuits (`circuits/`)

### `aggregate_derivation` — run by the solver
Proves the final aggregate quote was honestly derived from real DEX prices without revealing which pools or prices were used.

- Public inputs: `final_aggregate_quote`
- Private inputs: `uniswap_price`, `dex_weights`

### `limit_check` — run by the gateway (on behalf of institution)
Proves the institution's limit price was met: `aggregate >= limit`.

- Public inputs: `final_aggregate_quote`
- Private inputs: `institutional_limit`

---

## Project Structure

```
zk-rfq/
├── circuits/
│   ├── aggregate_derivation/   # Solver ZK circuit (Noir)
│   └── limit_check/            # Institution limit proof (Noir)
├── contracts/
│   ├── src/
│   │   ├── ZkRfqSettlement.sol          # ERC-7683 settlement
│   │   ├── AggregateDerivationVerifier.sol
│   │   ├── LimitCheckVerifier.sol
│   │   ├── MockWETH.sol                 # Test token (free faucet)
│   │   └── MockUSDC.sol                 # Test token (free faucet)
│   └── script/Deploy.s.sol
├── gateway/                    # NestJS REST API
│   └── src/
│       ├── intents/            # POST /intents, GET /intents/active
│       ├── bids/               # POST /bids
│       ├── settlement/         # POST /settlement/prove-and-settle
│       └── evm/                # Sepolia wallet + contract calls
├── solver/                     # Rust solver daemon
│   └── src/
│       ├── main.rs             # Polling loop
│       ├── uniswap_quoter.rs   # QuoterV2 on Sepolia
│       ├── noir_prover.rs      # bb prove (aggregate_derivation)
│       └── config.rs
├── frontend/                   # Next.js 14
│   └── pages/
│       ├── index.tsx           # Connect wallet → Open Terminal
│       ├── terminal.tsx        # Submit trade intent
│       ├── mempool.tsx         # Review bids + approve
│       └── settlement.tsx      # Real-time settlement monitor
└── predicates/                 # Pint contract (Essential)
```

---

## Gateway API

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/intents` | `{ assetPair, amount, limitPrice, swapperAddress, ttlSeconds }` | Submit trade intent |
| `GET` | `/intents/active` | — | Active intents (solver polling) |
| `POST` | `/bids` | `{ orderHash, solverAddress, finalAggregateQuote, proof, bidExpiry }` | Solver submits ZK bid |
| `GET` | `/bids/:orderHash` | — | Get bids for an intent |
| `POST` | `/settlement/prove-and-settle` | `{ orderHash, institutionLimit }` | Institution approves; gateway proves + settles |
| `GET` | `/settlement/:orderHash` | — | Poll settlement status |
| `GET` | `/balances/:address` | — | MockWETH/MockUSDC balances on Sepolia |
| `GET` | `/health` | — | Gateway + Essential connectivity check |

---

## Known Limitations

| Limitation | Status |
|---|---|
| Single token pair (WETH/USDC) | Intentional for testnet demo — add pairs by expanding token config |
| Single solver | Whitelist multiple `SOLVER_ADDRESS` values to support competing bids |
| Server-side limit_check proof | In production this moves to browser WASM so the limit never leaves the institution |
| No order cancellation | Intents expire via `ttlSeconds`; explicit cancel endpoint not yet added |
| No EIP-712 signed intents | Intents not wallet-signed yet — add `eth_signTypedData` for production |
