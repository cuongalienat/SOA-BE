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

export const getShopByOwnerService = async (ownerId) => {
    const shop = await Shop.findOne({ owner: ownerId });
    if (!shop) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
    }
    return shop;
};

export const updateShopService = async (ownerId, updateData) => {
    const shop = await Shop.findOneAndUpdate(
        { owner: ownerId },
        updateData,
        { new: true } // Trả về dữ liệu sau khi update
    );
    if (!shop) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
    }
    return shop;
};

export const updateShopStatusService = async (ownerId, isOpen) => {
    const shop = await Shop.findOneAndUpdate(
        { owner: ownerId },
        { isOpen },
        { new: true }
    );
    if (!shop) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
    }
    return shop;
};