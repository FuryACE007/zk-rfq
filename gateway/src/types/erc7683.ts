/**
 * @file erc7683.ts
 * @description ERC-7683 "Cross-Chain Intents" standard type definitions.
 *
 * ERC-7683 establishes a universal cross-chain intent format so any global
 * solver/market-maker can parse and fill orders without knowing institution-specific
 * APIs. This standardisation is the "plug-and-play" hook that allows the
 * Sovereign Gateway to attract global liquidity without surrendering privacy.
 *
 * Spec: https://eips.ethereum.org/EIPS/eip-7683
 */

// ──────────────────────────────────────────────────────────────────────────────
// Core ERC-7683 Structs
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Represents a single token output that the filler must provide to settle.
 * The solver must guarantee *at minimum* this `amount` of `token` ends up
 * in `recipient`'s wallet on `chainId`.
 */
export interface Output {
  /** ERC-20 token address (or native asset sentinel 0xEeee…) */
  token: string;
  /** Minimum fill amount in token's smallest unit (e.g., wei for WETH) */
  amount: bigint;
  /** Destination recipient — the institutional client's settlement wallet */
  recipient: string;
  /** Destination chain ID for cross-chain fills */
  chainId: number;
}

/**
 * Describes what the swapper (institution) is giving up — the "input" side
 * of the intent that gets locked in the settlement contract.
 */
export interface Input {
  /** ERC-20 token address being sold */
  token: string;
  /** Exact sell amount */
  amount: bigint;
}

/**
 * Application-specific payload embedded inside CrossChainOrder.orderData.
 * Extended by the Sovereign Gateway to carry ZK-proof metadata.
 */
export interface RfqOrderData {
  /** Human-readable asset pair, e.g. "WETH/USDC" */
  assetPair: string;
  /** Source chain where the institution holds the input asset */
  sourceChainId: number;
  /** Destination chain for the output asset (may be same as source) */
  destinationChainId: number;
  /** Minimum fill ratio in basis points (e.g., 9500 = 95 %) */
  minFillBps: number;
  /** UNIX timestamp after which partial fills are rejected */
  fillDeadline: number;
  /** Keccak256 commitment to the institution's secret limit price.
   *  The real limit price is a private input to the Noir circuit —
   *  never transmitted in plaintext. */
  limitPriceCommitment: string;
  /**
   * Whether the ZK-routing mask has been applied.
   * When true, solvers know the bid was validated without revealing routing alpha.
   */
  zkMaskApplied: boolean;
}

/**
 * The canonical ERC-7683 CrossChainOrder.
 * This is the primary unit of communication between Gateway ↔ Solvers.
 *
 * Key privacy property: `orderData` contains a commitment to the limit price,
 * NOT the limit price itself. The actual limit price travels only as a private
 * Noir witness input during proof generation.
 */
export interface CrossChainOrder {
  /** Address of the settlement contract on the origin chain */
  settlementContract: string;
  /** Address of the swapper (institutional client wallet) */
  swapper: string;
  /** Monotonic nonce for replay protection */
  nonce: bigint;
  /** Origin chain where the input tokens are held */
  originChainId: number;
  /** Timestamp before which the order becomes invalid */
  initiateDeadline: number;
  /** Timestamp by which the filler must complete the fill */
  fillDeadline: number;
  /** ABI-encoded RfqOrderData — application layer payload */
  orderData: RfqOrderData;
  /** Inputs the swapper commits to the settlement contract */
  inputs: Input[];
  /** Outputs the filler must provide to the recipient */
  outputs: Output[];
}

/**
 * ERC-7683 GaslessCrossChainOrder — a permit2-style variant where the
 * institution pre-signs the order and the solver pays for submission gas.
 * Used in the Gateway's gasless mode to maintain full sovereignty
 * (institution never sends a tx, only a signature).
 */
export interface GaslessCrossChainOrder {
  /** Address of the originating settlement contract */
  originSettler: string;
  /** Swapper address */
  user: string;
  /** Nonce */
  nonce: bigint;
  /** Origin chain ID */
  originChainId: number;
  /** Open-to timestamp — earliest the order can be filled */
  openDeadline: number;
  /** Fill-by timestamp */
  fillDeadline: number;
  /** Keccak256 hash uniquely identifying the order type */
  orderDataType: string;
  /** Encoded application payload */
  orderData: RfqOrderData;
}

// ──────────────────────────────────────────────────────────────────────────────
// ZK-Bid Extensions (Non-standard, Sovereign Gateway layer)
// ──────────────────────────────────────────────────────────────────────────────

/** A ZK-masked bid submitted by a whitelisted solver */
export interface ZkBid {
  /** The ERC-7683 order hash this bid responds to */
  orderHash: string;
  /** Solver's public identity (pseudonymous on-chain address) */
  solverAddress: string;
  /**
   * Aggregate price that satisfies the limit — the only public output of
   * the Noir circuit. DEX-specific prices are private witnesses.
   */
  finalAggregateQuote: bigint;
  /** Serialised Noir proof bytes (hex-encoded) */
  proof: string;
  /** Block number at which this bid expires for JIT freshness guarantees */
  bidExpiry: number;
}

/** Settlement payload sent to the Essential server */
export interface SettlementPayload {
  erc7683Order: CrossChainOrder;
  winningBid: ZkBid;
  timestamp: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ──────────────────────────────────────────────────────────────────────────────

import { keccak256, AbiCoder, toUtf8Bytes } from 'ethers';

/**
 * Derives a deterministic ERC-7683 order hash from the CrossChainOrder fields.
 * Mirrors the on-chain `keccak256(abi.encode(order))` pattern.
 */
export function hashCrossChainOrder(order: CrossChainOrder): string {
  const abiCoder = AbiCoder.defaultAbiCoder();
  const encoded = abiCoder.encode(
    ['address', 'address', 'uint256', 'uint64', 'uint32', 'uint32', 'bytes32'],
    [
      order.settlementContract,
      order.swapper,
      order.nonce,
      order.originChainId,
      order.initiateDeadline,
      order.fillDeadline,
      keccak256(toUtf8Bytes(JSON.stringify(order.orderData))),
    ]
  );
  return keccak256(encoded);
}

/**
 * Creates a commitment to the secret limit price using a random salt.
 * Commitment = keccak256(abi.encodePacked(limitPrice, salt))
 * The salt + limit price are kept as private Noir witnesses.
 */
export function commitLimitPrice(limitPrice: bigint, salt: string): string {
  const abiCoder = AbiCoder.defaultAbiCoder();
  const encoded = abiCoder.encode(['uint256', 'bytes32'], [limitPrice, salt]);
  return keccak256(encoded);
}
