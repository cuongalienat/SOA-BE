import express from "express";
import {
    createOrder,
    getOrderDetails,
    getOrders,
    getRestaurantOrders,
    updateStatus,
    cancelOrder
} from "../../controllers/orderControllers.js";

// Import middleware xác thực của bạn
import { authMiddleware, isShipper, isRestaurant } from "../../middlewares/authMiddlewares.js";

const router = express.Router();

// --- NHÓM ROUTE CHO KHÁCH HÀNG (USER) ---

// 1. Tạo đơn hàng (Yêu cầu đăng nhập)
router.post("/", authMiddleware, createOrder);

// 2. Xem lịch sử mua hàng của bản thân
router.get("/myOrders", authMiddleware, getOrders);

// 3. Hủy đơn hàng của bản thân
router.patch("/:id/cancel", authMiddleware, cancelOrder);

// 4. Xem danh sách đơn hàng của quán (Cần đăng nhập + Role Restaurant)
router.get("/manage", authMiddleware, isRestaurant, getRestaurantOrders);

// 5. Cập nhật trạng thái đơn (Nhận đơn, Giao hàng...) 
router.patch("/:id/status", authMiddleware, updateStatus); // phân quyền bên trong controller

// 6. Xem chi tiết đơn hàng 
router.get("/:id", authMiddleware, getOrderDetails);

export default router;