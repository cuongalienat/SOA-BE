// SOA-BE/src/middlewares/errorHandlingMiddleware.js
import { StatusCodes } from 'http-status-codes';

export const errorHandlingMiddleware = (err, req, res, next) => {
    // Ghi log lỗi ra console để debug trong môi trường phát triển
    if (process.env.BUILD_MODE !== 'production') {
        console.error(err.stack);
    }

    const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const message = err.message || 'Lỗi hệ thống';

    // Xử lý các lỗi cụ thể từ Mongoose
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        const errorMessage = `Dữ liệu không hợp lệ: ${errors.join('. ')}`;
        // Ghi đè statusCode và message cho lỗi validation
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: errorMessage,
            stack: process.env.BUILD_MODE === 'production' ? null : err.stack // Chỉ hiện stack trace khi dev
        });
    }
    
    // Trả về phản hồi lỗi có cấu trúc
    res.status(statusCode).json({
        success: false,
        message: message,
        stack: process.env.BUILD_MODE === 'production' ? null : err.stack
    });
};