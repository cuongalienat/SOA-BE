import mongoose from "mongoose";

//Menu 
const itemSchema = new mongoose.Schema({
    name: { type: String, required: [true, "Tên món ăn là bắt buộc"], trim: true },
    category: { type: String, required: true },
    description: { type: String, required: [true, "Mô tả món ăn là bắt buộc"], },
    price: { type: Number, required: [true, "Giá tiền là bắt buộc"], min: [0, "Giá tiền không thể âm"] },
    imageUrl: { type: String, required: [true, "URL hình ảnh là bắt buộc"], },
    // Quan trọng: Món ăn này thuộc về nhà hàng nào?
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'shop', required: true }
}, {
    timestamps: true
});

itemSchema.index({ shopId: 1, categoryId: 1 });

const Item = mongoose.model('Item', itemSchema);

export default Item;