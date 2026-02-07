import { BlockchainRewardService } from "../server/services/blockchainReward.service";
import { ethers } from "ethers";

// Demo Configuration
const DEMO_WALLET = "0x78902c58006916201F65f52f7834e466871DAe8a"; // Key-less public address for demo
const ORDER_AMOUNT = 1000;
const SESSION_ID = ethers.id("demo-order-" + Date.now()); // Unique session ID

async function main() {
    console.log("🚀 Starting Blockchain Reward Verification...");
    console.log(`👤 User Wallet: ${DEMO_WALLET}`);
    console.log(`💰 Order Amount: ₹${ORDER_AMOUNT}`);
    console.log(`🆔 Session ID: ${SESSION_ID}`);

    // Calculation Logic (from orders.ts)
    // Reward = (Total / 100) * 2
    const rewardAmount = (ORDER_AMOUNT / 100) * 2;
    console.log(`✨ Calculated Reward: ${rewardAmount} SRT`);

    try {
        console.log("🔄 Initiating Mint Transaction...");
        const txHash = await BlockchainRewardService.mintUserReward(DEMO_WALLET, rewardAmount, SESSION_ID);

        if (txHash) {
            console.log("\n✅ SUCCESS: Reward Minted Successfully!");
            console.log(`🔗 Transaction Hash: ${txHash}`);
            console.log(`🌍 View on Sepolia Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);
        } else {
            console.error("\n❌ PROCESSED WITH WARNING: Transaction hash not returned (possibly simulated or amount 0).");
        }
    } catch (error) {
        console.error("\n❌ FAILURE: Minting threw an error:", error);
    }
}

main().catch(console.error);
