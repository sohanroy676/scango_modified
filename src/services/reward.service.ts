import { ethers } from "ethers";

// Minimal ABI for ERC-20 Balance
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

// Configuration (Should ideally match .env, but Vite exposes VITE_ params)
// Since we didn't add VITE_ prefix to new env vars for backend, we might need to hardcode 
// or assume the frontend can access them if they are exposed. 
// For now, I'll use the public RPC and Contract from the plan/backend.
// NOTE: In a real app, these should be in VITE_ env vars.

const REWARD_CONTRACT_ADDRESS = "0xdfc17a920e5AEE3ad747f28915D63d213b982A87"; // Checked & Verified
const SEPOLIA_RPC_URL = "https://rpc.ankr.com/eth_sepolia"; // More reliable public RPC

export const rewardService = {
    /**
     * Fetches the SRT balance for a given wallet address.
     * @param walletAddress The user's wallet address.
     * @returns Formatted balance string (e.g., "12 SRT")
     */
    getBalance: async (walletAddress: string): Promise<string> => {
        try {
            if (!walletAddress || !ethers.isAddress(walletAddress)) return "0";

            const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
            const contract = new ethers.Contract(REWARD_CONTRACT_ADDRESS, ERC20_ABI, provider);

            const balanceWei = await contract.balanceOf(walletAddress);

            // We know decimals is 18, but could fetch if dynamic
            // const decimals = await contract.decimals();

            const balance = ethers.formatUnits(balanceWei, 18);

            // Return integer part for simplicity in UI, or 1 decimal if needed
            return Math.floor(parseFloat(balance)).toString();
        } catch (error) {
            console.warn("Failed to fetch reward balance:", error);
            return "0";
        }
    }
};
