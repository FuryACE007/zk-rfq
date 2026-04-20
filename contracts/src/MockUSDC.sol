// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockUSDC
/// @notice Mintable USD Coin for ZK-RFQ testnet demo on Sepolia.
/// @dev 6 decimals to match real USDC and Noir circuit's 1e6 fixed-point precision.
///      The Noir circuit uses final_aggregate_quote in 1e6 units (e.g., 2492_000000 = $2,492.00).
///      Settlement transfers: amount_usdc = (weth_amount * aggregate_quote) / 1e18
contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USD Coin", "mUSDC") Ownable(msg.sender) {}

    /// @notice 6 decimals to match real USDC.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint tokens to any address. Only callable by owner (deployer).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Convenience: self-mint for demo purposes.
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
