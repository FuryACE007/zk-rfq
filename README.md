# ZK-RFQ Sovereign Gateway

> A self-hosted, zero-knowledge Request-for-Quote system for institutional block trading — resolving alpha leakage without sacrificing liquidity access or compliance.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [How It Works](#how-it-works)
3. [Architecture](#architecture)
4. [ZK Circuits](#zk-circuits)
5. [Project Structure](#project-structure)
6. [The Full Trade Flow](#the-full-trade-flow)
7. [Prerequisites](#prerequisites)
8. [Setup](#setup)
9. [Step-by-Step Demo](#step-by-step-demo)
10. [Gateway API Reference](#gateway-api-reference)
11. [Deployment Modes](#deployment-modes)
12. [Known Limitations](#known-limitations)

---

## The Problem

When an institution wants to execute a $50M token swap on-chain, they face an irresolvable trilemma:

```
                    LIQUIDITY
                   (deep pools)
                      /\
                     /  \
                    /    \
         ALPHA PROTECTION  ←→  COMPLIANCE
         (no front-running)    (audit trail)
```

**Pick two. Not three.**

- Broadcast intent to market makers → alpha leakage, front-running
- Hide intent entirely → no liquidity, poor execution price
- Use a centralised dark pool → compliance risk, counterparty trust

**This project resolves all three simultaneously:**

| Property | Mechanism |
|---|---|
| Deep liquidity | ERC-7683 open intent standard — any solver can respond |
| Alpha protection | Noir ZK proofs — aggregate price attested without revealing routes or limit |
| Compliance / sovereignty | Essential declarative protocol — 100% self-hosted settlement, no public chain dependency |

---

## How It Works

The system has four moving parts:

1. **Institution** submits a private trade intent (token pair, size) via browser
2. **Solvers** (whitelisted, automated) query Uniswap V3 + Jupiter, aggregate the best fill price, and generate a ZK proof that their aggregate is valid — without revealing which DEXes they used or at what prices
3. **Institution** reviews the masked aggregate price, enters their limit, and approves — generating a second ZK proof that their limit was met
4. **Gateway** submits both proofs to the on-chain verifier and settles via ERC-7683 CrossChainOrder on Sepolia (or Essential sovereign chain in production)

The result: market makers see only a blinded intent. The institution sees only a blinded aggregate. Settlement is verified entirely by ZK proofs — no trusted third party.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INSTITUTION BROWSER                       │
│  Terminal (submit intent) ←→ Mempool (approve & settle)     │
└────────────────────┬────────────────────────────────────────┘
                     │ REST
┌────────────────────▼────────────────────────────────────────┐
│                    NESTJS GATEWAY                            │
│  IntentsService  │  BidsService  │  SettlementService       │
│  NoirProverService (server-side limit_check proof)          │
└──────┬──────────────┬───────────────────────────────────────┘
       │              │ REST
       │   ┌──────────▼──────────┐   ┌────────────────────────┐
       │   │   RUST SOLVER       │   │  ESSENTIAL PROTOCOL    │
       │   │  Uniswap V3 quotes  │   │  (sovereign intent     │
       │   │  Jupiter V6 quotes  │   │   pool — private)      │
       │   │  Noir bb prover     │   └────────────────────────┘
       │   │  (aggregate_deriv.) │
       │   └─────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│                    SEPOLIA TESTNET                           │
│  ERC-7683 CrossChainOrder settlement                        │
│  UltraHonkVerifier (or MockVerifier for demo)               │
│  ERC-20 test tokens                                         │
└─────────────────────────────────────────────────────────────┘
```

**Two-layer design:**
- **Essential** (private): intent pool lives here. Solvers read intents, submit bids. No public chain exposure.
- **Sepolia** (public testnet / production chain): final settlement only. ZK proofs verified on-chain. Tokens transferred.

---

## ZK Circuits

Two Noir circuits (`circuits/`):

### `aggregate_derivation`
Run by the **solver**. Proves:
- The aggregate fill price was honestly derived from real DEX quotes
- No individual route or pool address is revealed
- Output: `aggregateQuote` (public), individual routes (private)

### `limit_check`
Run by the **gateway** (server-side, on behalf of institution). Proves:
- The institution's limit price was met: `aggregateQuote >= institutionLimit`
- Neither the limit nor individual routes are revealed
- Output: `aggregateQuote` (public), `institutionLimit` (private)

### `blind_aggregate_matcher`
Combines both: blind-matches solver aggregate against institution limit without either party learning the other's value.

---

## Project Structure

```
zk-rfq/
├── circuits/
│   ├── aggregate_derivation/     # Solver ZK circuit (Noir)
│   ├── blind_aggregate_matcher/  # Combined matching circuit
│   ├── limit_check/              # Institution limit check circuit
│   └── Nargo.toml
│
├── contracts/
│   ├── src/
│   │   ├── ZkRfqSettlement.sol   # ERC-7683 settlement + proof verification
│   │   ├── MockVerifier.sol      # Always-true verifier for demo mode
│   │   └── interfaces/
│   ├── script/
│   │   └── Deploy.s.sol          # runDemo() + runProduction() deploy scripts
│   └── foundry.toml
│
├── gateway/                      # NestJS REST API
│   ├── src/
│   │   ├── intents/              # POST /intents, GET /intents/active
│   │   ├── bids/                 # POST /bids, GET /bids/:intentId
│   │   ├── evm/                  # ethers.js v6, wallet management
│   │   ├── settlement/
│   │   │   ├── settlement.service.ts       # Core settlement logic
│   │   │   ├── settlement.controller.ts    # REST endpoints
│   │   │   ├── noir-prover.service.ts      # Server-side Noir proof gen
│   │   │   └── settlement.module.ts
│   │   └── app.module.ts
│   └── .env.example
│
├── solver/                       # Rust solver daemon
│   ├── src/
│   │   ├── main.rs               # Intent polling loop
│   │   ├── uniswap_quoter.rs     # Uniswap V3 QuoterV2
│   │   ├── jupiter_quoter.rs     # Jupiter V6 API
│   │   ├── noir_prover.rs        # bb prove (aggregate_derivation)
│   │   └── config.rs
│   └── Cargo.toml
│
└── frontend/                     # Next.js 14
    ├── pages/
    │   ├── _app.tsx              # Wagmi + RainbowKit providers (SSR-safe)
    │   ├── terminal.tsx          # Submit trade intent
    │   └── mempool.tsx           # View bids, approve & settle
    ├── lib/
    │   ├── wagmi.ts              # Wagmi config (Sepolia)
    │   ├── Providers.tsx         # WagmiProvider + RainbowKitProvider
    │   └── async-storage-mock.js # MetaMask SDK browser compat shim
    └── next.config.js
```

---

## The Full Trade Flow

```
Step 1 — SUBMIT INTENT
  Institution connects wallet (MetaMask/RainbowKit)
  Fills in: token pair, size, direction
  POST /intents  →  Gateway stores intent on Essential (private)
  Intent gets an orderHash (ERC-7683 CrossChainOrder ID)

Step 2 — SOLVER QUOTES
  Rust solver polls GET /intents/active  (every 5s)
  For each new intent:
    → Uniswap V3 QuoterV2.quoteExactInput()  (EVM)
    → Jupiter V6 /quote  (Solana)
    → Aggregate best fill price
    → Run `bb prove` on aggregate_derivation circuit
    → POST /bids  { intentId, aggregateQuote, proof, publicInputs }

Step 3 — INSTITUTION APPROVES
  Institution opens /mempool
  Sees live bids with masked aggregate prices
  Enters limit price (private — never sent in plaintext)
  Clicks "Approve & Settle"

Step 4 — SERVER GENERATES LIMIT_CHECK PROOF
  POST /settlement/prove-and-settle  { orderHash, institutionLimit }
  Gateway runs NoirProverService:
    → Validates aggregateQuote >= institutionLimit
    → Writes Prover.toml  (limit + aggregate as private inputs)
    → nargo execute --package limit_check
    → bb prove  →  proof hex
    → (Fallback: SHA-256 mock if nargo/bb not installed)

Step 5 — ON-CHAIN SETTLEMENT
  Gateway calls ZkRfqSettlement.settle()  on Sepolia:
    → Verifies solver's aggregate_derivation proof
    → Verifies institution's limit_check proof
    → Emits OrderSettled event
    → Transfers tokens via ERC-7683 fill
  Frontend polls GET /settlement/:orderHash
  Shows "Settled on Sepolia ✓" + Etherscan link
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18 | Frontend + Gateway |
| npm | ≥ 9 | Package management |
| Rust | ≥ 1.75 | Solver |
| Foundry (`forge`, `cast`) | latest | Contract deployment |
| Nargo | 0.32.0 | Compile Noir circuits |
| Barretenberg (`bb`) | 0.55.0 | Generate/verify ZK proofs |
| Docker | any | Essential Protocol node (optional) |
| Essential CLI (`essential-rest-client`) | latest | Interact with Essential |

For demo mode (no ZK proofs): only Node.js, npm, Rust, and Foundry are required.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/zk-rfq
cd zk-rfq
```

### 2. Deploy contracts (Sepolia)

```bash
cd contracts
forge install

# Demo mode (MockVerifier — no real ZK proofs needed)
forge script script/Deploy.s.sol:Deploy --sig "runDemo()" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast

# Production mode (real UltraHonkVerifier)
forge script script/Deploy.s.sol:Deploy --sig "run()" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

Note the deployed `ZK_RFQ_SETTLEMENT_ADDRESS` from the output.

### 3. Configure gateway

```bash
cd gateway
cp .env.example .env
```

Edit `.env`:

```env
# Sepolia
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
GATEWAY_PRIVATE_KEY=0x...          # Deployer/settler wallet
ZK_RFQ_SETTLEMENT_ADDRESS=0x...    # From step 2

# Essential (private intent pool)
ESSENTIAL_NODE_URL=http://localhost:3553

# ZK circuits
CIRCUITS_PATH=../../circuits        # Path to Nargo workspace
DEMO_MODE=true                      # Skip real proof gen
```

### 4. Configure frontend

```bash
cd frontend
cp .env.example .env.local          # or set env vars directly
```

```env
NEXT_PUBLIC_GATEWAY_URL=http://localhost:4000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id   # optional, demo works without
```

### 5. Install dependencies

```bash
# Gateway
cd gateway && npm install

# Frontend
cd frontend && npm install

# Solver
cd solver && cargo build --release
```

---

## Step-by-Step Demo

> This demo uses `DEMO_MODE=true` (mock ZK proofs) and `MockVerifier` contracts. No Nargo/bb installation needed.

### Start services

**Terminal 1 — Gateway:**
```bash
cd gateway
npm run start:dev
# Running on http://localhost:4000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Running on http://localhost:3000
```

**Terminal 3 — Solver:**
```bash
cd solver
cargo run --release
# Polling gateway every 5s for new intents
```

### Submit a trade intent

1. Open `http://localhost:3000/terminal`
2. Click **Connect Wallet** (top-right) → connect MetaMask on Sepolia
3. Fill in the intent form:
   - From token: `USDC`
   - To token: `ETH`
   - Amount: `50000` (= $50k)
4. Click **Submit Intent**
5. You'll see a success toast with the `orderHash`

### Watch the solver respond

Watch Terminal 3 — within 5 seconds you should see:
```
[solver] New intent: 0xabc...
[solver] Uniswap quote: 0.000312 ETH/USDC
[solver] Jupiter quote: 0.000311 ETH/USDC
[solver] Aggregate: 0.000312
[solver] Proof: 0x1234... (mock)
[solver] Bid submitted
```

### Approve and settle

1. Open `http://localhost:3000/mempool`
2. Find your intent — you'll see the solver's aggregate price
3. In the **Institution Approval** panel:
   - Enter your limit price (e.g., `0.00030` — must be ≤ aggregate for approval)
   - Click **Approve & Settle**
4. The gateway will:
   - Generate limit_check proof (mock in demo mode)
   - Call `ZkRfqSettlement.settle()` on Sepolia
5. After ~15 seconds, the status banner changes to **"Settled on Sepolia ✓"**
6. Click the Etherscan link to verify the on-chain transaction

### Verify on-chain

```bash
cast logs --rpc-url $SEPOLIA_RPC_URL \
  --address $ZK_RFQ_SETTLEMENT_ADDRESS \
  "OrderSettled(bytes32,address,uint256)"
```

---

## Gateway API Reference

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/intents` | `{ swapper, inputToken, outputToken, inputAmount, direction }` | Submit trade intent |
| `GET` | `/intents/active` | — | List pending intents (for solvers) |
| `POST` | `/bids` | `{ intentId, aggregateQuote, proof, publicInputs }` | Solver submits bid |
| `GET` | `/bids/:intentId` | — | Get bids for intent |
| `GET` | `/settlement/:orderHash` | — | Poll settlement status |
| `POST` | `/settlement/prove-and-settle` | `{ orderHash, institutionLimit }` | Institution approves; generates proof + settles |

---

## Deployment Modes

### Demo Mode (`DEMO_MODE=true` + `MockVerifier`)

- ZK proofs are SHA-256 hashes — no Nargo/bb needed
- `MockVerifier.verify()` always returns `true`
- Safe for testing the full UX flow without ZK toolchain
- **NOT production safe — proofs are not zero-knowledge**

### Production Mode

- Requires Nargo 0.32.0 + Barretenberg 0.55.0
- Real UltraHonkVerifier deployed on-chain
- `NoirProverService` runs `nargo execute` + `bb prove` server-side
- Solver runs `bb prove` client-side for `aggregate_derivation`
- Proof size: ~2KB per proof, ~200ms generation on M2

To switch: set `DEMO_MODE=false` in gateway `.env` and deploy with `--sig "run()"` (not `runDemo()`).

---

## Known Limitations

| Limitation | Notes | Production Fix |
|---|---|---|
| Mock proofs in demo | SHA-256, not ZK | Install Nargo 0.32 + bb 0.55 |
| No Essential node running | Essential intent pool needs a live node | Run `essential-server` via Docker |
| Single solver | Only one Rust solver instance | Whitelist multiple solver addresses |
| No order cancellation | Intents live until settled | Add expiry + cancel endpoint |
| Sepolia only | No mainnet deployment | Audit contracts, deploy to mainnet |
| Wallet-signed intents | Intents not EIP-712 signed yet | Add `eth_signTypedData` to terminal |
| No slippage protection | Fixed limit price only | Add slippage bps parameter |
