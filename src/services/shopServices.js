import Shop from "../models/shop.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

export const createShopService = async (ownerId, shopData) => {
    // Kiểm tra xem user này đã có shop chưa
    const existingShop = await Shop.findOne({ owner: ownerId });
    if (existingShop) {
        throw new ApiError(StatusCodes.CONFLICT, "User already has a shop");
    }

    const newShop = await Shop.create({
        ...shopData,
        owner: ownerId // Gán chủ sở hữu
    });

    return newShop;
};

// Viết các service còn lại: getShopByOwner, updateShop, updateStatus
// ...