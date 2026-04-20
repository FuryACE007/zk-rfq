//! Real Noir proof generation using nargo + bb CLI.
//!
//! Generates a Barretenberg UltraHonk proof for the `aggregate_derivation` circuit.
//! The proof attests that the aggregate quote is correctly derived from private DEX prices.
//!
//! Flow:
//!   1. Write witness values to Prover.toml
//!   2. `nargo execute` to generate the ACIR witness
//!   3. `bb prove` to generate the UltraHonk proof
//!   4. Read proof bytes from output file

use std::fs;
use std::path::Path;
use std::process::Command;
use tracing::{info, debug, error};

/// Witness inputs for the aggregate_derivation circuit.
pub struct AggregateWitness {
    pub uniswap_price: u64,
    pub jupiter_price: u64,
    pub dex_weights: [u64; 2],
    pub final_aggregate_quote: u64,
}

/// Generate a real Barretenberg UltraHonk proof for the aggregate_derivation circuit.
///
/// Returns the raw proof bytes that can be verified on-chain by the Solidity verifier.
pub fn generate_proof(
    circuits_path: &Path,
    witness: &AggregateWitness,
) -> anyhow::Result<Vec<u8>> {
    let circuit_dir = circuits_path.join("aggregate_derivation");

    // Verify circuit directory exists
    if !circuit_dir.exists() {
        anyhow::bail!(
            "Circuit directory not found: {}. Run `nargo compile` first.",
            circuit_dir.display()
        );
    }

    // Step 1: Write Prover.toml with witness values
    let prover_toml = format!(
        r#"uniswap_price = "{}"
jupiter_price = "{}"
dex_weights = ["{}", "{}"]
final_aggregate_quote = "{}""#,
        witness.uniswap_price,
        witness.jupiter_price,
        witness.dex_weights[0],
        witness.dex_weights[1],
        witness.final_aggregate_quote,
    );

    let prover_path = circuit_dir.join("Prover.toml");
    fs::write(&prover_path, &prover_toml)?;
    debug!("Wrote Prover.toml to {}", prover_path.display());

    // Step 2: Execute nargo to generate witness
    info!("Executing nargo for aggregate_derivation circuit...");
    let nargo_status = Command::new("nargo")
        .args(["execute", "--package", "aggregate_derivation"])
        .current_dir(circuits_path)
        .output()?;

    if !nargo_status.status.success() {
        let stderr = String::from_utf8_lossy(&nargo_status.stderr);
        error!("nargo execute failed: {}", stderr);
        anyhow::bail!("nargo execute failed: {}", stderr);
    }
    debug!("nargo execute succeeded");

    // Step 3: Generate proof with bb
    let circuit_json = circuits_path
        .join("target")
        .join("aggregate_derivation.json");
    let witness_file = circuits_path
        .join("target")
        .join("aggregate_derivation.gz");
    let proof_output = circuits_path.join("target").join("aggregate_proof");

    // Ensure VK exists (should have been generated during setup)
    let vk_path = circuits_path.join("target").join("aggregate_vk").join("vk");
    if !vk_path.exists() {
        info!("Verification key not found, generating...");
        let vk_dir = circuits_path.join("target").join("aggregate_vk");
        fs::create_dir_all(&vk_dir)?;

        let bb_vk = Command::new("bb")
            .args([
                "write_vk",
                "-b", &circuit_json.to_string_lossy(),
                "-o", &vk_dir.to_string_lossy(),
                "--oracle_hash", "keccak",
            ])
            .output()?;

        if !bb_vk.status.success() {
            let stderr = String::from_utf8_lossy(&bb_vk.stderr);
            anyhow::bail!("bb write_vk failed: {}", stderr);
        }
    }

    info!("Generating UltraHonk proof with bb...");
    let bb_prove = Command::new("bb")
        .args([
            "prove",
            "-b", &circuit_json.to_string_lossy(),
            "-w", &witness_file.to_string_lossy(),
            "-o", &proof_output.to_string_lossy(),
            "--oracle_hash", "keccak",
        ])
        .output()?;

    if !bb_prove.status.success() {
        let stderr = String::from_utf8_lossy(&bb_prove.stderr);
        error!("bb prove failed: {}", stderr);
        anyhow::bail!("bb prove failed: {}", stderr);
    }

    // Step 4: Read proof bytes
    let proof_bytes = fs::read(&proof_output)?;
    info!("UltraHonk proof generated: {} bytes", proof_bytes.len());

    Ok(proof_bytes)
}

/// Fallback: mock proof generation when nargo/bb are not available.
pub fn generate_proof_mock(witness: &AggregateWitness) -> Vec<u8> {
    use sha2::{Digest, Sha256};

    let witness_str = format!(
        "{},{},{},{},{}",
        witness.uniswap_price,
        witness.jupiter_price,
        witness.dex_weights[0],
        witness.dex_weights[1],
        witness.final_aggregate_quote,
    );

    let mut hasher = Sha256::new();
    hasher.update(witness_str.as_bytes());
    hasher.update(b"noir_aggregate_derivation_v1");
    hasher.finalize().to_vec()
}

/// Check if nargo and bb CLI tools are available on the system.
pub fn check_toolchain() -> bool {
    let nargo_ok = Command::new("nargo")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let bb_ok = Command::new("bb")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if nargo_ok && bb_ok {
        info!("Noir toolchain available (nargo + bb)");
    } else {
        if !nargo_ok {
            tracing::warn!("nargo not found — will use mock proof generation");
        }
        if !bb_ok {
            tracing::warn!("bb not found — will use mock proof generation");
        }
    }

    nargo_ok && bb_ok
}
