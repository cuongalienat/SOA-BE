import express from "express";
import { authMiddleware, isShopOwner } from "../../middlewares/authMiddlewares.js"; 
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

// 3. Lấy thông tin shop của chính mình (Cần đăng nhập)
router.get("/my-shop", authMiddleware, getMyShop); 

// 4. Update Shop (Cần đăng nhập + Phải là chủ shop)
// Dùng cả 2 middleware: check login -> check chủ sở hữu
router.put("/my-shop", authMiddleware, isShopOwner, updateMyShop);

// 5. Update trạng thái mở/đóng cửa
router.patch("/my-shop/status", authMiddleware, isShopOwner, updateShopStatus);

// 6. Lấy chi tiết thông tin một shop theo ID
router.get("/:id", getShopDetails);

export default router;