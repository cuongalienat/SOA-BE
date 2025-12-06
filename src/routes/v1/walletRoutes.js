import express from "express";
import {
    getMyWallet,
    depositMoney,
    getHistory
} from "../../controllers/walletControllers.js";
import { authMiddleware } from "../../middlewares/authMiddlewares.js";

const router = express.Router();

// Apply auth middleware to all wallet routes
router.use(authMiddleware);

// 1. Get Wallet Info (Balance)
router.get("/", getMyWallet);

// 2. Deposit Money
router.post("/deposit", depositMoney);

// 3. Get Transaction History
router.get("/history", getHistory);

export default router;
