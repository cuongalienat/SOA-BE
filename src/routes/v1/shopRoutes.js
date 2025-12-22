import express from "express";
import { authMiddleware, isRestaurant } from "../../middlewares/authMiddlewares.js"; // isShopOwner là middleware mới cần tạo
import {
    createShop,
    getMyShop,
    updateMyShop,
    updateShopStatus,
    getAllShops,
    getShopByID,
    getShopDetails
} from "../../controllers/shopControllers.js";

const router = express.Router();

// 1. Lấy danh sách tất cả shop
router.get("/", getAllShops);
// 2. Tạo mới một shop (Cần đăng nhập)
router.post("/", authMiddleware, createShop);
router.get("/my-shop", authMiddleware, getMyShop);
router.get("/:id", authMiddleware, getShopByID);
router.put("/my-shop", authMiddleware, isRestaurant, updateMyShop);
router.patch("/my-shop/status", authMiddleware, isRestaurant, updateShopStatus);

export default router;