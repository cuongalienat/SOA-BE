import express from "express";
import { authMiddleware, isRestaurant } from "../../middlewares/authMiddlewares.js"; // isShopOwner là middleware mới cần tạo
import { createShop, getMyShop, updateMyShop, updateShopStatus } from "../../controllers/shopControllers.js"; // Controller mới cần tạo

const router = express.Router();

router.use(authMiddleware, isRestaurant);

router.post("/", createShop);

router.get("/my-shop", getMyShop);

router.put("/my-shop", updateMyShop);

router.patch("/my-shop/status", updateShopStatus);

export default router;