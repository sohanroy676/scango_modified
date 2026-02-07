// scripts/verify_frontend_update.ts
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
dotenv.config();

// Manual Override if .env fails to load in script context
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY || "d24f2fc7c1acd22bebe1e16a4cb6f9775bc16855e9bbd518de320d3a20755a77";
const CONTRACT_ADDRESS = process.env.REWARD_CONTRACT_ADDRESS || "0xdfc17a920e5AEE3ad747f28915D63d213b982A87";

const REWARD_ABI = [
    "function mintReward(address user, uint256 amount, bytes32 sessionId) external",
    "function burnReward(address user, uint256 amount) external"
];

// Generate a random wallet to GUARANTEE a valid address
const randomWallet = ethers.Wallet.createRandom();
const FRONTEND_WALLET = randomWallet.address;

const MINT_AMOUNT_SRT = 50;
const SESSION_ID = ethers.id("frontend-verify-random-" + Date.now());

async function main() {
    console.log("🚀 Starting Frontend Reward Verification (Random Wallet)...");

    // Save address to file for easy retrieval
    fs.writeFileSync("temp_wallet.txt", FRONTEND_WALLET);
    console.log(`💾 Saved Wallet Address to temp_wallet.txt: ${FRONTEND_WALLET}`);

    try {
        console.log(`👤 Target Wallet: ${FRONTEND_WALLET}`);
        console.log(`💰 Minting Amount: ${MINT_AMOUNT_SRT} SRT`);

        if (!PRIVATE_KEY) {
            console.error("❌ Private Key missing!");
            return;
        }

        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, REWARD_ABI, wallet);

        console.log("🔄 Initiating Mint Transaction...");
        const amountWei = ethers.parseUnits(MINT_AMOUNT_SRT.toString(), 18);

        const tx = await contract.mintReward(FRONTEND_WALLET, amountWei, SESSION_ID);
        console.log(`⏳ Reward TX sent: ${tx.hash}`);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait(1);

        console.log("\n✅ SUCCESS: Reward Minted!");
        console.log(`🔗 Transaction Hash: ${receipt.hash}`);

    } catch (error) {
        console.error("\n❌ FAILURE: Minting threw an error:", error);
    }
}

main().catch(console.error);
