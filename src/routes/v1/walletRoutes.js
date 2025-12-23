import express from "express";
import {
    getMyWallet,
    createWallet,
    depositMoney,
    withdrawMoney,
    getHistory,
    checkPin,
} from "../../controllers/walletControllers.js";
import { authMiddleware } from "../../middlewares/authMiddlewares.js";

const router = express.Router();

// Apply auth middleware to all wallet routes
router.use(authMiddleware);

// 1. Get Wallet Info (Balance)
router.get("/", authMiddleware, getMyWallet);
router.post("/", authMiddleware, createWallet);

// 2. Deposit Money
router.post("/deposit", authMiddleware, depositMoney);
router.post("/withdraw", authMiddleware, withdrawMoney);
router.get("/history", authMiddleware, getHistory);

// 3. Get history
router.post("/checkPin", authMiddleware, checkPin);

export default router;
