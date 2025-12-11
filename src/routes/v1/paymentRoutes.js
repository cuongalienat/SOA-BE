import express from "express";
import {
    createPaymentUrl,
    vnpayReturn,
    vnpayIpn
} from "../../controllers/paymentController.js";

const router = express.Router();

// 1. Tạo URL thanh toán
router.post("/create_payment_url", createPaymentUrl);

// 2. Xử lý Return URL (Frontend redirect về đây)
router.get("/vnpay_return", vnpayReturn);

// 3. Xử lý IPN (VNPay gọi ngầm)
router.get("/vnpay_ipn", vnpayIpn);

export default router;
