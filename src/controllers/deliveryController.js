import { deliveryService } from '../services/deliveryService.js';
import { StatusCodes } from 'http-status-codes';

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

    // TODO: Emit Socket cho khách hàng biết "Tài xế Nguyễn Văn A đã nhận đơn"
    // _io.to(result.orderId).emit('DELIVERY_UPDATED', result);

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
    // const userId = req.user._id;
    const { userId } = req.body; // Demo tạm

    const result = await deliveryService.updateStatus(id, status, userId, location);

    // TODO: Tại đây Emit Socket.io báo cho khách hàng biết

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deliveryController = {
  createNewDelivery,
  getDeliveryDetails,
  acceptDelivery,
  updateDeliveryStatus
};