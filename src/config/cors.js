import { StatusCodes } from "http-status-codes";
import ApiError from "../utils/ApiError.js";

// Danh sách domain được phép gọi API
const allowedOrigins = [
    "http://localhost:5173", // FE chạy local
];

export const corsOptions = {
    origin: function (origin, callback) {
        //  Cho phép gọi API khi dùng Postman hoặc FE local
        if (!origin) {
            return callback(null, true);
        }

        //  Kiểm tra domain có được phép không
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Nếu domain không hợp lệ
        return callback(
            new ApiError(
                StatusCodes.FORBIDDEN,
                `${origin} không được phép truy cập API (CORS Policy).`
            )
        );
    },

    credentials: true, // Cho phép gửi cookie/token
    optionsSuccessStatus: 200 // Một số trình duyệt cũ không hiểu 204
};