import mongoose from "mongoose";

//Menu 
const itemSchema = new mongoose.Schema({
    name: { type: String, required: [true, "Tên món ăn là bắt buộc"], trim: true },
    description: { type: String, default: "" }, 

    price: { type: Number, required: [true, "Giá tiền là bắt buộc"], min: [0, "Giá tiền không thể âm"] },
    imageUrl: { 
        type: String, 
        default: "https://via.placeholder.com/300x300.png?text=No+Image" 
    },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'shop', required: true },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },

    // Trạng thái món (Còn hàng/Hết hàng)
    isAvailable: { type: Boolean, default: true }
}, {
    timestamps: true
});

itemSchema.index({ shopId: 1, categoryId: 1 });

const Item = mongoose.model('Item', itemSchema);

export default Item;