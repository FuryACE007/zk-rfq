// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockWETH.sol";
import "../src/MockUSDC.sol";
import "../src/ZkRfqSettlement.sol";

/// @dev Mock Noir verifier that always returns true (for unit testing without real proofs).
contract MockVerifier {
    function verify(bytes calldata, bytes32[] calldata) external pure returns (bool) {
        return true;
    }
}

/// @dev Mock Noir verifier that always returns false (for negative testing).
contract RejectingVerifier {
    function verify(bytes calldata, bytes32[] calldata) external pure returns (bool) {
        return false;
    }
}

contract ZkRfqSettlementTest is Test {
    MockWETH weth;
    MockUSDC usdc;
    MockVerifier aggVerifier;
    MockVerifier limitVerifier;
    ZkRfqSettlement settlement;

    address institution = makeAddr("institution");
    address solver = makeAddr("solver");
    address gateway = makeAddr("gateway"); // owner

    bytes32 constant ORDER_HASH = keccak256("test_order_1");

    // 10 WETH
    uint256 constant WETH_AMOUNT = 10 ether;
    // $2,492 per ETH in 1e6 fixed-point
    uint256 constant AGGREGATE_QUOTE = 2492_000000;
    // Expected USDC: 10e18 * 2492e6 / 1e18 = 24920e6 = 24,920 USDC
    uint256 constant EXPECTED_USDC = 24920 * 1e6;

    function setUp() public {
        // Deploy as gateway (owner)
        vm.startPrank(gateway);

        weth = new MockWETH();
        usdc = new MockUSDC();
        aggVerifier = new MockVerifier();
        limitVerifier = new MockVerifier();

        settlement = new ZkRfqSettlement(
            address(aggVerifier),
            address(limitVerifier),
            address(weth),
            address(usdc)
        );

        // Mint tokens
        weth.mint(institution, 100 ether);
        usdc.mint(solver, 1_000_000 * 1e6);

        vm.stopPrank();

        // Institution approves settlement contract for WETH
        vm.prank(institution);
        weth.approve(address(settlement), type(uint256).max);

        // Solver approves settlement contract for USDC
        vm.prank(solver);
        usdc.approve(address(settlement), type(uint256).max);
    }

    function test_RegisterOrder() public {
        vm.prank(gateway);
        settlement.registerOrder(ORDER_HASH, institution, WETH_AMOUNT);

        (address swapper, uint256 amount, bool registered) = settlement.orders(ORDER_HASH);
        assertEq(swapper, institution);
        assertEq(amount, WETH_AMOUNT);
        assertTrue(registered);
    }

    function test_SettleOrder_TransfersTokens() public {
        // Register order
        vm.prank(gateway);
        settlement.registerOrder(ORDER_HASH, institution, WETH_AMOUNT);

        uint256 institutionWethBefore = weth.balanceOf(institution);
        uint256 solverUsdcBefore = usdc.balanceOf(solver);

        // Build public inputs (final_aggregate_quote as bytes32)
        bytes32[] memory publicInputs = new bytes32[](1);
        publicInputs[0] = bytes32(AGGREGATE_QUOTE);

        // Settle (mock proofs accepted by MockVerifier)
        settlement.settleOrder(
            ORDER_HASH,
            solver,
            AGGREGATE_QUOTE,
            "",  // solver proof (mock verifier ignores content)
            "",  // institution proof (mock verifier ignores content)
            publicInputs
        );

        // Verify token transfers
        assertEq(weth.balanceOf(institution), institutionWethBefore - WETH_AMOUNT);
        assertEq(weth.balanceOf(solver), WETH_AMOUNT);
        assertEq(usdc.balanceOf(solver), solverUsdcBefore - EXPECTED_USDC);
        assertEq(usdc.balanceOf(institution), EXPECTED_USDC);

        // Order is now settled
        assertTrue(settlement.settled(ORDER_HASH));
    }

    function test_CannotSettleTwice() public {
        vm.prank(gateway);
        settlement.registerOrder(ORDER_HASH, institution, WETH_AMOUNT);

        bytes32[] memory publicInputs = new bytes32[](1);
        publicInputs[0] = bytes32(AGGREGATE_QUOTE);

        settlement.settleOrder(ORDER_HASH, solver, AGGREGATE_QUOTE, "", "", publicInputs);

        vm.expectRevert("Order already settled");
        settlement.settleOrder(ORDER_HASH, solver, AGGREGATE_QUOTE, "", "", publicInputs);
    }

    function test_CannotSettleUnregisteredOrder() public {
        bytes32[] memory publicInputs = new bytes32[](1);
        publicInputs[0] = bytes32(AGGREGATE_QUOTE);

        vm.expectRevert("Order not registered");
        settlement.settleOrder(keccak256("unknown"), solver, AGGREGATE_QUOTE, "", "", publicInputs);
    }

    function test_InvalidSolverProofReverts() public {
        // Deploy a rejecting verifier
        RejectingVerifier badAgg = new RejectingVerifier();
        MockVerifier goodLimit = new MockVerifier();

        vm.prank(gateway);
        ZkRfqSettlement badSettlement = new ZkRfqSettlement(
            address(badAgg),
            address(goodLimit),
            address(weth),
            address(usdc)
        );

        vm.prank(gateway);
        badSettlement.registerOrder(ORDER_HASH, institution, WETH_AMOUNT);

        bytes32[] memory publicInputs = new bytes32[](1);
        publicInputs[0] = bytes32(AGGREGATE_QUOTE);

        vm.expectRevert("Invalid solver proof");
        badSettlement.settleOrder(ORDER_HASH, solver, AGGREGATE_QUOTE, "", "", publicInputs);
    }

    function test_InvalidLimitProofReverts() public {
        MockVerifier goodAgg = new MockVerifier();
        RejectingVerifier badLimit = new RejectingVerifier();

        vm.prank(gateway);
        ZkRfqSettlement badSettlement = new ZkRfqSettlement(
            address(goodAgg),
            address(badLimit),
            address(weth),
            address(usdc)
        );

        vm.prank(gateway);
        badSettlement.registerOrder(ORDER_HASH, institution, WETH_AMOUNT);

        bytes32[] memory publicInputs = new bytes32[](1);
        publicInputs[0] = bytes32(AGGREGATE_QUOTE);

        vm.expectRevert("Invalid limit proof");
        badSettlement.settleOrder(ORDER_HASH, solver, AGGREGATE_QUOTE, "", "", publicInputs);
    }

    function test_UsdcCalculation() public {
        // Verify USDC calculation: wethAmount * aggregateQuote / 1e18
        // 10e18 * 2492e6 / 1e18 = 24920e6 (24,920 USDC)
        vm.prank(gateway);
        settlement.registerOrder(ORDER_HASH, institution, WETH_AMOUNT);

        bytes32[] memory publicInputs = new bytes32[](1);
        publicInputs[0] = bytes32(AGGREGATE_QUOTE);

        settlement.settleOrder(ORDER_HASH, solver, AGGREGATE_QUOTE, "", "", publicInputs);

        assertEq(usdc.balanceOf(institution), EXPECTED_USDC);
    }

    function test_MockTokenFaucet() public {
        address user = makeAddr("user");
        vm.prank(user);
        weth.faucet(5 ether);
        assertEq(weth.balanceOf(user), 5 ether);
    }
}
