import express from 'express'
import cors from 'cors'
import { env } from './src/config/environment.js'
import { corsOptions } from './src/config/cors.js'
import connectDB from './src/config/db.js'
import { APIs_v1 } from './src/routes/v1/index.js'
import { errorHandlingMiddleware } from './src/middlewares/errorHandlingMiddleware.js'
import { morganMiddleware } from './src/config/morgan.js';
import { Server } from 'socket.io' 
import http from 'http'


const app = express()
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        // Cho phép Frontend kết nối (trong dev để * cho tiện, production nên set domain cụ thể)
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Morgan 
app.use(morganMiddleware);

app.use(express.json())
app.use(cors(corsOptions))

io.on('connection', (socket) => {
    console.log(`⚡ User Connected: ${socket.id}`);

    // A. Shipper/Khách join vào phòng của Đơn hàng (orderId)
    socket.on('JOIN_ORDER_ROOM', (orderId) => {
        socket.join(orderId);
        console.log(`User ${socket.id} joined room: ${orderId}`);
    });

    // B. Shipper gửi tọa độ -> Server bắn lại cho Khách
    socket.on('UPDATE_LOCATION', (data) => {
        // data: { orderId, lat, lng }
        const { orderId, lat, lng } = data;
        
        // Gửi sự kiện 'SHIPPER_MOVED' cho tất cả người trong phòng orderId
        io.to(orderId).emit('SHIPPER_MOVED', { lat, lng });
        
        // console.log(`Shipper moved in ${orderId}: [${lat}, ${lng}]`);
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

export { io };

