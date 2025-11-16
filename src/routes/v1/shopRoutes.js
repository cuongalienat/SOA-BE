import express from "express";
import { authMiddleware, isShopOwner } from "../../middlewares/authMiddlewares.js"; // isShopOwner là middleware mới cần tạo
import { createShop } from "../../controllers/shopControllers.js"; // Controller mới cần tạo

const router = express.Router();

// Middleware `authMiddleware` đảm bảo người dùng đã đăng nhập
// Middleware `isShopOwner` sẽ kiểm tra user có role "shop" không

// POST /api/v1/shops -> Tạo shop mới
router.post("/", authMiddleware, isShopOwner, createShop);

export default router;