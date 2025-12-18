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
      // Các trạng thái hợp lệ: PICKING_UP, DELIVERING, COMPLETED, CANCELLED
      // Gọi service update thông thường
      result = await deliveryService.updateStatus(id, status, userId, location);
      message = 'Cập nhật trạng thái đơn hàng thành công';
      
      // TODO: Emit Socket.io ở đây để báo cho khách hàng
      if (req.io) {
          req.io.to(`order:${result.orderId.toString()}`).emit('DELIVERY_UPDATED', result);
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