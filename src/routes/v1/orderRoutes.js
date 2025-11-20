import express from "express";
import {
    createNewOrder,
    getOrderDetails,
    getMyOrders,
    getRestaurantOrders,
    updateStatus,
    cancelMyOrder
} from "../controllers/orderController.js";

// Import middleware xác thực của bạn
import { authMiddleware, isAdmin, isRestaurant } from "../middlewares/authMiddleware.js";

const router = express.Router();

// --- NHÓM ROUTE CHO KHÁCH HÀNG (USER) ---

// 1. Tạo đơn hàng (Yêu cầu đăng nhập)
router.post("/", authMiddleware, createNewOrder);

// 2. Xem lịch sử mua hàng của bản thân
router.get("/myOrders", authMiddleware, getMyOrders);

// 3. Hủy đơn hàng của bản thân
router.patch("/:id/cancel", authMiddleware, cancelMyOrder);

// 4. Xem danh sách đơn hàng của quán (Cần đăng nhập + Role Restaurant)
router.get("/manage", authMiddleware, isRestaurant, getRestaurantOrders);

// 5. Cập nhật trạng thái đơn (Nhận đơn, Giao hàng...)
router.patch("/:id/status", authMiddleware, isShipper, updateStatus);

// 6. Xem chi tiết đơn hàng 
router.get("/:id", authMiddleware, getOrderDetails);

export default router;