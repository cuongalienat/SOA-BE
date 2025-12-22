import express from "express";
import {
    getMyWallet,
    createWallet,
    depositMoney,
    getHistory
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
router.get("/history", authMiddleware, getHistory);

export default router;
