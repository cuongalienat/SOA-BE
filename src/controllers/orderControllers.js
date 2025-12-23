import orderService from "../services/orderServices.js";
import ApiError from "../utils/ApiError.js"; // Import class lỗi tùy chỉnh
import { StatusCodes } from "http-status-codes"; // (Tuỳ chọn) Dùng thư viện này cho code clean hơn, hoặc dùng số 200, 201...


// 1. Tạo đơn hàng mới
export const createOrder = async (req, res, next) => {
    try {
        // Lấy ID người dùng từ token (đã qua middleware auth)
        const userId = req.user._id;
        // console.log("Customer ID from token:", userId);
        // Gọi service

        const shopId = req.body.shopId || req.body.restaurantId;
        const newOrder = await orderService.createOrderService({
            userId,
            shopId,
            ...req.body,
        });

        res.status(201).json({
            success: true,
            message: "Đặt hàng thành công!",
            data: newOrder
        });
    } catch (error) {
        // Chuyển lỗi xuống Middleware xử lý lỗi trung gian (nơi dùng ApiError)
        next(error);
    }
};

// 2. Lấy chi tiết một đơn hàng
export const getOrderDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await orderService.getOrderByIdService(id);

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        next(error);
    }
};

// 3. Lấy danh sách đơn hàng của Khách hàng (Lịch sử mua hàng)
export const getOrders = async (req, res, next) => {
    try {
        const { page, limit, status } = req.query;
        const userId = req.user._id;

        // Tạo bộ lọc
        const filter = { user: userId };
        if (status) {
            filter.status = status;
        }

        const result = await orderService.getOrdersService(filter, page, limit);

        res.status(200).json({
            success: true,
            message: "Lấy danh sách đơn hàng thành công",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// 4. Lấy danh sách đơn hàng cho Nhà hàng (Quản lý đơn)
export const getRestaurantOrders = async (req, res, next) => {
    try {
        const { page, limit, status } = req.query;
        // Giả sử User model của Restaurant Owner có field restaurantId
        // Hoặc frontend gửi restaurantId lên nếu 1 user quản lý nhiều quán
        const restaurantId = req.user.restaurantId || req.query.restaurantId;

        if (!restaurantId) {
            throw new ApiError(400, "Thiếu thông tin nhà hàng.");
        }

        const filter = { shop: restaurantId };
        if (status) {
            filter.status = status;
        }

        const result = await orderService.getOrdersService(filter, page, limit);

        res.status(200).json({
            success: true,
            message: "Lấy danh sách đơn hàng của quán thành công",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// 5. Cập nhật trạng thái đơn hàng
export const updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const currentUser = req.user;
        const io = req.io; // Lấy socket từ middleware

        // Controller chỉ việc gọi Service và truyền tham số (id, status, io)
        const updatedOrder = await orderService.updateOrderStatusService(id, status, currentUser, io);

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Cập nhật trạng thái thành công",
            data: updatedOrder
        });
    } catch (error) {
        next(error);
    }
};

// 6. Hủy đơn hàng (Dành cho khách hàng)
export const cancelOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id.toString();
        const io = req.io;
        const canceledOrder = await orderService.cancelOrderService(id, userId);

        if (io && canceledOrder.shop) {
            io.to(`shop:${canceledOrder.shop}`).emit('ORDER_CANCELLED', {
                orderId: id,
                msg: "Khách hàng đã hủy đơn!"
            });
        }

        res.status(200).json({
            success: true,
            message: "Hủy đơn hàng thành công",
            data: canceledOrder
        });
    } catch (error) {
        next(error);
    }
};