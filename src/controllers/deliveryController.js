import { deliveryService } from '../services/deliveryService.js';
import { StatusCodes } from 'http-status-codes';
import { getIO } from '../utils/socket.js';
import { getDistance } from '../services/goongServices.js';
const etaCache = new Map(); // Lưu trữ: { deliveryId: { lastCall: timestamp, data: ... } }
const CALL_LIMIT_MS = 60 * 1000;

const createNewDelivery = async (req, res, next) => {
  try {
    // Validate req.body ở đây (dùng Joi/Zod) trước khi gọi service
    const result = await deliveryService.createDelivery(req.body);
    
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo chuyến giao hàng thành công',
      data: result
    });
  } catch (error) {
    next(error); // Chuyển lỗi sang middleware xử lý lỗi tập trung
  }
};

const getDeliveryDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deliveryService.getDeliveryById(id);
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
export const updateDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, location } = req.body;
    const userId = req.user._id;

    if (!status) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng gửi trạng thái cần cập nhật (status)');
    }

    let result;
    let message = '';

    // --- LOGIC ĐIỀU HƯỚNG ---
    if (status === 'ASSIGNED') {
      result = await deliveryService.assignShipper(id, userId, location);
      message = 'Nhận đơn hàng thành công!';
    } else {
      result = await deliveryService.updateStatus(id, status, userId, location);
      message = 'Cập nhật trạng thái đơn hàng thành công';

      // 👇👇👇 FIX LỖI MẤT XE Ở ĐÂY 👇👇👇
      if (location && result) {
        try {
          const io = getIO();
          
          // 1. Lấy Order ID an toàn (như code cũ)
          const orderId = result.orderId._id ? result.orderId._id.toString() : result.orderId.toString();

          // 2. Khai báo biến ETA mặc định (null)
          let etaText = null;
          let distanceText = null;

          // 3. KIỂM TRA AN TOÀN TRƯỚC KHI TRUY CẬP DROPOFF
          // Chỉ tính ETA nếu có thông tin dropoff (đã populate)
          const dropoffData = result.orderId?.dropoff || result.dropoff; // Fallback nếu cấu trúc khác
          
          if (dropoffData && dropoffData.location && dropoffData.location.coordinates) {
             
              // --- LOGIC CACHE & GOONG API ---
              const now = Date.now();
              const cachedData = etaCache.get(id);
              const CACHE_DURATION = 3000;

              const shouldCallApi = !cachedData || (now - cachedData.lastCall > CACHE_DURATION); 
              if (shouldCallApi) {
                  try {
                      const destLat = dropoffData.location.coordinates[1];
                      const destLng = dropoffData.location.coordinates[0];
                      const originStr = `${location.lat},${location.lng}`;
                      const destStr = `${destLat},${destLng}`;

                      // Gọi API (Bọc try-catch riêng để nếu lỗi API cũng không mất xe)
                      const matrixData = await getDistance(originStr, destStr);
                      
                      if (matrixData) {
                          etaText = matrixData.durationText;
                          distanceText = matrixData.distanceText;
                          
                          // Set Cache
                          etaCache.set(id, {
                              lastCall: now,
                              data: { etaText, distanceText }
                          });
                      }
                  } catch (apiError) {
                      console.error("⚠️ Lỗi gọi Goong API:", apiError.message);
                      // Không làm gì cả, etaText vẫn là null
                  }
              } else {
                  // Dùng Cache
                  console.log("⚡ Using Cached ETA");
                  etaText = cachedData.data.etaText;
                  distanceText = cachedData.data.distanceText;
              }
          } else {
              // Debug: In ra để biết tại sao không tính được ETA (thường do chưa populate)
              // console.warn("⚠️ Order chưa populate dropoff, bỏ qua tính ETA, chỉ gửi vị trí.");
          }

          // 4. BẮN SOCKET (QUAN TRỌNG: Luôn chạy dù có ETA hay không)
          const payload = {
            lat: location.lat,
            lng: location.lng,
            deliveryId: id,
            etaText: etaText,       // Có thể null
            distanceText: distanceText // Có thể null
          };

          io.to(orderId).emit('SHIPPER_MOVED', payload);
          io.to(`order:${orderId}`).emit('SHIPPER_MOVED', payload);
          
          // console.log(`📡 Socket sent: Lat ${location.lat} - ETA: ${etaText || 'N/A'}`);

        } catch (socketErr) {
          console.error("⚠️ Lỗi Socket Wrapper:", socketErr.message);
        }
      }
    }

    const io = getIO();
    const orderId = result.orderId._id
      ? result.orderId._id.toString()
      : result.orderId.toString();

    if (status === 'COMPLETED') {
      io.to(`order:${orderId}`).emit('ORDER_STATUS_UPDATE', {
        deliveryId: id,
        status: 'COMPLETED'
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: message,
      data: result
    });

  } catch (error) {
    next(error);
  }
};

// sửa để ghép đơn
const getCurrentJob = async (req, res, next) => {
    try {
        const userId = req.user._id;
        
        // 1. Khai báo biến activeDeliveries
        const activeDeliveries = await deliveryService.getActiveDeliveries(userId);

        // 2. Kiểm tra biến activeDeliveries
        if (!activeDeliveries || activeDeliveries.length === 0) {
            return res.status(StatusCodes.OK).json({
                success: true,
                message: "Bạn đang rảnh, chưa nhận đơn nào.",
                data: [] 
            });
        }

        // 3. Trả về biến activeDeliveries
        res.status(StatusCodes.OK).json({
            success: true,
            message: `Đang có ${activeDeliveries.length} đơn hàng cần xử lý!`,
            data: activeDeliveries
        });
    } catch (error) {
        next(error);
    }
};

const getNearbyOrders = async (req, res, next) => {
    try {
        const userId = req.user._id; // Lấy ID từ token của Shipper
        
        // Gọi service (Hàm này bạn vừa viết ở bước trước)
        const orders = await deliveryService.getNearbyDeliveries(userId);
        
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Lấy danh sách đơn hàng thành công",
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

export const deliveryController = {
  createNewDelivery,
  getDeliveryDetails,
  updateDelivery,
  getCurrentJob,
  getNearbyOrders,
};