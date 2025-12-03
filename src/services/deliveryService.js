import DeliveryModel from '../models/delivery.js';
import ApiError from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';

// 1. Tạo chuyến giao hàng mới (Thường được gọi khi Order vừa tạo xong)
const createDelivery = async (deliveryData) => {
  // Ở đây bạn có thể gọi Google Maps API để tính lại distance chính xác nếu cần
  const newDelivery = await DeliveryModel.create(deliveryData);
  return newDelivery;
};

// 2. Lấy chi tiết chuyến xe
const getDeliveryById = async (deliveryId) => {
  const delivery = await DeliveryModel.findById(deliveryId).lean();
  if (!delivery) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến giao hàng!');
  }
  return delivery;
};

// 3. Tài xế nhận đơn (Xử lý Concurrency - Race Condition)
const assignShipper = async (deliveryId, shipperId) => {
  const updatedDelivery = await DeliveryModel.findOneAndUpdate(
    { 
      _id: deliveryId, 
      status: 'SEARCHING' // ĐIỀU KIỆN QUAN TRỌNG: Chỉ nhận khi đang tìm
    },
    {
      $set: { status: 'ASSIGNED', shipperId: shipperId },
      $push: {
        trackingLogs: { status: 'ASSIGNED', updatedBy: shipperId }
      }
    },
    { new: true }
  );

  if (!updatedDelivery) {
    throw new ApiError(StatusCodes.CONFLICT, 'Đơn hàng đã có người nhận hoặc đã bị hủy!');
  }
  return updatedDelivery;
};

// 4. Cập nhật trạng thái (Shipper update: Đã lấy hàng / Đã giao)
const updateStatus = async (deliveryId, newStatus, userId, location) => {
  // 1. Lấy đơn hàng hiện tại
  const delivery = await DeliveryModel.findById(deliveryId);
  if (!delivery) throw new ApiError(StatusCodes.NOT_FOUND, 'Delivery not found');

  // 2. Validate State Transition (Quy tắc chuyển đổi trạng thái)
  const validTransitions = {
    'SEARCHING': ['ASSIGNED', 'CANCELLED'], // Admin hủy hoặc có người nhận
    'ASSIGNED': ['PICKING_UP', 'CANCELLED'], // Shipper hủy hoặc bắt đầu lấy hàng
    'PICKING_UP': ['DELIVERING'], // Lấy xong -> đi giao
    'DELIVERING': ['COMPLETED'],  // Giao xong
    'COMPLETED': [], // Kết thúc
    'CANCELLED': []
  };

  const allowedNextStatus = validTransitions[delivery.status];
  
  if (!allowedNextStatus || !allowedNextStatus.includes(newStatus)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST, 
      `Không thể chuyển trạng thái từ ${delivery.status} sang ${newStatus}`
    );
  }

  // 3. Update (Dùng logic cũ của bạn)
  const updatedDelivery = await DeliveryModel.findByIdAndUpdate(
    deliveryId,
    {
      $set: { status: newStatus },
      $push: {
        trackingLogs: { 
          status: newStatus, 
          updatedBy: userId, 
          location: location // location { lat, lng } sẽ được lưu nhờ sửa Schema ở bước 1
        }
      }
    },
    { new: true }
  );

  return updatedDelivery;
};

export const deliveryService = {
  createDelivery,
  getDeliveryById,
  assignShipper,
  updateStatus
};