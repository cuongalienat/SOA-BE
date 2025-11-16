// middlewares/authMiddleware.js
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

export const isShopOwner = (req, res, next) => {
    // Giả sử authMiddleware đã giải mã token và gắn user vào req
    if (req.user && req.user.role === 'shop') {
        next();
    } else {
        res.status(403).json({ message: "Forbidden: Access is allowed for shop owners only." });
    }
};