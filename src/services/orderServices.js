import Order from "../models/order.js";
import Item from "../models/Item.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js"; // Giả sử bạn lưu file ApiError ở folder utils
import Payment from "../models/payment.js";
import Shop from "../models/shop.js";
import Delivery from "../models/delivery.js";
import { processPaymentDeductionService } from "./walletServices.js";

// 1. Tạo đơn hàng
export const createOrderService = async (data) => {
<<<<<<< HEAD
    const { customerId, shopId, items, shippingFee, paymentMethod, distance, userLocation } = data;
=======
    const { customerId, restaurantId, items, shippingFee, address, paymentMethod, totalAmount } = data;
>>>>>>> origin/cuong/payments

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const orderItems = [];

        // Kiểm tra danh sách items không rỗng
        if (!items || items.length === 0) {
            throw new ApiError(400, "Đơn hàng phải có ít nhất 1 món.");
        }

        const dbShop = await Shop.findById(shopId).session(session);
        if (!dbShop) {
            throw new ApiError(404, "Nhà hàng không tồn tại.");
        }

        for (const itemData of items) {
            const dbItem = await Item.findById(itemData.item).session(session);

            if (!dbItem) {
                throw new ApiError(404, `Món ăn với ID ${itemData.item} không tồn tại.`);
            }

            if (dbItem.shopId.toString() !== shopId) {
                throw new ApiError(400, `Món ăn '${dbItem.name}' không thuộc về nhà hàng này.`);
            }

            orderItems.push({
                item: dbItem._id,
                name: dbItem.name,
                imageUrl: dbItem.imageUrl,
                price: dbItem.price,
                quantity: itemData.quantity,
                options: itemData.options || [],
            });
        }

        const newOrder = new Order({
            user: customerId,
            shop: shopId,
            items: orderItems,
            totalAmount: totalAmount,
            shippingFee: shippingFee || 0,
            address: address,
            status: 'Pending',
            // payment: paymentId
            payment: null // Chờ xử lý sau khi tạo Payment record
        });

        await newOrder.save({ session });
        const newDelivery = new Delivery({
            orderId: newOrder._id,
            // 1. Điểm lấy hàng (Lấy từ DB Shop)
            pickup: {
                name: dbShop.name,
                address: dbShop.address,
                phones: dbShop.phones || [],
                location: {
                    type: 'Point',
                    coordinates: dbShop.location.coordinates // [Lng, Lat] từ DB
                }
            },
            // 2. Điểm giao hàng (Lấy từ dữ liệu FE gửi lên)
            dropoff: {
                name: userLocation.name,
                address: userLocation.address,
                phone: userLocation.phone,
                location: {
                    type: 'Point',
                    coordinates: [userLocation.lng, userLocation.lat] // Lưu ý thứ tự GeoJSON: Lng trước, Lat sau
                }
            },
            distance: distance || 0,
            shippingFee: shippingFee || 0,
            status: 'SEARCHING', // Trạng thái tìm tài xế
            trackingLogs: [{
                status: 'SEARCHING',
                note: 'Đơn hàng được khởi tạo, đang tìm tài xế'
            }]
        });

        await newDelivery.save({ session });

        // Gán ngược Delivery ID vào Order
        newOrder.delivery = newDelivery._id;
        
        let transactionRef = null;
        let paymentStatus = 'Pending';

        // 2. XỬ LÝ THANH TOÁN VÍ
        if (paymentMethod === 'WALLET') {
            // Gọi service trừ tiền, truyền session vào để đảm bảo cùng 1 transaction
            // Lưu ý: finalTotal chưa được define ở trên, dùng totalAmount
            const trans = await processPaymentDeductionService(customerId, totalAmount, newOrder._id, session);

            transactionRef = trans._id;
            paymentStatus = 'Completed'; // Trừ tiền xong thì coi như đã thanh toán
            newOrder.status = 'Confirmed'; // Đơn hàng tự động xác nhận luôn
        }

        // 3. Lưu Order
        await newOrder.save({ session });

        // 4. Tạo bản ghi Payment (Biên lai)
        const newPayment = await Payment.create([{
            order: newOrder._id,
            user: customerId,
            amount: finalTotal,
            method: paymentMethod,
            status: paymentStatus,
            transactionReference: transactionRef // Link tới lịch sử trừ tiền
        }], { session });

        newOrder.payment = newPayment[0]._id;
        await newOrder.save({ session });

        await session.commitTransaction();
        return newOrder;

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        // Ném lỗi ra ngoài để Controller/Middleware bắt
        throw error;
    }
};

// 2. Lấy chi tiết đơn
export const getOrderByIdService = async (orderId) => {
    const order = await Order.findById(orderId)
<<<<<<< HEAD
        .populate('customer', 'name email phone address')
        .populate('shop', 'name address phones')
        .populate('items.item', 'image description')
=======
        .populate('user', 'name email phone address')
        .populate('shop', 'name address phone')
>>>>>>> origin/cuong/payments
        .populate('payment')
        .populate('delivery');

    if (!order) {
        throw new ApiError(404, 'Không tìm thấy đơn hàng.');
    }
    return order;
};

// 3. Cập nhật trạng thái
export const updateOrderStatusService = async (orderId, newStatus) => {
    const allowedStatuses = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Canceled'];

    if (!allowedStatuses.includes(newStatus)) {
        throw new ApiError(400, 'Trạng thái không hợp lệ.');
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, 'Đơn hàng không tồn tại.');
    }

    if (order.status === 'Canceled' && newStatus !== 'Canceled') {
        throw new ApiError(400, 'Không thể cập nhật đơn hàng đã bị hủy.');
    }

    order.status = newStatus;
    await order.save();
    return order;
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
        .populate('customer', 'name');

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
