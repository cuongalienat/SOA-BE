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
        socket.join(`order:${orderId}`);
    });

    // 👇 1. QUAN TRỌNG: Lắng nghe sự kiện Join Room chung
    // Frontend Shop sẽ gửi: socket.emit('JOIN_ROOM', 'shop_12345')
    // Frontend Shipper sẽ gửi: socket.emit('JOIN_ROOM', 'shipper_67890')
    // socket.on('JOIN_ROOM', (roomName) => {
    //     socket.join(roomName);
    //     console.log(`Socket ${socket.id} joined room: ${roomName}`);
    // });
    
    // Logic cũ: Cập nhật vị trí xe
    socket.on('UPDATE_LOCATION', (data) => {
        const { orderId, lat, lng } = data;
        io.to(`order:${orderId}`).emit('SHIPPER_MOVED', { lat, lng });
    });
    
    // 👇 THÊM LOGIC MỚI: Để tìm Shipper
    // Khi shipper login, frontend shipper sẽ gửi userId lên để server biết socket.id nào là của ông nào
    const { userId, role, shopId } = socket.handshake.query;
    if (userId) {
      // 1. CHUẨN HÓA TÊN ROOM: Luôn dùng prefix "user:"
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
      console.log(`✅ User ${userId} joined room: [${userRoom}]`);

      // 2. Phân loại Role để join room chức năng
      if (role === 'shipper' || role === 'driver') {
        // NẾU em muốn thông báo cho "Tất cả shipper", hãy đặt tên là 'role:shippers' (không có Id)
        // NẾU em muốn thông báo riêng cho shipper đó -> Dùng `user:${userId}` là đủ.
        socket.join('role:shippers');
        console.log(`🛵 Shipper joined fleet room: [role:shippers]`);
      }
      
      if (role === 'restaurant_manager') {
        if (shopId && shopId !== 'undefined') { // Check kỹ vì query param đôi khi gửi string "undefined"
            const shopRoom = `shop:${shopId}`;
            socket.join(shopRoom);
            console.log(`🏪 Shop Owner joined room: [${shopRoom}]`);
        } else {
            console.warn(`⚠️ Manager ${userId} connected but NO SHOP_ID provided!`);
        }
    }
    }
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


