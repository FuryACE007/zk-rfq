// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockVerifier
/// @notice Always-true ZK verifier for testnet demo deployments.
///
/// Use this instead of the real AggregateDerivationVerifier / LimitCheckVerifier
/// when you do not have nargo + bb available to generate real UltraHonk proofs.
///
/// Deploy with:
///   forge script script/Deploy.s.sol --sig "runDemo()" ...
///
/// WARNING: Never deploy this on mainnet.
contract MockVerifier {
    function verify(bytes calldata, bytes32[] calldata) external pure returns (bool) {
        return true;
    }
}
