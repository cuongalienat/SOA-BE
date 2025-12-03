import { StatusCodes } from 'http-status-codes';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js'; 

export const errorHandlingMiddleware = (err, req, res, next) => {
  // --- FIX BUG LOGIC: ---
  // Không dùng { ...err } vì sẽ mất prototype của ApiError.
  // Gán trực tiếp để giữ reference, sau đó nếu cần thay đổi thì gán đè.
  let error = err;

  // --- BƯỚC 1: CHUẨN HÓA LỖI (MAPPING) ---
  
  // 1.1 Lỗi MongoDB: CastError (Sai ID)
  if (err.name === 'CastError') {
    const message = `Không tìm thấy tài nguyên với ID: ${err.value}`;
    error = new ApiError(StatusCodes.NOT_FOUND, message);
  }

  // 1.2 Lỗi MongoDB: Duplicate Key
  if (err.code === 11000) {
    const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Giá trị ${value} đã tồn tại trong hệ thống.`;
    error = new ApiError(StatusCodes.CONFLICT, message);
  }

  // 1.3 Lỗi Mongoose Validation
  if (err.name === 'ValidationError') {
    const message = 'Dữ liệu đầu vào không hợp lệ.';
    const errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message,
    }));
    error = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, message, errors);
  }

  // 1.4 Lỗi JWT
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(StatusCodes.UNAUTHORIZED, 'Token không hợp lệ.');
  }
  if (err.name === 'TokenExpiredError') {
    error = new ApiError(StatusCodes.UNAUTHORIZED, 'Phiên đăng nhập đã hết hạn.');
  }

  // --- BƯỚC 2: FINAL CHECK ---
  // Nếu sau khi map mà vẫn chưa phải ApiError (ví dụ lỗi code 500, syntax error...)
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Lỗi máy chủ nội bộ (Internal Server Error).';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  // --- BƯỚC 3: LOGGING THÔNG MINH ---
  
  const logData = {
    statusCode: error.statusCode,
    message: error.message,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    // userId: req.user?._id, // Nếu đã có user thì log thêm ID để biết ai bị lỗi
    stack: error.stack
  };

  if (process.env.BUILD_MODE === 'development') {
    logger.error(`${req.method} ${req.originalUrl} - ${error.statusCode} - ${error.message}`);
    // In stack trace ra console cho dev dễ nhìn
    if (error.statusCode >= 500) console.error(error.stack);
  } else {
    // Production: Log JSON đầy đủ
    logger.error('Error occurred', logData);
  }

  // --- BƯỚC 4: RESPONSE ---
  
  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    ...(process.env.BUILD_MODE === 'development' && { stack: error.stack }),
  };

  return res.status(error.statusCode).json(response);
};