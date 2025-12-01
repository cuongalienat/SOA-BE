import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    wallet: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Wallet"
    },
    type: {
        type: String,
        enum: ['DEPOSIT', 'PAYMENT', 'REFUND'],
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
    balanceAfter: {
        type: Number,
        required: true
    },
    relatedOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null
    }
}, { timestamps: true });

export const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;