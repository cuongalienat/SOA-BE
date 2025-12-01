import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    // Category thuộc về Shop nào
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Shop', 
        required: true 
    },
    
    // Tên nhóm (VD: Món Chính, Trà Sữa...)
    name: { type: String, required: true },
    
    // Mô tả nhóm (nếu có)
    description: { type: String },

    // Thứ tự hiển thị (Để Best Seller luôn lên đầu)
    displayOrder: { type: Number, default: 0 }
}, { 
    timestamps: true 
});

const Category = mongoose.model('Category', categorySchema);
export default Category;