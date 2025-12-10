/* File: src/utils/socket.js */
import { Server } from 'socket.io';

let io; // Biến private để lưu instance

// 1. Hàm khởi tạo (Chỉ gọi ở server.js)
export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Cấu hình CORS
            methods: ["GET", "POST"]
        }
    });
    return io;
};

// 2. Hàm lấy instance (Gọi ở Service/Controller)
export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io chưa được khởi tạo!");
    }
    return io;
};