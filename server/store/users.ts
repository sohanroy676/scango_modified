// server/store/users.ts
// Simple in-memory store for user rewards on the backend
export const serverUserDb: Record<string, { rewardBalance: number }> = {};

export const updateUserBalance = (wallet: string, amount: number) => {
    const key = wallet.toLowerCase();
    if (!serverUserDb[key]) {
        serverUserDb[key] = { rewardBalance: 0 };
    }
    serverUserDb[key].rewardBalance += amount;
    console.log(`[DB] Updated ${wallet}: +${amount} => Total: ${serverUserDb[key].rewardBalance}`);
};

export const getUserBalance = (wallet: string) => {
    const key = wallet.toLowerCase();
    return serverUserDb[key]?.rewardBalance || 0;
};
