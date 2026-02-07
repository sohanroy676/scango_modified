import "dotenv/config";
import { ethers } from "ethers";

// ABI for the Reward Contract (Mint/Burn only)
const REWARD_ABI = [
    "function mintReward(address user, uint256 amount, bytes32 sessionId) external",
    "function burnReward(address user, uint256 amount) external"
];

const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC;
const PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY || process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.REWARD_CONTRACT_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error("❌ Missing Blockchain Reward Configuration in .env");
}

const provider = RPC_URL ? new ethers.JsonRpcProvider(RPC_URL) : null;
const wallet = (PRIVATE_KEY && provider) ? new ethers.Wallet(PRIVATE_KEY, provider) : null;
const rewardContract = (wallet && CONTRACT_ADDRESS) ? new ethers.Contract(CONTRACT_ADDRESS, REWARD_ABI, wallet) : null;

export const BlockchainRewardService = {
    /**
     * Mints reward tokens to a user's wallet.
     * @param userWallet The user's wallet address.
     * @param amount The amount of tokens to mint (in full units, service handles decimals).
     * @param sessionId A unique session ID (e.g., order hash) to prevent replay.
     */
    mintUserReward: async (userWallet: string, amount: number, sessionId: string) => {
        if (!rewardContract) {
            console.error("⚠️ Reward contract not initialized. Skipping reward.");
            return;
        }

        if (amount <= 0) {
            console.log(`ℹ️ Reward amount is 0. Skipping transaction for ${sessionId}.`);
            return;
        }

        try {
            // 1. Validate Address
            if (!ethers.isAddress(userWallet)) {
                throw new Error(`Invalid user wallet address: ${userWallet}`);
            }

            // 2. Format Amount (18 decimals)
            // Math.floor to ensure integer rewards as per rules, then convert to Wei
            const integerAmount = Math.floor(amount);
            if (integerAmount <= 0) return;

            const amountWei = ethers.parseUnits(integerAmount.toString(), 18);

            // 3. Ensure sessionId is bytes32
            // If sessionId is a hex string (orderHash), use it. If not, hash it.
            let sessionBytes32 = sessionId;
            if (!ethers.isHexString(sessionId) || sessionId.length !== 66) {
                sessionBytes32 = ethers.id(sessionId);
            }

            console.log(`🎁 Minting ${integerAmount} SRT to ${userWallet} for session ${sessionId}...`);

            // 4. Send Transaction
            const tx = await rewardContract.mintReward(userWallet, amountWei, sessionBytes32);
            console.log(`⏳ Reward TX sent: ${tx.hash}`);

            // We do NOT await tx.wait() to keep this non-blocking for the main thread response if called without await,
            // but usually we want to log success. The caller should decide whether to await.
            // For safety, we'll return the hash and let the background process it.
            return tx.hash;

        } catch (error) {
            console.error("❌ Failed to mint reward:", error);
            // Do not throw, so we don't break the caller
        }
    },

    /**
     * Burns reward tokens from a user's wallet.
     * @param userWallet The user's wallet address.
     * @param amount The amount of tokens to burn.
     */
    burnUserReward: async (userWallet: string, amount: number) => {
        if (!rewardContract) return;

        try {
            const integerAmount = Math.floor(amount);
            if (integerAmount <= 0) return;

            const amountWei = ethers.parseUnits(integerAmount.toString(), 18);

            console.log(`🔥 Burning ${integerAmount} SRT from ${userWallet}...`);
            const tx = await rewardContract.burnReward(userWallet, amountWei);
            return tx.hash;
        } catch (error) {
            console.error("❌ Failed to burn reward:", error);
        }
    }
};
