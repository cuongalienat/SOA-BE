import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
    // Người dùng thực hiện đánh giá
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // Cửa hàng được đánh giá
    shop: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Shop', 
        required: true 
    },
    // Đơn hàng tương ứng với đánh giá này
    order: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Order', 
        required: true, 
        unique: true // Đảm bảo mỗi đơn hàng chỉ được đánh giá 1 lần
    },
    // Số sao (từ 1 đến 5)
    stars: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 5 
    },
    // Nội dung bình luận
    comment: { 
        type: String, 
        trim: true 
    }
}, { timestamps: true });

// Tạo chỉ mục để tăng tốc độ tìm kiếm các đánh giá của một shop
ratingSchema.index({ shop: 1 });

const Rating = mongoose.model("Rating", ratingSchema);
export default Rating;