import mongoose from "mongoose";

const shopSchema = new mongoose.Schema({
    // Liên kết với user sở hữu shop
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Tham chiếu đến model 'User'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    // Trạng thái quán: mở cửa/đóng cửa
    isOpen: {
        type: Boolean,
        default: true
    },
    // Thêm các trường ảnh sau này
    coverImage: { type: String },
    qrImage: { type: String }
}, { timestamps: true });

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;