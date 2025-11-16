import * as shopServices from "../services/shopServices.js";
import { StatusCodes } from "http-status-codes";

export const createShop = async (req, res, next) => {
    try {
        // req.user.id được lấy từ token sau khi qua authMiddleware
        const shop = await shopServices.createShopService(req.user.id, req.body);
        res.status(StatusCodes.CREATED).json({ message: "Shop created successfully", shop });
    } catch (error) {
        next(error);
    }
};

// Viết các hàm còn lại: getMyShop, updateMyShop, updateShopStatus
// ... tương tự như trên, gọi đến service tương ứng