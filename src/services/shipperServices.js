import Shipper from '../models/shipper.js';
import ApiError from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';

// 1. Đăng ký làm tài xế
const registerShipper = async ({ userId, vehicleType, licensePlate }) => {
    // Check xem đã đăng ký chưa
    const exist = await Shipper.findOne({ user: userId });
    if (exist) {
        throw new ApiError(StatusCodes.CONFLICT, "Tài khoản này đã đăng ký làm tài xế rồi!");
    }

    const newShipper = await Shipper.create({
        user: userId,
        vehicleType,
        licensePlate,
        status: 'OFFLINE' // Mặc định mới tạo thì offline
    });

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

const findNearestShippers = async (lat, lng, radiusKm = 5) => {
    // Lưu ý: lat/lng phải là Number
    return await Shipper.find({
        status: 'ONLINE', // Chỉ tìm ông nào đang bật app
        currentLocation: {
            $near: {
                $geometry: { type: "Point", coordinates: [lng, lat] }, // GeoJSON: Kinh độ trước
                $maxDistance: radiusKm * 1000 // Đổi km ra mét
            }
        }
    }).limit(10); // Lấy tối đa 10 ông gần nhất
};

export const shipperService = {
    registerShipper,
    updateStatus,
    updateLocation,
    getShipperProfile,
    findNearestShippers
};