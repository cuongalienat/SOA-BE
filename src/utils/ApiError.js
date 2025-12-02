/**
 * src/utils/ApiError.js
 * Class tùy chỉnh để chuẩn hóa các lỗi trong hệ thống
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = [], stack = '') {
    super(message);
    
    this.statusCode = statusCode;
    // Mảng chứa chi tiết lỗi (VD: lỗi từng field validation)
    this.errors = errors; 
    // Nếu là lỗi 4xx thì là 'fail', 5xx thì là 'error'
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // isOperational = true: Lỗi đã dự tính (Validation, Not Found...). 
    // isOperational = false: Lỗi lập trình (Syntax, Null pointer...).
    this.isOperational = true; 

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;