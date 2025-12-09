/* File: src/models/shop.js */
import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    name: { type: String, required: true },
    address: { type: String, required: true },
    
    // Ảnh bìa (Lấy url từ res_photos)
    coverImage: { type: String, default: "" }, 

    photos: [
        {
            width: Number,
            height: Number,
            value: String // URL ảnh
        }
    ],
    
    // Lưu mảng số điện thoại (Thay vì 1 số như trước)
    phones: [{ type: String }],
    
    // Đánh giá (Rating)
    rating: {
        avg: { type: Number, default: 0 },         // 4.7
        total_review: { type: Number, default: 0 } // 100
    },

    // Khoảng giá (Price Range)
    priceRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 }
    },

    // Giờ mở cửa (Time)
    openingHours: [{
        day: { type: Number, required: true }, // 1 = CN, 2 = Thứ 2...
        open: { type: String, required: true }, // VD: "07:30"
        close: { type: String, required: true } // VD: "21:30"
    }],

    isOpen: { type: Boolean, default: true },
    tags: [{ type: String }],
    location: {
        type: {
            type: String,
            enum: ['Point'], 
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [Longitude, Latitude] - Lưu ý: Kinh độ trước, Vĩ độ sau
            default: [0, 0]
        }
    },

}, { timestamps: true });
shopSchema.index({ location: '2dsphere' });
const Shop = mongoose.model('Shop', shopSchema);
export default Shop;