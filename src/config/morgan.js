// src/config/morgan.js
import morgan from 'morgan';
import logger from './logger.js';

// Custom format để lấy message response time
const morganFormat = ':method :url :status :response-time ms - :res[content-length]';

export const morganMiddleware = morgan(morganFormat, {
  stream: {
    // Dùng logger của winston để ghi log thay vì console.log
    write: (message) => {
      const logObject = {
        method: message.split(' ')[0],
        url: message.split(' ')[1],
        status: message.split(' ')[2],
        responseTime: message.split(' ')[3],
      };
      logger.info('HTTP Access Log', logObject);
    },
  },
  // Chỉ skip log ở môi trường test hoặc các file static nếu muốn
  // skip: (req, res) => process.env.NODE_ENV === 'test',
});