import express from "express";
import { authMiddleware, isRestaurant } from "../../middlewares/authMiddlewares.js"; // isShopOwner là middleware mới cần tạo
import  upload  from "../../middlewares/uploadCloud.js";

import {
    createShop,
    getMyShop,
    getMyShopDashboard,
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
router.get("/my-shop/dashboard", authMiddleware, isRestaurant, getMyShopDashboard);
router.get("/:id", authMiddleware, getShopByID);

router.put(
  "/my-shop",
  authMiddleware,
  isRestaurant,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "qrImage", maxCount: 1 },
  ]),
  updateMyShop
);

router.patch("/my-shop/status", authMiddleware, isRestaurant, updateShopStatus);

export default router;