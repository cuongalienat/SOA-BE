import express from "express";
import { shipperController } from "../../controllers/shipperController.js";
import { authMiddleware } from "../../middlewares/authMiddlewares.js";

const router = express.Router();

// Đăng ký hồ sơ
router.post("/register", authMiddleware, shipperController.register);

// Bật/Tắt Online
router.patch("/status", authMiddleware, shipperController.toggleStatus);

// Cập nhật vị trí
router.patch("/location", authMiddleware, shipperController.pingLocation);

// Xem hồ sơ (thu nhập, xe cộ...)
router.get("/profile", authMiddleware, shipperController.getProfile);

// Cập nhật hồ sơ
router.put("/edit-profile", authMiddleware, shipperController.updateProfile);

// Route lấy lịch sử đơn hàng
router.get("/history", authMiddleware, shipperController.getHistory);

export default router;
