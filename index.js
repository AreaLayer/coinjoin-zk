const snarkjs = require("snarkjs");
const fs = require("fs");
const { execSync } = require("child_process");

async function run() {
    // Compile the circuit
    console.log("Compiling the circuit...");
    execSync("circom circuit.circom --r1cs --wasm --sym --c");

    // Generate the witness
    console.log("Generating the witness...");
    execSync("node circuit_js/generate_witness.js circuit_js/circuit.wasm input.json witness.wtns");

    // Setup the trusted setup
    console.log("Running setup...");
    const { zkey: { data: zkeyData } } = await snarkjs.powersOfTau.newZKey(
        "circuit.r1cs",
        "pot12_final.ptau"
    );

    // Export verification key
    console.log("Exporting verification key...");
    const vKey = await snarkjs.zKey.exportVerificationKey(zkeyData);
    fs.writeFileSync("verification_key.json", JSON.stringify(vKey));

    // Generate proof
    console.log("Generating proof...");
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        fs.readFileSync("witness.wtns"),
        zkeyData
    );

    console.log("Proof: ", proof);
    console.log("Public Signals: ", publicSignals);

    // Verify proof
    console.log("Verifying proof...");
    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    console.log("Proof is valid:", isValid);
}

run().catch(console.error);
