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

const acceptDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // BẮT BUỘC: Lấy từ token đã verify
    const shipperId = req.user._id; 
    
    // Gọi service
    const result = await deliveryService.assignShipper(id, shipperId);
    const io = getIO();

    // TODO: Emit Socket cho khách hàng biết "Tài xế Nguyễn Văn A đã nhận đơn"
    // _io.to(result.orderId).emit('DELIVERY_UPDATED', result);

    io.to(result.orderId.toString()).emit('ORDER_STATUS_UPDATE', {
        status: 'Confirmed',
        shipperId: shipperId,
        message: 'Tài xế đã nhận đơn và đang đến quán!'
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Nhận đơn thành công!',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, location } = req.body; // location: { lat, lng }
    const userId = req.user._id;
    const io = getIO();

    const result = await deliveryService.updateStatus(id, status, userId, location);

    // TODO: Tại đây Emit Socket.io báo cho khách hàng biết
    // 🔥 SOCKET REALTIME:
    // 1. Nếu thay đổi trạng thái (VD: Đã lấy món) -> Báo khách cập nhật UI
    io.to(result.orderId.toString()).emit('ORDER_STATUS_UPDATE', {
        status: result.status, // PICKING_UP, DELIVERING...
        message: 'Trạng thái đơn hàng đã thay đổi'
    });

    // 2. Nếu có tọa độ mới -> Báo khách để vẽ lại icon xe máy
    if (location) {
        io.to(result.orderId.toString()).emit('SHIPPER_MOVED', location);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
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
  acceptDelivery,
  updateDeliveryStatus,
  getCurrentJob,
  getNearbyOrders
};