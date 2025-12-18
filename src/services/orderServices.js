import Order from "../models/order.js";
import Item from "../models/Item.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js"; // Giả sử bạn lưu file ApiError ở folder utils
import Payment from "../models/payment.js";
import Shop from "../models/shop.js";
import Delivery from "../models/delivery.js";
import { processPaymentDeductionService } from "./walletServices.js";
import { getDistance, getCoordinates } from "./goongServices.js";
import { calculateShippingFee } from "./shippingServices.js";
import User from "../models/user.js";
import { findNearbyShippers } from "./shipperServices.js";
import { getIO } from "../utils/socket.js";
import { deliveryService } from "./deliveryService.js";
import { distance } from "@turf/turf";


// 1. Tạo đơn hàng
export const createOrderService = async (data) => {
    // userLocation bây giờ có thể chỉ chứa { address: "..." }
    const { userId, shopId, items, paymentMethod, userLocation } = data;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // --- 1. XỬ LÝ ĐỊA CHỈ (GEOCODING) ---
        // Nếu thiếu lat/lng, Backend tự đi tìm
        let finalLat = userLocation.lat;
        let finalLng = userLocation.lng;
        console.log("data", data);
        console.log("📍 Tọa độ:", finalLat, finalLng);
        if (!finalLat || !finalLng) {
            console.log("📍 Đang tìm tọa độ cho địa chỉ:", userLocation.address);

            if (!userLocation.address) {
                throw new ApiError(400, "Vui lòng nhập địa chỉ giao hàng.");
            }

            const coords = await getCoordinates(userLocation.address);

            if (!coords) {
                throw new ApiError(400, "Không tìm thấy địa chỉ này trên bản đồ. Vui lòng ghi rõ hơn.");
            }

            finalLat = coords.lat;
            finalLng = coords.lng;
            console.log("✅ Tìm thấy:", finalLat, finalLng);
        }

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
                options: itemData.options || [],
            });
        }

        // --- 3. TÍNH KHOẢNG CÁCH & PHÍ SHIP ---
        const shopCoords = `${dbShop.location.coordinates[1]},${dbShop.location.coordinates[0]}`; // Lat,Lng
        const userCoords = `${finalLat},${finalLng}`; // Lat,Lng (Dùng toạ độ vừa tìm được)

        const distanceData = await getDistance(shopCoords, userCoords);

        if (!distanceData) {
            throw new ApiError(500, "Lỗi tính khoảng cách (Goong API). Kiểm tra lại Key.");
        }

        const realDistance = distanceData.distanceValue;
        const realShippingFee = calculateShippingFee(realDistance, calculatedTotalAmount);
        const finalTotal = calculatedTotalAmount + realShippingFee;

        // --- 4. LƯU ORDER ---
        const newOrder = new Order({
            user: userId,
            shop: shopId,
            items: orderItems,
            totalAmount: finalTotal,
            distance: realDistance,
            shippingFee: realShippingFee,
            address: userLocation.address,
            contactPhone: userLocation.phone,
            customerLocation: {
                lat: finalLat,
                lng: finalLng
            },
            status: 'Pending',
            payment: null
        });

        await newOrder.save({ session });
        const user = await User.findById(userId);
        // // --- 5. TẠO DELIVERY (Lưu toạ độ đã tìm được vào đây để vẽ Map) ---
        // console.log("user", user.phone);
        // console.log("shop", dbShop.phones);
        // const newDelivery = new Delivery({
        //     orderId: newOrder._id,
        //     pickup: {
        //         name: dbShop.name,
        //         address: dbShop.address,
        //         phone: (dbShop.phones && dbShop.phones.length > 0) ? dbShop.phones[0] : (dbShop.phone || "N/A"),
        //         location: {
        //             type: 'Point',
        //             coordinates: dbShop.location.coordinates
        //         }
        //     },
        //     dropoff: {
        //         name: userLocation.name || "Khách hàng",
        //         address: userLocation.address,
        //         phone: user.phone,
        //         location: {
        //             type: 'Point',
        //             // 👇 Lưu ý: MongoDB GeoJSON lưu [Lng, Lat] (Lng trước)
        //             coordinates: [finalLng, finalLat]
        //         }
        //     },
        //     distance: realDistance,
        //     shippingFee: realShippingFee,
        //     status: 'SEARCHING',
        //     trackingLogs: [{ status: 'SEARCHING', note: 'Đang tìm tài xế...' }]
        // });

        // await newDelivery.save({ session });
        // newOrder.delivery = newDelivery._id;

        // --- 6. XỬ LÝ VÍ (NẾU CÓ) ---
        let transactionRef = null;
        let paymentStatus = 'Pending';

        if (paymentMethod === 'WALLET') {
            const trans = await processPaymentDeductionService(userId, finalTotal, newOrder._id, session);
            transactionRef = trans._id;
            paymentStatus = 'Completed';
            newOrder.status = 'Confirmed';
        }

        await newOrder.save({ session });

        // --- 7. TẠO PAYMENT ---
        const newPayment = await Payment.create([{
            order: newOrder._id,
            user: userId,
            amount: finalTotal,
            method: paymentMethod,
            status: paymentStatus,
            transactionReference: transactionRef
        }], { session });

        newOrder.payment = newPayment[0]._id;
        await newOrder.save({ session });

        await session.commitTransaction();

        try {
            // Lấy instance IO (Tuỳ cách bạn setup, có thể là getIO() hoặc req.app.get('socketio'))
            const io = getIO(); 
            
            // Emit sự kiện mà FE Dashboard đang lắng nghe ('NEW_ORDER_TO_SHOP')
            // Room name phải khớp với lúc FE join: `shop_${shopId}`
            io.to(`shop:${shopId}`).emit('NEW_ORDER_TO_SHOP', newOrder);            
            console.log(`🔔 Đã bắn thông báo đơn mới tới shop_${shopId}`);
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
            distance: realDistance,
            estimatedDuration: distanceData.durationText
        };

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

// 2. Lấy chi tiết đơn
export const getOrderByIdService = async (orderId) => {
    const order = await Order.findById(orderId)
        .populate('user', 'name email phone address')
        .populate('shop', 'name address phone')
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
    if (order.status === 'canceled' && normalizedStatus !== 'canceled') {
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
            _id: order.user._id,
            fullName: order.user.fullName,
            phone: order.user.phone
        },
        shop: {
            _id: order.shop._id,
            name: order.shop.name,
            address: order.shop.address,
            location: order.shop.location
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
    const skip = (page - 1) * limit;
    const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('shop', 'name image')
        .populate('user', 'name');

    const total = await Order.countDocuments(filter);

    return {
        orders,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
    };
};

export default {
    createOrderService,
    getOrderByIdService,
    updateOrderStatusService,
    cancelOrderService,
    getOrdersService
};