import { Router } from 'express';
import { getUserBalance } from '../store/users';

const router = Router();

// GET /api/users/:walletAddress
router.get('/:walletAddress', (req, res) => {
    const { walletAddress } = req.params;
    const balance = getUserBalance(walletAddress);

    res.json({
        walletAddress,
        rewardBalance: balance
    });
});

export default router;
