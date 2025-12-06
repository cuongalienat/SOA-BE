import mongoose from 'mongoose';

const shipperSchema = new mongoose.Schema({
    // Liên kết với bảng User (Để đăng nhập)
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    
    // Thông tin xe (Bắt buộc với tài xế)
    vehicleType: { type: String, enum: ['bike', 'car'], default: 'bike' },
    licensePlate: { type: String, default: "29A-999.99" }, // Biển số

    // 👇 VỊ TRÍ HIỆN TẠI (Quan trọng nhất)
    currentLocation: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [Lng, Lat]
    },

    // 👇 TRẠNG THÁI LÀM VIỆC
    // OFFLINE: Tắt app/Nghỉ
    // ONLINE: Đang bật app, sẵn sàng nhận đơn
    // SHIPPING: Đang đi giao, không nhận thêm đơn
    status: { 
        type: String, 
        enum: ['OFFLINE', 'ONLINE', 'SHIPPING'], 
        default: 'OFFLINE' 
    },
    
    // Tổng thu nhập (Ví tài xế)
    wallet: { type: Number, default: 0 }

}, { timestamps: true });

// Index 2dsphere để tìm "Tài xế gần đây"
shipperSchema.index({ currentLocation: '2dsphere' });

const Shipper = mongoose.model('Shipper', shipperSchema);
export default Shipper;