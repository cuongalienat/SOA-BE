import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    // Tham chiếu tới Item gốc (để xem chi tiết món ăn hiện tại)
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item', // Giả sử bạn có Item Model
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    imageUrl: {
        type: String
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    options: {
        type: String,
        default: ""
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop', // Tham chiếu tới Shop Model
        required: true,
    },
    items: {
        type: [orderItemSchema], // Sử dụng Array các Item đã định nghĩa ở trên
        required: true,
        validate: {
            validator: function (v) {
                return v && v.length > 0; // Đảm bảo đơn hàng có ít nhất 1 món
            },
            message: 'Order must contain at least one item.'
        }
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    shippingFee: {
        type: Number,
        default: 0,
        min: 0,
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Preparing', 'Shipping', 'Delivered', 'Canceled'],
        default: 'Pending',
        required: true,
    },
    // SLA / Timeout control
    confirmDeadline: { type: Date, default: null, index: true },
    autoConfirmAt: { type: Date, default: null, index: true },
    cancelReason: {
        type: String,
        enum: ['SHOP_NO_RESPONSE', 'NO_SHIPPER', 'USER_CANCELLED', 'SYSTEM', null],
        default: null
    },
    reminded30s: { type: Boolean, default: false },
    reminded60s: { type: Boolean, default: false },
    reminded180s: { type: Boolean, default: false },
    address: {
        type: String,
        required: true,
    },
    // Toạ độ giao hàng (để tạo Delivery khi shop chuyển Preparing)
    customerLocation: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        // required: true,
        default: null,
    },
    delivery: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Delivery',
        default: null,
    },
    rating: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rating',
        default: null,
    },
    distance: { type: Number, required: true }, // Khoảng cách từ cửa hàng đến địa chỉ khách hàng (mét)
    estimatedDuration: { type: String },
    contactPhone: { type: String, required: true },    // SĐT người nhận
}, { timestamps: true })

// Indexes for SLA jobs & order management queries
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ status: 1, confirmDeadline: 1 });
orderSchema.index({ status: 1, autoConfirmAt: 1 });

const Order = mongoose.model("Order", orderSchema)
export default Order