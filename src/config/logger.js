import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

// Lấy thư mục gốc của dự án một cách an toàn
const logDirectory = path.join(process.cwd(), 'logs');

const { combine, timestamp, json, printf, colorize, align, errors } = winston.format;

// Format Console: Thêm màu sắc và stack trace nếu có
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  align(),
  printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  // Thêm format errors({ stack: true }) để winston tự động lấy stack trace khi log object Error
  format: combine(
    errors({ stack: true }), 
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      dirname: logDirectory, // Dùng đường dẫn tuyệt đối
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
    new winston.transports.DailyRotateFile({
      dirname: logDirectory,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d', // Giữ log lỗi lâu hơn (30 ngày)
    }),
  ],
});

if (process.env.BUILD_MODE !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

export default logger;