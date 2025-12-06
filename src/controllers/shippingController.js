/* File: src/controllers/shippingController.js */
import { getCoordinates, getDistance } from '../services/goongServices.js';
import { calculateShippingFee } from '../services/shippingServices.js';
import Shop from '../models/shop.js';
import { StatusCodes } from 'http-status-codes';

export const calculateFee = async (req, res, next) => {
    try {
        // 👇 THÊM: Nhận subTotal từ Body
        const { shopId, userAddress, subTotal } = req.body; 

        // 1. Lấy tọa độ quán
        const shop = await Shop.findById(shopId);
        if (!shop) return res.status(StatusCodes.NOT_FOUND).json({ message: "Shop not found" });

        // Goong nhận Lat,Lng hoặc Lng,Lat tùy endpoint, DistanceMatrix thường là lat,lng
        const shopCoords = `${shop.location.coordinates[1]},${shop.location.coordinates[0]}`; 

        // 2. Lấy tọa độ khách
        let userCoords = "";
        if (typeof userAddress === 'string') {
            const coords = await getCoordinates(userAddress);
            if (!coords) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid Address" });
            userCoords = `${coords.lat},${coords.lng}`;
        } else {
            userCoords = `${userAddress.lat},${userAddress.lng}`;
        }

        // 3. Gọi Goong tính khoảng cách
        const distanceData = await getDistance(shopCoords, userCoords);
        if (!distanceData) return res.status(500).json({ message: "Cannot calculate distance" });

        // 4. Tính tiền (Truyền distanceValue là Mét, và subTotal)
        const shippingFee = calculateShippingFee(distanceData.distanceValue, subTotal || 0);

        res.status(StatusCodes.OK).json({
            distance: distanceData.distanceText, // "5.2 km"
            duration: distanceData.durationText, // "20 mins"
            shippingFee: shippingFee,            // Kết quả cuối cùng (VND)
            currency: "VND",
            details: {
                distanceKm: (distanceData.distanceValue / 1000).toFixed(1) + ' km',
                subTotalRecieved: subTotal || 0
            }
        });

    } catch (error) {
        next(error);
    }
};