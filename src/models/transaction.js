import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    senderID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    receiverID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    type: {
        type: String,
        enum: ['ORDER_PAYMENT', 'ORDER_REFUND', 'SHIPPER_PAYOUT', 'SHOP_PAYOUT'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Completed", "Failed"],
        default: "Pending"
    },
    senderBalanceBefore: {
        type: Number,
        required: true
    },
    senderBalanceAfter: {
        type: Number,
        required: true
    },
    receiverBalanceBefore: {
        type: Number,
        required: true
    },
    receiverBalanceAfter: {
        type: Number,
        required: true
    },
    relatedOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null
    },
    description: {
        type: String,
        default: null
    }
}, { timestamps: true });

export const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;