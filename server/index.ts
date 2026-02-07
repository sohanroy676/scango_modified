
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import twilio from "twilio";
import cashierRouter from "./routes/cashier";
// 🔗 IMPORT ORDERS ROUTER
import ordersRouter from "./routes/orders";
import guardRouter from "./routes/guard";
import userRoutes from "./routes/users";

const app = express();

app.use(cors());
app.use(bodyParser.json());

// ==================
// TWILIO SETUP
// ==================
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  VERIFY_SERVICE_SID,
} = process.env;

/*
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !VERIFY_SERVICE_SID) {
  throw new Error("❌ Missing Twilio environment variables");
}
*/

// const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// ==================
// OTP ROUTES
// ==================
app.post("/api/send-otp", async (req: Request, res: Response) => {
  res.json({ success: true, message: "OTP sent (Bypassed)" });
});

app.post("/api/verify-otp", async (req: Request, res: Response) => {
  res.json({ success: true, message: "Verified (Bypassed)" });
});

// ==================
// 🔗 BLOCKCHAIN ORDER ROUTES
// ==================
app.use("/api/orders", ordersRouter);
app.use("/api/cashier", cashierRouter);
app.use("/api/guard", guardRouter);
app.use("/api/users", userRoutes);

// ==================
// SERVER START
// ==================
import https from "https";
import { getCertificate } from "./certs";

const PORT = process.env.PORT || 5000;

// 🔒 Secure Server
const bootstrap = async () => {
  try {
    const { cert, key } = await getCertificate();
    const server = https.createServer({ key, cert }, app);

    server.listen(PORT, () => {
      console.log(`🚀 Secure Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

bootstrap();

