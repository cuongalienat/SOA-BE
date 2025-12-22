import { deliveryService } from '../services/deliveryService.js';
import { StatusCodes } from 'http-status-codes';
import { getIO } from '../utils/socket.js';
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
    const { status, location } = req.body; // Lấy dữ liệu từ body
    const userId = req.user._id;           // Lấy ID shipper từ Token

    if (!status) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng gửi trạng thái cần cập nhật (status)');
    }

    let result;
    let message = '';

    // --- LOGIC ĐIỀU HƯỚNG (DISPATCHER) ---

    // TRƯỜNG HỢP 1: Tài xế muốn NHẬN ĐƠN
    if (status === 'ASSIGNED') {
      // Gọi service xử lý tranh chấp (Race Condition)
      result = await deliveryService.assignShipper(id, userId, location);
      message = 'Nhận đơn hàng thành công!';
    } 
    
    // TRƯỜNG HỢP 2: Tài xế cập nhật hành trình (Đang lấy hàng, Đang giao...)
    else {
      result = await deliveryService.updateStatus(id, status, userId, location);
      message = 'Cập nhật trạng thái đơn hàng thành công';
      
      // 👇 SỬA ĐOẠN NÀY
      if (location && result) {
          try {
              const io = getIO(); 
              
              // 1. Lấy Order ID chuẩn
              const orderId = result.orderId._id ? result.orderId._id.toString() : result.orderId.toString();

              // 2. Payload dữ liệu
              const payload = {
                  lat: location.lat,
                  lng: location.lng,
                  deliveryId: id
              };

              // 3. BẮN SOCKET (Fix lệch room)
              // Bắn vào Room Raw (đề phòng Frontend join raw)
              io.to(orderId).emit('SHIPPER_MOVED', payload);
              
              // Bắn thêm vào Room có prefix 'order:' (đề phòng Frontend join prefix)
              io.to(`order:${orderId}`).emit('SHIPPER_MOVED', payload);
              
              console.log(`📡 [Socket] Đã bắn vị trí tới room ${orderId} và order:${orderId}`);

          } catch (socketErr) {
              console.error("⚠️ Lỗi Socket:", socketErr.message);
          }
      }
    }

    // Trả về kết quả
    res.status(StatusCodes.OK).json({
      success: true,
      message: message,
      data: result
    });

  } catch (error) {
    next(error);
  }
};

const getCurrentJob = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const delivery = await deliveryService.getCurrentDelivery(userId);

        if (!delivery) {
            return res.status(StatusCodes.OK).json({
                success: true,
                message: "Bạn đang rảnh, chưa nhận đơn nào.",
                data: null
            });
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Đang có đơn hàng cần xử lý!",
            data: delivery
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