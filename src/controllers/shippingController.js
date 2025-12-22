/* File: src/controllers/shippingController.js */
import { calculateShippingFee } from '../services/shippingServices.js';
import Shop from '../models/shop.js';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../utils/ApiError.js';

export const calculateFee = async (req, res, next) => {
    try {
        const { shopId, userLocation } = req.body;
        console.log(req.body);
        // 1. Validate đầu vào
        if (!shopId || !userLocation) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Thiếu thông tin Shop hoặc Địa chỉ khách hàng.");
        }


        const shop = await Shop.findById(shopId);
        if (!shop) throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy cửa hàng.");


        // 4. Gọi Service tính toán (Service đã bao gồm logic Geocoding + Distance + Phí)
        const { distanceData, shippingFee } = await calculateShippingFee(userLocation, shop);

        // 5. Trả về kết quả
        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                distanceData: distanceData,
                distanceText: distanceData.distanceText,
                durationText: distanceData.durationText,
                shippingFee: shippingFee
            }
        });

    } catch (error) {
        next(error);
    }
};

export const shippingController = {
    calculateFee
};