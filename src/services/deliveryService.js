import DeliveryModel from '../models/delivery.js';
import OrderModel from '../models/order.js';
import User from '../models/user.js';
import Shipper from '../models/shipper.js'; // 👈 QUAN TRỌNG: Model Shipper riêng
import ApiError from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { calculateDistance } from '../utils/mapUtils.js';
import { findNearbyShippers } from "./shipperServices.js";
import { env } from "../config/environment.js";

// 1. Tạo chuyến giao hàng mới (Basic)
const createDelivery = async (deliveryData) => {
  return await DeliveryModel.create(deliveryData);
};

// 2. Lấy chi tiết chuyến xe
const getDeliveryById = async (deliveryId) => {
  const delivery = await DeliveryModel.findById(deliveryId).lean();
  if (!delivery) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến giao hàng!');
  return delivery;
};

// ============================================================
// 3. TÀI XẾ NHẬN ĐƠN (Kiến trúc 2 Model: User + Shipper)
// ============================================================
const assignShipper = async (deliveryId, userId, location) => {
  // userId: Lấy từ req.user._id (Token)

  // A. Tìm hồ sơ trong bảng Shipper (Không tìm trong User)
  const shipperProfile = await Shipper.findOne({ user: userId });
  
  if (!shipperProfile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bạn chưa đăng ký hồ sơ tài xế (Xe/Biển số).');
  }

  // B. Kiểm tra trạng thái (Trên bảng Shipper)
  if (shipperProfile.status === 'OFFLINE') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn đang OFFLINE. Vui lòng bật trực tuyến!');
  }

  // C. Self-Healing: Kiểm tra nếu đang kẹt đơn
  if (shipperProfile.status === 'SHIPPING') {
      const currentJob = await DeliveryModel.findOne({
        shipperId: userId, // Delivery vẫn lưu UserID để dễ populate
        status: { $in: ['ASSIGNED', 'PICKING_UP', 'DELIVERING'] }
      });

      if (currentJob) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn đang có đơn hàng chưa hoàn thành!');
      } else {
        // Tự sửa lỗi trạng thái ảo
        console.warn(`⚠️ Auto-fixing status for shipper ${userId}`);
        shipperProfile.status = 'ONLINE';
        await shipperProfile.save();
      }
  }

  // D. ATOMIC UPDATE (Khóa đơn & Lưu vị trí lúc nhận)
  const updatedDelivery = await DeliveryModel.findOneAndUpdate(
    {
      _id: deliveryId,
      status: 'SEARCHING' // 🔒 Chốt chặn: Chỉ nhận nếu đơn đang tìm
    },
    {
      $set: { 
          status: 'ASSIGNED', 
          shipperId: userId // Lưu UserID
      },
      $push: {
        trackingLogs: { 
            status: 'ASSIGNED', 
            updatedBy: userId, 
            location: location, // 📍 Lưu tọa độ GPS lúc bấm nút nhận
            note: "Tài xế đã nhận đơn" 
        }
      }
    },
    { new: true }
  );

  if (!updatedDelivery) {
    throw new ApiError(StatusCodes.CONFLICT, 'Chậm tay rồi! Đơn hàng đã có người khác nhận.');
  }

  // E. Cập nhật trạng thái Shipper -> BẬN
  shipperProfile.status = 'SHIPPING';
  await shipperProfile.save();

  // F. Cập nhật Order (Để User biết ai ship)
  await OrderModel.findByIdAndUpdate(updatedDelivery.orderId, {
    shipper: userId, // Gán UserID
    // status: 'Confirmed' // Giữ nguyên Confirmed hoặc update tùy flow
  });

  return updatedDelivery;
};

// ============================================================
// 4. CẬP NHẬT TRẠNG THÁI (Lấy hàng -> Giao hàng)
// ============================================================
const updateStatus = async (deliveryId, newStatus, userId, location) => {
  const delivery = await DeliveryModel.findById(deliveryId);
  if (!delivery) throw new ApiError(StatusCodes.NOT_FOUND, 'Delivery not found');

  // Validate luồng trạng thái
  const validTransitions = {
    'SEARCHING': ['ASSIGNED', 'CANCELLED'],
    'ASSIGNED': ['PICKING_UP', 'CANCELLED'],
    'PICKING_UP': ['PICKING_UP', 'DELIVERING'], // Cho phép update vị trí
    'DELIVERING': ['DELIVERING', 'COMPLETED'],  // Cho phép update vị trí
    'COMPLETED': [],
    'CANCELLED': []
  };

  if (!validTransitions[delivery.status]?.includes(newStatus)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Không thể chuyển từ ${delivery.status} sang ${newStatus}`);
  }

  const updateData = {
      $set: { status: newStatus },
      $push: {
        trackingLogs: {
          status: newStatus,
          updatedBy: userId,
          location: location,
          timestamp: new Date()
        }
      }
  };

  if (location) {
      updateData.$set.currentShipperLocation = {
          type: 'Point',
          coordinates: [location.lng, location.lat] // GeoJSON: [Lng, Lat]
      };
  }

  const updatedDelivery = await DeliveryModel.findByIdAndUpdate(
    deliveryId,
    updateData,
    { new: true }
  ).populate('orderId');

  // Đồng bộ trạng thái sang Order
  let orderStatus = '';
  switch (newStatus) {
    case 'PICKING_UP': orderStatus = 'Preparing'; break;
    case 'DELIVERING': orderStatus = 'Shipping'; break; 
    case 'COMPLETED': orderStatus = 'Delivered'; break;
    case 'CANCELLED': orderStatus = 'Pending'; break;
  }

  if (orderStatus) {
    await OrderModel.findByIdAndUpdate(delivery.orderId, { status: orderStatus });
  }

  // Nếu hoàn thành hoặc hủy -> Giải phóng tài xế về ONLINE
  if (['COMPLETED', 'CANCELLED'].includes(newStatus)) {
    // ⚠️ Update bảng Shipper, không phải User
    await Shipper.findOneAndUpdate(
        { user: userId },
        { status: 'ONLINE' }
    );
  }

  return updatedDelivery;
};

// 5. Lấy đơn hiện tại của Shipper
const getCurrentDelivery = async (userId) => {
  return await DeliveryModel.findOne({
    shipperId: userId,
    status: { $in: ['ASSIGNED','PICKING_UP', 'DELIVERING'] }
  }).populate('orderId'); 
};

// 6. Shipper tìm đơn quanh mình (Polling)
export const getNearbyDeliveries = async (userId, radius = 50000) => {
    // Tìm profile trong bảng Shipper để lấy tọa độ
    const shipperProfile = await Shipper.findOne({ user: userId });
    if (!shipperProfile) throw new ApiError(404, "Chưa đăng ký hồ sơ Shipper");

    // Query GeoSpatial dựa trên tọa độ của Shipper
    return await DeliveryModel.find({
        status: 'SEARCHING',
        'pickup.location': {
            $near: {
                $geometry: {
                    type: "Point",
                    // 👇 Lấy từ shipperProfile.currentLocation
                    coordinates: shipperProfile.currentLocation.coordinates 
                },
                $maxDistance: radius
            }
        }
    }).sort({ createdAt: -1 });
};

// ============================================================
// 7. TẠO DELIVERY + TÌM TÀI XẾ (Có Socket & Goong)
// ============================================================
export const createDeliveryForOrder = async (fullOrder, io) => {
    const shop = fullOrder.shop;
    const user = fullOrder.user;

  if (!fullOrder.customerLocation || fullOrder.customerLocation.lat == null || fullOrder.customerLocation.lng == null) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Thiếu toạ độ giao hàng (customerLocation).');
  }
    
    // A. Tính khoảng cách thực tế (Nếu có hàm calculateDistance)
    let finalDistance = fullOrder.distance || 1000;
    try {
        // Nếu em muốn dùng Goong API, uncomment đoạn này và đảm bảo hàm chạy đúng
        /*
        const routingData = await calculateDistance(
            shop.location.coordinates, 
            fullOrder.deliveryLocation.coordinates
        );
        if(routingData?.distance) finalDistance = routingData.distance;
        */
    } catch (e) {
        console.warn("Lỗi tính distance, dùng mặc định");
    }

    // B. Tạo Delivery Record
    const now = Date.now();
    const matchingTtlMs = (env.DELIVERY_MATCH_TTL_SECONDS || 240) * 1000;

    const newDelivery = await DeliveryModel.create({
        orderId: fullOrder._id,
        pickup: {
            name: shop.name,
            address: shop.address,
        phones: [shop.phones?.[0] || 'N/A'],
            location: shop.location // Shop model có GeoJSON
        },
        dropoff: {
            name: user?.fullName || "Khách hàng",
            address: fullOrder.address,
            phone: fullOrder.contactPhone,
            location: {
                type: 'Point',
                // Quan trọng: Mongo GeoJSON là [Lng, Lat]
                // Lấy từ customerLocation trong Order
                coordinates: [fullOrder.customerLocation.lng, fullOrder.customerLocation.lat]
            }
        },
        distance: finalDistance,
        shippingFee: fullOrder.shippingFee,
        estimatedDuration: fullOrder.estimatedDuration,
        status: 'SEARCHING',
        matchDeadline: new Date(now + matchingTtlMs),
        matchAttempts: 1,
        trackingLogs: [{ status: 'SEARCHING', note: 'Đang tìm tài xế...' }]
    });

    // C. Bắn Socket tìm tài xế
    if (io) {
        try {
            // Tìm các tài xế trong bảng Shipper
            // Hàm này em viết trong shipperServices.js, phải query bảng Shipper
            const availableShippers = await findNearbyShippers(shop.location.coordinates, 50000);

            if (availableShippers && availableShippers.length > 0) {
                const socketPayload = {
                    deliveryId: newDelivery._id,
                    shippingFee: newDelivery.shippingFee,
                    estimatedDuration: newDelivery.estimatedDuration,
                    distance: newDelivery.distance,
                    pickup: newDelivery.pickup.address,
                    dropoff: newDelivery.dropoff.address,
                    pickupLat: newDelivery.pickup.location.coordinates[1],
                    pickupLng: newDelivery.pickup.location.coordinates[0],
                    dropoffLat: newDelivery.dropoff.location.coordinates[1],
                    dropoffLng: newDelivery.dropoff.location.coordinates[0],
                    note: "Đơn hàng từ " + shop.name
                };

                availableShippers.forEach(shipperDoc => {
                    // shipperDoc là bản ghi trong bảng Shipper
                    // Cần lấy ID của User để emit (vì User connect socket bằng UserID)
                    const userIdToEmit = shipperDoc.user._id || shipperDoc.user;
                    io.to(`user:${userIdToEmit.toString()}`).emit('NEW_JOB', socketPayload);
                });
                
                console.log(`📡 Đã bắn đơn tới ${availableShippers.length} tài xế.`);
            }
        } catch (err) {
            console.error("Lỗi socket tìm ship:", err);
        }
    }

    return newDelivery;
};

export const deliveryService = {
  createDelivery,
  getDeliveryById,
  assignShipper,
  updateStatus,
  getCurrentDelivery,
  getNearbyDeliveries,
  createDeliveryForOrder
};