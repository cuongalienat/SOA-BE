import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
        unique: true,
    },
    balance: {
        type: Number,
        required: true,
        default: 0
    },
    pin: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Wallet = mongoose.model("Wallet", walletSchema);
export default Wallet;