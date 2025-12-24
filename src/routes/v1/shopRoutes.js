import express from "express";
import { authMiddleware, isRestaurant } from "../../middlewares/authMiddlewares.js"; // isShopOwner là middleware mới cần tạo
import upload from "../../middlewares/uploadCloud.js";

import {
  createShop,
  getMyShop,
  getMyShopDashboard,
  updateMyShop,
  patchMyShop,
  updateShopStatus,
  getAllShops,
  getShopByID,
  getShopDashboard,
} from "../../controllers/shopControllers.js";

const router = express.Router();

// 1. Lấy danh sách tất cả shop
// 2. Tạo mới một shop (Cần đăng nhập)
router.post("/", authMiddleware, createShop);
router.get("/my-shop", authMiddleware, getMyShop);
router.get("/my-shop/dashboard", authMiddleware, getMyShopDashboard);
router.get("/:id", authMiddleware, getShopByID);
router.get("/:id/dashboard", getShopDashboard);


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

// RESTful: partial update for my shop (e.g. isOpen, autoAccept)
router.patch("/my-shop", authMiddleware, isRestaurant, patchMyShop);

router.patch("/my-shop/status", authMiddleware, isRestaurant, updateShopStatus);

export default router;