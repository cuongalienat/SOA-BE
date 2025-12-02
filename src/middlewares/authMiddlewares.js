import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) throw new ApiError(401, "Chưa đăng nhập");

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        req.user = user;
        next();
    } catch (err) {
        if (err.name === "JsonWebTokenError") {
            return next(new ApiError(403, "Token không hợp lệ"));
        }
        if (err.name === "TokenExpiredError") {
            return next(new ApiError(401, "Token đã hết hạn"));
        }
        next(err);
    }
};

export const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return next(new ApiError(403, "Bạn không có quyền admin"));
    }
    next();
};

export const isRestaurant = (req, res, next) => {
    if (req.user.role !== "restaurant_manager" && req.user.role !== "admin") {
        return next(new ApiError(403, "Yêu cầu quyền tài khoản nhà hàng"));
    }
    next();
};

export const isShipper = (req, res, next) => {
    if (req.user.role !== "driver" && req.user.role !== "admin") {
        return next(new ApiError(403, "Yêu cầu quyền tài khoản người giao hàng"));
    }
    next();
};

export const isShopOwner = (req, res, next) => {
    // authMiddleware chạy trước nên ta đã có req.user
    if (req.user && (req.user.role === 'restaurant_manager' || req.user.role === 'admin')) {
        next(); // Cho qua
    } else {
        res.status(403).json({ message: 'Truy cập bị từ chối! Bạn không phải là Chủ quán.' });
    }
};