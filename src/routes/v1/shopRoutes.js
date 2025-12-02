import express from "express";
import { authMiddleware, isRestaurant } from "../../middlewares/authMiddlewares.js"; // isShopOwner là middleware mới cần tạo
import {
    createShop,
    getMyShop,
    updateMyShop,
    updateShopStatus,
    getAllShops,      // <-- Import hàm mới
    getShopById       // <-- Import hàm mới
} from "../../controllers/shopControllers.js";

const router = express.Router();

router.get("/", getAllShops);

router.get("/:id", getShopById);

router.use(authMiddleware, isRestaurant);

router.post("/", createShop);

router.get("/my-shop", authMiddleware, isRestaurant, getMyShop);

router.put("/my-shop", authMiddleware, isRestaurant, updateMyShop);

router.patch("/my-shop/status", authMiddleware, isRestaurant, updateShopStatus);

export default router;