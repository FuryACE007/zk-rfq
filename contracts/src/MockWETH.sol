// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockWETH
/// @notice Mintable wrapped ETH for ZK-RFQ testnet demo on Sepolia.
/// @dev 18 decimals to match real WETH. Owner-controlled mint for demo setup.
///      Institutions and solvers call mint() to get test tokens.
contract MockWETH is ERC20, Ownable {
    constructor() ERC20("Mock Wrapped Ether", "mWETH") Ownable(msg.sender) {}

    /// @notice Mint tokens to any address. Only callable by owner (deployer).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Convenience: self-mint for demo purposes.
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
