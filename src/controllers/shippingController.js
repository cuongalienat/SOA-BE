/* File: src/controllers/shippingController.js */
import { getCoordinates, getDistance } from '../services/goongServices.js';
import { calculateShippingFee } from '../services/shippingServices.js'; // Sửa lại tên file nếu là shippingServices.js
import Shop from '../models/shop.js';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../utils/ApiError.js';

export const calculateFee = async (req, res, next) => {
    try {
        const { shopId, userAddress, subTotal } = req.body;

        // 1. Validate đầu vào
        if (!shopId || !userAddress) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Thiếu thông tin Shop hoặc Địa chỉ khách hàng.");
        }

        // 2. Lấy tọa độ quán
        const shop = await Shop.findById(shopId);
        if (!shop) throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy cửa hàng.");

        const shopCoords = `${shop.location.coordinates[1]},${shop.location.coordinates[0]}`; // Lat,Lng

        // 3. Xử lý tọa độ khách hàng (Hỗ trợ cả String địa chỉ và Object tọa độ)
        let userCoords = "";
        
        if (typeof userAddress === 'string') {
            // Case 1: Gửi lên chuỗi "123 Đường Láng..." -> Cần Geocoding
            const coords = await getCoordinates(userAddress);
            if (!coords) throw new ApiError(StatusCodes.BAD_REQUEST, "Không tìm thấy địa chỉ này trên bản đồ.");
            userCoords = `${coords.lat},${coords.lng}`;
        } else if (userAddress.lat && userAddress.lng) {
            // Case 2: Gửi lên { lat: 21..., lng: 105... } -> Dùng luôn (Nhanh hơn)
            userCoords = `${userAddress.lat},${userAddress.lng}`;
        } else {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Format địa chỉ không hợp lệ.");
        }

        // 4. Gọi Goong tính khoảng cách (Logic Y HỆT orderServices)
        const distanceData = await getDistance(shopCoords, userCoords);
        if (!distanceData) {
            return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ 
                message: "Không thể tính phí vận chuyển lúc này (Lỗi Map)." 
            });
        }

        // 5. Tính tiền ship (Dùng chung hàm calculateShippingFee với orderServices)
        const shippingFee = calculateShippingFee(distanceData.distanceValue, subTotal || 0);

        // 6. Trả về kết quả
        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                distanceText: distanceData.distanceText, // "5.2 km"
                durationText: distanceData.durationText, // "20 mins"
                shippingFee: shippingFee,                // 25000 (VND)
                
                // Trả về thêm chi tiết để Frontend debug hoặc hiển thị
                details: {
                    distanceMeters: distanceData.distanceValue,
                    subTotalUsed: subTotal || 0
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

export const shippingController = {
    calculateFee
};