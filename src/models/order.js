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
    options: [
        {
            name: String,
            value: String
        }
    ]
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
    address: {
        type: String,
        required: true,
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

const Order = mongoose.model("Order", orderSchema)
export default Order