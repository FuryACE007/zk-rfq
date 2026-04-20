// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUniswapV3Factory {
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IUniswapV3Pool {
    function initialize(uint160 sqrtPriceX96) external;
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }
    function mint(MintParams calldata params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
}

interface IMockToken {
    function approve(address spender, uint256 amount) external returns (bool);
    function mint(address to, uint256 amount) external;
}

/// @notice Creates a MockWETH/MockUSDC Uniswap V3 pool on Sepolia and seeds it with liquidity.
///
/// Usage:
///   forge script script/SetupPool.s.sol \
///     --rpc-url $SEPOLIA_RPC_URL \
///     --private-key $DEPLOYER_PRIVATE_KEY \
///     --broadcast \
///     --sig "run(address,address)" $MOCK_WETH_ADDRESS $MOCK_USDC_ADDRESS
///
/// Uniswap V3 Sepolia addresses (canonical):
///   Factory:    0x0227628f3F023bb0B980b67D528571c95c6DaC1c
///   PosMgr:     0x1238536071E1c677A632429e3655c799b22cDA52
contract SetupPool is Script {
    // Uniswap V3 Sepolia
    address constant FACTORY     = 0x0227628f3F023bb0B980b67D528571c95c6DaC1c;
    address constant POS_MANAGER = 0x1238536071E1c677A632429e3655c799b22cDA52;

    // Target price: 1 WETH = 2500 USDC
    // sqrtPriceX96 = sqrt(price) * 2^96
    // price = USDC_amount / WETH_amount (adjusted for decimals)
    // price_raw = 2500 * 1e6 / 1e18 = 2500e-12
    // sqrtPriceX96 = sqrt(2500e-12) * 2^96
    // = 1.581e-6 * 7.922e28 = 1.253e23
    // Computed: 1253240893011736400000 (approx)
    uint160 constant SQRT_PRICE_X96 = 1253240893011736400000;

    int24 constant TICK_SPACING = 60;  // fee 3000 = 0.3%
    int24 constant TICK_LOWER = -887220;
    int24 constant TICK_UPPER = 887220;

    function run(address wethAddr, address usdcAddr) external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        IUniswapV3Factory factory = IUniswapV3Factory(FACTORY);

        // Create pool (fee tier 3000 = 0.3%)
        address pool = factory.getPool(wethAddr, usdcAddr, 3000);
        if (pool == address(0)) {
            pool = factory.createPool(wethAddr, usdcAddr, 3000);
            console.log("Pool created at:", pool);
        } else {
            console.log("Pool already exists at:", pool);
        }

        // Initialize price (only if needed)
        // Note: order of token0/token1 depends on address comparison
        address token0 = IUniswapV3Pool(pool).token0();
        address token1 = IUniswapV3Pool(pool).token1();
        console.log("token0:", token0, "token1:", token1);

        // Initialize pool at target price
        // sqrtPriceX96 must account for token order
        uint160 sqrtPrice = token0 == wethAddr ? SQRT_PRICE_X96 : (type(uint160).max / SQRT_PRICE_X96);
        try IUniswapV3Pool(pool).initialize(sqrtPrice) {
            console.log("Pool initialized");
        } catch {
            console.log("Pool already initialized");
        }

        // Mint liquidity tokens to deployer
        IMockToken(wethAddr).mint(deployer, 50 ether);       // 50 WETH
        IMockToken(usdcAddr).mint(deployer, 150_000 * 1e6);  // 150,000 USDC

        // Approve position manager
        IMockToken(wethAddr).approve(POS_MANAGER, type(uint256).max);
        IMockToken(usdcAddr).approve(POS_MANAGER, type(uint256).max);

        // Add full-range liquidity
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: 3000,
            tickLower: TICK_LOWER,
            tickUpper: TICK_UPPER,
            amount0Desired: token0 == wethAddr ? 50 ether : 150_000 * 1e6,
            amount1Desired: token0 == wethAddr ? 150_000 * 1e6 : 50 ether,
            amount0Min: 0,
            amount1Min: 0,
            recipient: deployer,
            deadline: block.timestamp + 600
        });

        (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) =
            INonfungiblePositionManager(POS_MANAGER).mint(params);

        console.log("LP position minted. tokenId:", tokenId);
        console.log("Liquidity:", liquidity);
        console.log("amount0:", amount0, "amount1:", amount1);
        console.log("\nUniswap V3 Pool Address:", pool);
        console.log("Set in gateway/.env: UNISWAP_POOL_ADDRESS=%s", pool);
        console.log("QUOTER_V2_ADDRESS=0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3");

        vm.stopBroadcast();
    }
}
