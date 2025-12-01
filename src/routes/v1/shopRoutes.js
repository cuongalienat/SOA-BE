import express from "express";
import { authMiddleware, isShopOwner } from "../../middlewares/authMiddlewares.js"; // isShopOwner là middleware mới cần tạo
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

router.use(authMiddleware, isShopOwner);

router.post("/", createShop);

router.get("/my-shop", getMyShop);

router.put("/my-shop", updateMyShop);

router.patch("/my-shop/status", updateShopStatus);

export default router;