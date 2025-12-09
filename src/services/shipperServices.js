import Shipper from '../models/shipper.js';
import ApiError from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import User from '../models/user.js';

// 1. Đăng ký làm tài xế
const registerShipper = async ({ userId, vehicleType, licensePlate }) => {
    // 1. Check xem đã đăng ký chưa
    const exist = await Shipper.findOne({ user: userId });
    
    // Nếu đã tồn tại trong bảng Shipper, kiểm tra xem role bên User đã lên driver chưa
    if (exist) {
        // (Optional) Fix lỗi dữ liệu cũ: Nếu có Shipper mà User vẫn là customer thì update luôn
        const userCheck = await User.findById(userId);
        if (userCheck && userCheck.role !== 'driver') {
            await User.findByIdAndUpdate(userId, { role: 'driver' });
            return exist; // Trả về luôn coi như thành công
        }
        
        throw new ApiError(StatusCodes.CONFLICT, "Tài khoản này đã đăng ký làm tài xế rồi!");
    }

    // 2. Tạo Shipper mới
    const newShipper = await Shipper.create({
        user: userId,
        vehicleType,
        licensePlate,
        status: 'OFFLINE',
        currentLocation: { // Thêm cái này để đỡ lỗi tìm quanh đây
            type: 'Point',
            coordinates: [105.823000, 20.998000] // Default tạm Hà Nội
        }
    });

    // 3. QUAN TRỌNG: Cập nhật role cho User
    await User.findByIdAndUpdate(userId, { role: 'driver' });

    return newShipper;
};

// 2. Bật/Tắt trạng thái (Online/Offline)
const updateStatus = async (userId, status) => {
    if (!['ONLINE', 'OFFLINE'].includes(status)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Trạng thái không hợp lệ (chỉ ONLINE/OFFLINE)");
    }

    const shipper = await Shipper.findOneAndUpdate(
        { user: userId },
        { status: status },
        { new: true }
    );

    if (!shipper) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Hồ sơ tài xế không tồn tại.");
    }

    return shipper;
};

// 3. Cập nhật vị trí (Ping Location)
const updateLocation = async (userId, lat, lng) => {
    const shipper = await Shipper.findOneAndUpdate(
        { user: userId },
        {
            currentLocation: {
                type: 'Point',
                coordinates: [lng, lat] // GeoJSON: Kinh độ trước
            }
        },
        { new: true }
    );

    if (!shipper) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Hồ sơ tài xế không tồn tại.");
    }

    return shipper;
};

// 4. Lấy thông tin Shipper (Profile)
const getShipperProfile = async (userId) => {
    const shipper = await Shipper.findOne({ user: userId }).populate('user', 'name email phone avatar');
    if (!shipper) throw new ApiError(StatusCodes.NOT_FOUND, "Chưa đăng ký tài xế.");
    return shipper;
};

export const findNearbyShippers = async (coords, maxDistanceInMeters = 5000) => {
    // coords: [Lng, Lat] của Quán (Điểm lấy hàng)
    
    try {
        const shippers = await Shipper.find({
            currentLocation: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: coords
                    },
                    $maxDistance: maxDistanceInMeters // Ví dụ: 5000 mét (5km)
                }
            },
            status: 'ONLINE' // Chỉ tìm ông nào đang bật app
        }).populate('user', '_id name'); // Lấy info user để bắn socket

        return shippers;
    } catch (error) {
        console.error("Lỗi tìm shipper:", error);
        return [];
    }
};

export const shipperService = {
    registerShipper,
    updateStatus,
    updateLocation,
    getShipperProfile,
    findNearbyShippers
};