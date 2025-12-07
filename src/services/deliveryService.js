import DeliveryModel from '../models/delivery.js';
import ApiError from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import OrderModel from '../models/order.js';
import Shipper from '../models/shipper.js';

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
  const shipperProfile = await Shipper.findOne({ user: shipperId });
  if (!shipperProfile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Hồ sơ tài xế không tồn tại.');
  }

  if (shipperProfile.status == 'OFFLINE') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn đang ở trạng thái OFFLINE, không thể nhận đơn.');
  }

  if (shipperProfile.status === 'SHIPPING') {
      // Check kỹ lại xem có đơn nào đang dang dở thật không?
      const currentJob = await DeliveryModel.findOne({
          shipperId: shipperId,
          status: { $in: ['ASSIGNED', 'PICKING_UP', 'DELIVERING'] }
      });

      if (currentJob) {
          // Nếu có đơn thật -> Chặn
          throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn đang giao một đơn khác, không thể nhận thêm!');
      } else {
          // Nếu không có đơn nào -> Dữ liệu bị ảo -> Tự động Reset về ONLINE
          console.warn(`⚠️ Phát hiện lỗi trạng thái Shipper ${shipperId}. Tự động Reset về ONLINE.`);
          shipperProfile.status = 'ONLINE';
          await shipperProfile.save();
          // Code sẽ chạy tiếp xuống dưới để nhận đơn này...
      }
  }
  const updatedDelivery = await DeliveryModel.findOneAndUpdate(
    { 
      _id: deliveryId, 
      status: 'SEARCHING' // ĐIỀU KIỆN QUAN TRỌNG: Chỉ nhận khi đang tìm
    },
    {
      $set: { status: 'ASSIGNED', shipperId: shipperId },
      $push: {
        trackingLogs: { status: 'ASSIGNED', updatedBy: shipperId, note: "Tài xế đã nhận đơn" }
      }
    },
    { new: true }
  );

  if (!updatedDelivery) {
    throw new ApiError(StatusCodes.CONFLICT, 'Đơn hàng đã có người nhận hoặc đã bị hủy!');
  }

  shipperProfile.status = 'SHIPPING';
    await shipperProfile.save();

  await OrderModel.findByIdAndUpdate(updatedDelivery.orderId, { 
      status: 'Confirmed' 
  });

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
    // 👇 SỬA DÒNG NÀY: Cho phép PICKING_UP update lại chính nó (cập nhật vị trí lúc đi lấy hàng)
    'PICKING_UP': ['PICKING_UP', 'DELIVERING'], 
      
    // 👇 SỬA DÒNG NÀY: Cho phép DELIVERING update lại chính nó (cập nhật vị trí lúc đi giao)
    'DELIVERING': ['DELIVERING', 'COMPLETED'],
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

  let orderStatus = '';
  switch (newStatus) {
      case 'PICKING_UP': 
          orderStatus = 'Preparing'; // Tài xế đang đến -> Quán đang chuẩn bị
          break;
      case 'DELIVERING': 
          orderStatus = 'Out for Delivery'; // Tài xế đã lấy hàng -> Đang giao
          break;
      case 'COMPLETED': 
          orderStatus = 'Delivered'; // Giao thành công
          // TODO: Nếu thanh toán tiền mặt (Cash), cập nhật luôn paymentStatus = 'Completed'
          break;
      case 'CANCELLED': 
          orderStatus = 'Canceled'; 
          break;
  }

  if (orderStatus) {
      await OrderModel.findByIdAndUpdate(delivery.orderId, { status: orderStatus });
  }

  if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
      await Shipper.findOneAndUpdate(
          { user: userId },
          { status: 'ONLINE' } // Quay về Online để nhận đơn mới
      );
  }

  return updatedDelivery;
};

const getCurrentDelivery = async (userId) => {
    // Tìm đơn nào của ông này mà chưa Xong (COMPLETED) và chưa Hủy (CANCELLED)
    const activeDelivery = await DeliveryModel.findOne({
        shipperId: userId,
        status: { $in: ['ASSIGNED', 'PICKING_UP', 'DELIVERING'] }
    })
    .populate('orderId'); // Populate để lấy chi tiết món ăn, giá tiền bên Order

    return activeDelivery; // Có thể trả về null nếu không có đơn nào
};

export const deliveryService = {
  createDelivery,
  getDeliveryById,
  assignShipper,
  updateStatus,
  getCurrentDelivery
};