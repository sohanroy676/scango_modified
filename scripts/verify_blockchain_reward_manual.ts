// scripts/verify_blockchain_reward_manual.ts
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

// Manual Override if .env fails to load in script context
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY || "d24f2fc7c1acd22bebe1e16a4cb6f9775bc16855e9bbd518de320d3a20755a77";
const CONTRACT_ADDRESS = process.env.REWARD_CONTRACT_ADDRESS || "0xdfc17a920e5AEE3ad747f28915D63d213b982A87";

// ABI for the Reward Contract (Mint/Burn only)
const REWARD_ABI = [
    "function mintReward(address user, uint256 amount, bytes32 sessionId) external",
    "function burnReward(address user, uint256 amount) external"
];

// Demo Configuration
// Generate a random wallet to ensure valid address
const randomWallet = ethers.Wallet.createRandom();
const DEMO_WALLET = randomWallet.address;
const ORDER_AMOUNT = 1000;
const SESSION_ID = ethers.id("demo-order-manual-" + Date.now());

async function main() {
    console.log("🚀 Starting Blockchain Reward Verification (Manual Mode)...");
    try {
        console.log(`👤 User Wallet: ${DEMO_WALLET}`);
        console.log(`💰 Order Amount: ₹${ORDER_AMOUNT}`);
        console.log(`🆔 Session ID: ${SESSION_ID}`);
        console.log(`📡 RPC: ${RPC_URL}`);
        console.log(`📝 Contract: ${CONTRACT_ADDRESS}`);

        const rewardAmount = (ORDER_AMOUNT / 100) * 2;
        console.log(`✨ Calculated Reward: ${rewardAmount} SRT`);

        if (!PRIVATE_KEY) {
            console.error("❌ Private Key missing!");
            return;
        }

        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, REWARD_ABI, wallet);

        console.log("🔄 Initiating Mint Transaction...");
        const integerAmount = Math.floor(rewardAmount);
        const amountWei = ethers.parseUnits(integerAmount.toString(), 18);

        const tx = await contract.mintReward(DEMO_WALLET, amountWei, SESSION_ID);
        console.log(`⏳ Reward TX sent: ${tx.hash}`);
        console.log("Waiting for confirmation...");

        // Wait for 1 confirmation
        const receipt = await tx.wait(1);

        console.log("\n✅ SUCCESS: Reward Minted & Confirmed!");
        console.log(`🔗 Transaction Hash: ${receipt.hash}`);
        console.log(`🌍 View on Sepolia Etherscan: https://sepolia.etherscan.io/tx/${receipt.hash}`);

    } catch (error) {
        console.error("\n❌ FAILURE: Minting threw an error:", error);
    }
}

main().catch(console.error);
