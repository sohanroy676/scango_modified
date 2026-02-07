import { Router } from "express";
import crypto from "crypto";
import { scanGoContract } from "../services/blockchain";
import { BlockchainRewardService } from "../services/blockchainReward.service";
import { updateUserBalance } from "../store/users";

const router = Router();

/**
 * Generate a secure, non-guessable order hash
 */
function generateOrderHash({
  cart,
  total,
  storeId,
}: {
  cart: any[];
  total: number;
  storeId: string;
}) {
  const payload = {
    cart,
    total,
    storeId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  return {
    orderHash: "0x" + hash,
    payload, // optional: store in DB if needed
  };
}

/**
 * CUSTOMER CHECKOUT
 * Creates blockchain-backed order & returns QR hash
 */
router.post("/checkout", async (req, res) => {
  try {
    const { cart, total, storeId, timeSpent = 0, userWallet } = req.body;
    console.log("📝 Checkout Payload:", JSON.stringify({ total, storeId, userWallet, hasCart: !!cart }));

    if (!cart || !total || !storeId) {
      return res.status(400).json({
        error: "cart, total, and storeId are required",
      });
    }

    // 1️⃣ Generate cryptographic order hash
    const { orderHash } = generateOrderHash({
      cart,
      total,
      storeId,
    });

    // 2️⃣ Write order to blockchain
    const tx = await scanGoContract.createOrder(orderHash);
    await tx.wait(); // wait for confirmation

    // 2.5️⃣ Auto-mark as PAID if not CASH (Online Payment)
    if (req.body.paymentMethod && req.body.paymentMethod !== 'CASH') {
      console.log(`💳 Auto-paying for ${req.body.paymentMethod} order: ${orderHash}`);
      const payTx = await scanGoContract.markPaid(orderHash);
      await payTx.wait();
    }

    // 3️⃣ Return QR-safe response
    res.json({
      success: true,
      orderHash,
    });

    // 4️⃣ [NEW] Process Blockchain Rewards (Non-blocking)
    // Runs after response is sent (in theory, but here after res.json since we await inside async function,
    // actually safer to run before res.json but not await the promise if we want true non-blocking,
    // or just await and catch errors so response isn't delayed too much if it's fast.
    // Given requirements say "Never rollback checkout", we wrap in try-catch and log errors.
    (async () => {
      try {
        if (!userWallet) {
          console.log(`ℹ️ No user wallet provided for rewards for order ${orderHash}`);
          return;
        }

        // --- REWARD BUSINESS RULES ---
        let rewardAmount = 0;

        if (total > 0) {
          // Rule 1: Amount-based (2 SRT per ₹100)
          // Example: 250 => 2.5 * 2 = 5 SRT
          rewardAmount += (total / 100) * 2;
        }

        // Rule 2: Time-based (0.5 SRT per minute if total > ₹250)
        if (total > 250 && timeSpent > 0) {
          rewardAmount += (timeSpent * 0.5);
        }

        // Round down to integer as per rules
        rewardAmount = Math.floor(rewardAmount);

        if (rewardAmount > 0) {
          console.log(`🎉 Calculating rewards for ${orderHash}: Total=₹${total}, Time=${timeSpent}m -> Reward=${rewardAmount} SRT`);

          // 4.1 Update Local DB (Instant)
          const { updateUserBalance } = require("../store/users");
          updateUserBalance(userWallet, rewardAmount);

          // 4.2 Update Blockchain (Async)
          await BlockchainRewardService.mintUserReward(userWallet, rewardAmount, orderHash);
        } else {
          console.log(`ℹ️ No rewards earned for ${orderHash} (Total: ${total}, Time: ${timeSpent})`);
        }

      } catch (rewardError) {
        console.error("⚠️ Reward System Error (Checkout unaffected):", rewardError);
      }
    })();

  } catch (error: any) {
    console.error("Checkout error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to create order",
    });
  }
});

export default router;
