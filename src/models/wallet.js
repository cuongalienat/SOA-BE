import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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

walletSchema.pre("save", async function (next) {
    if (this.isModified("pin")) {
        this.pin = await bcrypt.hash(this.pin, 10);
    }
    next();
});

walletSchema.methods.comparePin = async function (pin) {
    return await bcrypt.compare(pin, this.pin);
};

const Wallet = mongoose.model("Wallet", walletSchema);
export default Wallet;