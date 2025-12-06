import express from "express";
import { authMiddleware, isRestaurant, isShopOwner } from "../../middlewares/authMiddlewares.js"; // isShopOwner là middleware mới cần tạo
import {
    createShop,
    getMyShop,
    updateMyShop,
    updateShopStatus,
    getAllShops,      
    getShopDetails       
} from "../../controllers/shopControllers.js";

const router = express.Router();

// 1. Lấy danh sách tất cả shop
router.get("/", getAllShops);

// 2. Tạo mới một shop (Cần đăng nhập)
router.post("/", authMiddleware, createShop); 

router.use(authMiddleware, isRestaurant);

// 4. Update Shop (Cần đăng nhập + Phải là chủ shop)
// Dùng cả 2 middleware: check login -> check chủ sở hữu
router.put("/my-shop", authMiddleware, isShopOwner, updateMyShop);

router.get("/my-shop", authMiddleware, isRestaurant, getMyShop);

router.put("/my-shop", authMiddleware, isRestaurant, updateMyShop);

router.patch("/my-shop/status", authMiddleware, isRestaurant, updateShopStatus);

export default router;