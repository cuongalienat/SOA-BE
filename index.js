import express from 'express'
import cors from 'cors'
import { env } from './src/config/environment.js'
import { corsOptions } from './src/config/cors.js'
import connectDB from './src/config/db.js'
import { APIs_v1 } from './src/routes/v1/index.js'
import { errorHandlingMiddleware } from './src/middlewares/errorHandlingMiddleware.js'
import { morganMiddleware } from './src/config/morgan.js';
import http from 'http'
import { initSocket } from './src/utils/socket.js'


const app = express()
const server = http.createServer(app);

const io = initSocket(server);

// Morgan 
app.use(morganMiddleware);

app.use(express.json())
app.use(cors(corsOptions))

app.use((req, res, next) => {
    req.io = io;
    next();
});

io.on('connection', (socket) => {
    console.log(`⚡ User Connected: ${socket.id}`);

    // Logic cũ: Join room đơn hàng
    socket.on('JOIN_ORDER_ROOM', (orderId) => {
        socket.join(orderId);
    });

    // Logic cũ: Cập nhật vị trí xe
    socket.on('UPDATE_LOCATION', (data) => {
        const { orderId, lat, lng } = data;
        io.to(orderId).emit('SHIPPER_MOVED', { lat, lng });
    });
    
    // 👇 THÊM LOGIC MỚI: Để tìm Shipper
    // Khi shipper login, frontend shipper sẽ gửi userId lên để server biết socket.id nào là của ông nào
    const userId = socket.handshake.query.userId;
    if (userId) {
        socket.join(userId); // Shipper vào phòng riêng của mình
    }
        
        // console.log(`Shipper moved in ${orderId}: [${lat}, ${lng}]`);

    //C. Noti nhận đơn
    socket.on('REGISTER_SOCKET', (data) => {
        // data: { userId: "65a...", role: "shipper" }
        const { userId, role } = data;

        // 1. Join vào phòng riêng của user (để nhận noti cá nhân)
        const userRoom = `user_${userId}`;
        socket.join(userRoom);
        // console.log(`Socket ${socket.id} joined ${userRoom}`);

        // 2. Nếu là Shipper, join vào phòng chung để săn đơn
        if (role === 'driver') {
            socket.join('SHIPPERS_NEARBY');
            // console.log(`Shipper ${userId} ready to receive orders`);
        }
    });

    socket.on('disconnect', () => {
        // console.log('User Disconnected', socket.id);
    });
});

app.use('/v1', APIs_v1)
connectDB()

app.get('/', (req, res) => {
    res.status(200).json({ message: 'SOA Backend API' })
})

app.use(errorHandlingMiddleware);

// 6. QUAN TRỌNG: Thay app.listen bằng server.listen
server.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
    console.log(`🚀 Server & Socket running on http://${env.LOCAL_DEV_APP_HOST}:${env.LOCAL_DEV_APP_PORT}`)
})


