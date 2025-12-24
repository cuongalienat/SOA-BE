import Order from "../models/order.js";
import Item from "../models/Item.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";
import Shop from "../models/shop.js";
import Delivery from "../models/delivery.js";
import { createTransactionUserToAdmin, createTransactionAdminToUser } from "./walletServices.js";
import User from "../models/user.js";
import { getCoordinates } from "./goongServices.js";
import { getIO } from "../utils/socket.js";
import { deliveryService } from "./deliveryService.js";
import { calculateShippingFeeByDistance } from "./shippingServices.js";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/environment.js";


// 1. Tạo đơn hàng
export const createOrderService = async (data) => {
  // userLocation bây giờ có thể chỉ chứa { address: "..." }
  const { userId, shopId, items, paymentMethod, userLocation, distanceData } = data;

  const session = await mongoose.startSession();
  session.startTransaction();

  const distanceKm = distanceData.distanceValue / 1000;
  const shippingFeeBE = await calculateShippingFeeByDistance(distanceKm);

  try {
    const coordinates = await getCoordinates(userLocation.address);
    let finalLat = coordinates.lat;
    let finalLng = coordinates.lng;
    if (!finalLat || !finalLng) throw new ApiError(400, "Không tìm thấy toạ độ (lat, lng).");
    // --- 2. VALIDATE ITEM & SHOP ---
    let calculatedTotalAmount = 0;
    const orderItems = [];

    if (!items || items.length === 0) throw new ApiError(400, "Đơn hàng rỗng.");

    const dbShop = await Shop.findById(shopId).session(session);
    if (!dbShop) throw new ApiError(404, "Nhà hàng không tồn tại.");

    for (const itemData of items) {
      const dbItem = await Item.findById(itemData.item).session(session);
      if (!dbItem) throw new ApiError(404, `Món ${itemData.item} không tồn tại.`);

      if (dbItem.shopId.toString() !== shopId) {
        throw new ApiError(400, `Món '${dbItem.name}' không thuộc quán này.`);
      }

      const itemTotal = dbItem.price * itemData.quantity;
      calculatedTotalAmount += itemTotal;

      orderItems.push({
        item: dbItem._id,
        name: dbItem.name,
        imageUrl: dbItem.imageUrl,
        price: dbItem.price,
        quantity: itemData.quantity,
        options: itemData.options || "",
      });
    }

    // --- 3. TÍNH KHOẢNG CÁCH & PHÍ SHIP ---

    // Chốt phí ship từ BE để tránh client tampering
    const finalTotal = calculatedTotalAmount + shippingFeeBE;
    const user = await User.findById(userId);
    // --- 4. LƯU ORDER ---
    console.log("🚀 ~ createOrderService ~ finalTotal:", distanceData);
    const now = Date.now();
    const confirmTtlMs = (env.ORDER_CONFIRM_TTL_SECONDS || 300) * 1000;
    const autoConfirmDelayMs = (env.ORDER_AUTO_CONFIRM_DELAY_SECONDS || 20) * 1000;

    const newOrder = new Order({
      user: userId,
      shop: shopId,
      items: orderItems,
      totalAmount: finalTotal,
      distance: distanceData.distanceValue,
      shippingFee: shippingFeeBE,
      estimatedDuration: distanceData.durationText,
      address: userLocation.address,
      contactPhone: user.phone,
      status: 'Pending',
      payment: null,
      customerLocation: { lat: finalLat, lng: finalLng },
      confirmDeadline: new Date(now + confirmTtlMs),
      autoConfirmAt: (dbShop.isOpen && dbShop.autoAccept) ? new Date(now + autoConfirmDelayMs) : null
    });

    await newOrder.save({ session });
    // // --- 5. TẠO DELIVERY (Lưu toạ độ đã tìm được vào đây để vẽ Map) ---
    // const newDelivery = new Delivery({
    //   orderId: newOrder._id,
    //   pickup: {
    //     name: dbShop.name,
    //     address: dbShop.address,
    //     phone: (dbShop.phones && dbShop.phones.length > 0) ? dbShop.phones[0] : (dbShop.phone || "N/A"),
    //     location: {
    //       type: 'Point',
    //       coordinates: dbShop.location.coordinates
    //     }
    //   },
    //   dropoff: {
    //     name: userLocation.name || "Khách hàng",
    //     address: userLocation.address,
    //     phone: user.phone,
    //     location: {
    //       type: 'Point',
    //       // 👇 Lưu ý: MongoDB GeoJSON lưu [Lng, Lat] (Lng trước)
    //       coordinates: [finalLng, finalLat]
    //     }
    //   },
    //   distance: distanceData.distanceValue,
    //   shippingFee: shippingFee,
    //   status: 'SEARCHING',
    //   trackingLogs: [{ status: 'SEARCHING', note: 'Đang tìm tài xế...' }]
    // });

    // await newDelivery.save({ session });
    // newOrder.delivery = newDelivery._id;

    // --- 6. XỬ LÝ VÍ(NẾU CÓ)-- -
    let transactionRef = null;

    if (paymentMethod === 'Wallet') {
      const trans = await createTransactionUserToAdmin(userId, finalTotal, newOrder._id, session);
      transactionRef = trans._id;
    }
    newOrder.payment = transactionRef;
    await newOrder.save({ session });
    await session.commitTransaction();

    try {
      // Lấy instance IO (Tuỳ cách bạn setup, có thể là getIO() hoặc req.app.get('socketio'))
      const io = getIO();

      // Emit sự kiện mà FE Dashboard đang lắng nghe ('NEW_ORDER_TO_SHOP')
      // Room name khớp với server join: `shop:${shopId}`
      const orderForSocket = await Order.findById(newOrder._id)
        .populate('user', 'fullName phone')
        .populate('shop', 'name address')
        .lean();
      io.to(`shop:${shopId}`).emit('NEW_ORDER_TO_SHOP', orderForSocket);
      console.log(`🔔 Đã bắn thông báo đơn mới tới shop:${shopId}`);
    } catch (socketError) {
      // Lỗi socket không được làm fail đơn hàng -> chỉ log ra thôi
      console.error("⚠️ Lỗi bắn socket cho Shop:", socketError.message);
    }

    // try {
    //     const shopLocation = newDelivery.pickup.location.coordinates;
    //     // Tìm shipper trong 5km
    //     const availableShippers = await findNearbyShippers(shopLocation, 5000); 
    //     console.log(`📡 Order ${newOrder._id}: Tìm thấy ${availableShippers.length} tài xế.`);

    //     if (availableShippers.length > 0) {
    //         const io = getIO();
    //         availableShippers.forEach(shipper => {
    //             const userId = shipper.user._id.toString();

    //             io.to(userId).emit('NEW_JOB', {
    //                 deliveryId: newDelivery._id,
    //                 pickup: newDelivery.pickup.address,
    //                 dropoff: newDelivery.dropoff.address,
    //                 fee: newDelivery.shippingFee,
    //                 distance: newDelivery.distance
    //             });
    //         });
    //     }
    // } catch (socketError) {
    //     // Nếu lỗi socket/tìm shipper thì chỉ log thôi, KHÔNG throw error
    //     // vì đơn hàng đã tạo thành công rồi.
    //     console.error("⚠️ Lỗi điều phối shipper:", socketError.message);
    // }

    return {
      ...newOrder.toObject(),
      distance: distanceData.distanceValue,
      estimatedDuration: distanceData.durationText
    };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// 2. Lấy chi tiết đơn
export const getOrderByIdService = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate('user', 'fullName email phone address')
    .populate('shop', 'name address phones')
    .populate('items.item', 'image description')
    .populate('payment')
    .populate('delivery');

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng.');
  }
  return order;
};

// 3. Cập nhật trạng thái
const PERMISSIONS = {
  // Role 'restaurant' chỉ được phép set các trạng thái này
  restaurant_manager: ['confirmed', 'preparing', 'canceled'],

  // Role 'driver' (shipper) chỉ được phép set các trạng thái này
  driver: ['picking_up', 'out_for_delivery', 'delivered', 'failed']
};
const STATUS_MAP = {
  'pending': 'Pending',
  'confirmed': 'Confirmed',
  'preparing': 'Preparing', // <-- Trạng thái kích hoạt tìm ship
  'shipping': 'Shipping',
  'delivered': 'Delivered',
  'canceled': 'Canceled'
};
export const updateOrderStatusService = async (orderId, newStatus, currentUser, io) => {
  // 1. Chuẩn hóa status đầu vào
  const normalizedStatus = newStatus.toLowerCase();

  // 2. Tìm đơn hàng (KHÔNG dùng findByIdAndUpdate ngay, vì cần validate trước)
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Đơn hàng không tồn tại.');
  }

  // 3. CHECK QUYỀN (Quan trọng nhất)
  const userRole = currentUser.role; // Ví dụ: 'restaurant' hoặc 'driver'

  // Kiểm tra xem Role này có được phép set status này không?
  const allowedStatuses = PERMISSIONS[userRole];

  if (!allowedStatuses || !allowedStatuses.includes(normalizedStatus)) {
    throw new ApiError(403, `Bạn không có quyền chuyển trạng thái đơn hàng sang "${newStatus}".`);
  }

  // 4. Validate Logic nghiệp vụ cũ (Đơn hủy không được sửa)
  if (order.status === 'Canceled' && normalizedStatus !== 'canceled') {
    throw new ApiError(400, 'Không thể cập nhật đơn hàng đã bị hủy.');
  }

  // --- LOGIC RIÊNG CỦA TỪNG TRẠNG THÁI ---

  // CASE A: SHOP chuyển sang 'preparing' -> Tìm tài xế
  if (normalizedStatus === 'preparing') {
    // Kiểm tra Idempotency (Tránh tạo trùng delivery)
    if (order.delivery) {
      console.warn(`⚠️ Đơn ${orderId} đã có Delivery, bỏ qua tạo mới.`);
    } else {
      // Populate để lấy data cho Delivery Service
      await order.populate('shop user');

      // Gọi service tạo delivery & bắn socket tìm ship
      const delivery = await deliveryService.createDeliveryForOrder(order, io);

      // Link ngược delivery vào order
      order.delivery = delivery._id;
    }
  }

  // CASE B: SHIPPER nhận đơn -> update delivery status
  if (normalizedStatus === 'picking_up' || normalizedStatus === 'out_for_delivery') {
    // Logic cập nhật bảng Delivery (nếu cần)
    // await deliveryService.updateDeliveryStatus(order.delivery, normalizedStatus);
  }

  // 5. Lưu thay đổi vào DB
  order.status = STATUS_MAP[normalizedStatus];
  await order.save();

  // Đảm bảo dữ liệu trả về có đủ user/shop (tránh crash khi order.user là ObjectId)
  await order.populate('user shop');

  // 6. Bắn Socket thông báo cho User (Khách hàng)
  if (io && order.user) {
    // Lưu ý: order.user có thể là object (do populate trên) hoặc id
    const userId = order.user._id || order.user;
    io.to(`user:${userId}`).emit('ORDER_UPDATE', {
      status: normalizedStatus,
      msg: `Đơn hàng của bạn đã chuyển sang: ${normalizedStatus}`
    });
  }

  return {
    _id: order._id,
    status: order.status,
    totalAmount: order.totalAmount,
    shippingFee: order.shippingFee,
    deliveryId: order.delivery, // Chỉ cần ID delivery là đủ
    updatedAt: order.updatedAt,

    // Nếu cần thông tin user/shop cơ bản để hiển thị lại UI
    user: {
      _id: order.user?._id || order.user,
      fullName: order.user?.fullName,
      phone: order.user?.phone
    },
    shop: {
      _id: order.shop?._id || order.shop,
      name: order.shop?.name,
      address: order.shop?.address,
      location: order.shop?.location
    }
  };
};

// 4. Hủy đơn
export const cancelOrderService = async (orderId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new ApiError(StatusCodes.NOT_FOUND, 'Đơn hàng không tồn tại.');

    if (order.user.toString() !== userId) throw new ApiError(StatusCodes.FORBIDDEN, 'Không có quyền hủy.');
    if (order.status !== 'Pending' && order.status !== 'Confirmed') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể hủy đơn khi đã có tài xế nhận.');
    }

    order.status = 'Canceled';
    order.cancelReason = 'USER_CANCELLED';
    if (order.payment) {
      await createTransactionAdminToUser(order.user, order.totalAmount, order._id);
    }
    await order.save({ session });

    // Hủy luôn Delivery
    if (order.delivery) {
      await Delivery.findByIdAndUpdate(order.delivery, {
        status: 'CANCELLED',
        $push: { trackingLogs: { status: 'CANCELLED', note: 'Khách hàng hủy đơn' } }
      }).session(session);
    }

    // TODO: Nếu đã trừ tiền ví thì phải hoàn tiền (Refund) ở đây

    await session.commitTransaction();
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// 5. Lấy danh sách (giữ nguyên logic, chỉ thêm try catch nếu cần xử lý lỗi DB lạ)
export const getOrdersService = async (filter = {}, page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNumRaw = parseInt(limit, 10) || 10;
  const limitNum = Math.min(100, Math.max(1, limitNumRaw));
  const skip = (pageNum - 1) * limitNum;
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .populate('shop', 'name coverImage')
    .populate('user', 'fullName phone');

  const total = await Order.countDocuments(filter);

  return {
    orders,
    total,
    currentPage: pageNum,
    totalPages: Math.ceil(total / limitNum),
    limit: limitNum
  };
};

export default {
  createOrderService,
  getOrderByIdService,
  updateOrderStatusService,
  cancelOrderService,
  getOrdersService
};