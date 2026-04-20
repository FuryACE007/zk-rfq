// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev Minimal interface matching both generated Barretenberg UltraHonk verifiers.
interface INoirVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

/// @title ZkRfqSettlement
/// @notice On-chain settlement for the ZK-RFQ sovereign gateway.
///
/// ARCHITECTURE:
///   - Essential (private layer) validates intent business logic (whitelist, deadlines, no-double-settle)
///   - This contract (Sepolia public layer) validates ZK proofs and executes ERC-20 transfers
///
/// TWO-PROOF SETTLEMENT:
///   1. Solver proof (aggregate_derivation):
///      Proves the aggregate quote is correctly derived from private DEX prices.
///      Protects solver's routing alpha.
///   2. Institution proof (limit_check):
///      Proves the aggregate quote >= institution's secret limit price.
///      Generated client-side in the institution's browser (limit never leaves browser).
///
///   Both proofs share the same public input: final_aggregate_quote.
///   Both must verify on-chain for settlement to execute.
///
/// TOKEN FLOW:
///   Institution approves this contract for WETH before submitting intent.
///   Solver approves this contract for USDC before submitting bid.
///   On settlement: WETH flows institution → solver, USDC flows solver → institution.
contract ZkRfqSettlement is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -- Verifiers (set at construction, immutable) --

    INoirVerifier public immutable aggregateVerifier;
    INoirVerifier public immutable limitVerifier;

    // -- Tokens --

    IERC20 public immutable weth;
    IERC20 public immutable usdc;

    // -- Order Registry --

    struct Order {
        address swapper;      // Institution's address (approved WETH for this contract)
        uint256 wethAmount;   // Amount of WETH to sell (18 decimals)
        bool registered;
    }

    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => bool) public settled;

    // -- Events --

    event OrderRegistered(bytes32 indexed orderHash, address indexed swapper, uint256 wethAmount);

    event OrderSettled(
        bytes32 indexed orderHash,
        address indexed swapper,
        address indexed solver,
        uint256 wethAmount,
        uint256 usdcReceived,
        uint256 aggregateQuote
    );

    // -- Constructor --

    constructor(
        address _aggregateVerifier,
        address _limitVerifier,
        address _weth,
        address _usdc
    ) Ownable(msg.sender) {
        require(_aggregateVerifier != address(0), "Invalid aggregate verifier");
        require(_limitVerifier != address(0), "Invalid limit verifier");
        require(_weth != address(0), "Invalid WETH");
        require(_usdc != address(0), "Invalid USDC");

        aggregateVerifier = INoirVerifier(_aggregateVerifier);
        limitVerifier = INoirVerifier(_limitVerifier);
        weth = IERC20(_weth);
        usdc = IERC20(_usdc);
    }

    // -- Order Management --

    /// @notice Gateway calls this when an intent is submitted to Essential.
    ///         Registers the order on-chain so settlement can proceed later.
    /// @param orderHash  keccak256 hash of the ERC-7683 CrossChainOrder struct
    /// @param swapper    Institution's address (must have approved WETH)
    /// @param wethAmount Amount of WETH the institution wants to sell
    function registerOrder(
        bytes32 orderHash,
        address swapper,
        uint256 wethAmount
    ) external onlyOwner whenNotPaused {
        require(!orders[orderHash].registered, "Order already registered");
        require(swapper != address(0), "Invalid swapper");
        require(wethAmount > 0, "Invalid amount");

        orders[orderHash] = Order({swapper: swapper, wethAmount: wethAmount, registered: true});
        emit OrderRegistered(orderHash, swapper, wethAmount);
    }

    // -- Settlement --

    /// @notice Settles an RFQ order after Essential has validated it privately.
    ///         Verifies both ZK proofs on-chain, then executes atomic token transfers.
    ///
    /// @param orderHash         The order being settled (must be registered)
    /// @param solver            The solver's address (receives WETH)
    /// @param aggregateQuote    Final price in 1e6 fixed-point (e.g., 2492_000000 = $2,492.00 USDC/ETH)
    /// @param solverProof       Barretenberg UltraHonk proof from aggregate_derivation circuit
    /// @param institutionProof  Barretenberg UltraHonk proof from limit_check circuit
    /// @param publicInputs      Array of public inputs: [final_aggregate_quote as bytes32]
    ///                          Both circuits share this same public input.
    function settleOrder(
        bytes32 orderHash,
        address solver,
        uint256 aggregateQuote,
        bytes calldata solverProof,
        bytes calldata institutionProof,
        bytes32[] calldata publicInputs
    ) external nonReentrant whenNotPaused {
        // -- Preconditions --
        Order memory order = orders[orderHash];
        require(order.registered, "Order not registered");
        require(!settled[orderHash], "Order already settled");
        require(solver != address(0), "Invalid solver");
        require(aggregateQuote > 0, "Invalid quote");

        // -- ZK Proof Verification --
        // Solver proof: proves aggregate is correctly derived from private DEX prices
        require(aggregateVerifier.verify(solverProof, publicInputs), "Invalid solver proof");

        // Institution proof: proves aggregate >= institution's secret limit price
        require(limitVerifier.verify(institutionProof, publicInputs), "Invalid limit proof");

        // -- Settlement --
        settled[orderHash] = true;

        // USDC amount: wethAmount (18 dec) * aggregateQuote (1e6) / 1e18 / 1e6 -> usdc (6 dec)
        // = wethAmount * aggregateQuote / 1e18
        uint256 usdcAmount = (order.wethAmount * aggregateQuote) / 1e18;

        // Atomic token transfers
        // WETH: institution -> solver
        weth.safeTransferFrom(order.swapper, solver, order.wethAmount);
        // USDC: solver -> institution
        usdc.safeTransferFrom(solver, order.swapper, usdcAmount);

        emit OrderSettled(
            orderHash,
            order.swapper,
            solver,
            order.wethAmount,
            usdcAmount,
            aggregateQuote
        );
    }

    // -- Admin --

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
