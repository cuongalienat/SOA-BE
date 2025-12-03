import Shop from "../models/shop.js";
import ApiError from "../utils/ApiError.js";
import Category from "../models/Category.js";
import Item from "../models/Item.js";
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

// Lấy quán của chủ quán
export const getShopByOwnerService = async (ownerId) => {
    // SỬA Ở ĐÂY: Dùng find để lấy danh sách
    const shops = await Shop.find({ owner: ownerId });
    if (!shops || shops.length === 0) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User has no shops");
    }
    
    return shops;
};

// Cập nhật thông tin quán
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

// Cập nhật trạng thái mở/đóng quán
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

// Hàm lấy danh sách tất cả các quán để hiển thị trang chủ
export const getAllShopsService = async (options = {}) => {
    const page = parseInt(options.page) || 1; 
    const limit = parseInt(options.limit) || 10; 
    const skip = (page - 1) * limit; 
    const queryConditions = { isOpen: true }; // Chỉ lấy các shop đang mở cửa

    const shops = await Shop.find(queryConditions)
        .populate('owner', 'name email')
        .skip(skip)   // Bỏ qua các bản ghi của trang trước
        .limit(limit); // Giới hạn số lượng bản ghi của trang này

    const totalShops = await Shop.countDocuments(queryConditions);
    const totalPages = Math.ceil(totalShops / limit);

    return {
        data: shops,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: totalPages,
            totalItems: totalShops,
        },
    };
};

// Hàm lấy thông tin chi tiết 1 shop
export const getShopDetailService = async (shopId) => {
    // BƯỚC 1: Lấy thông tin Shop
    const shop = await Shop.findById(shopId).populate('owner', 'name email');
    if (!shop) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
    }

    const categories = await Category.find({ shopId: shopId }).sort({ displayOrder: 1 });
    const items = await Item.find({ shopId: shopId, isAvailable: true });

    const menu = categories.map(category => {
        const itemsByCategory = items.filter(item => 
            item.categoryId && item.categoryId.toString() === category._id.toString()
        );

        return {
            _id: category._id,
            name: category.name,
            items: itemsByCategory
        };
    });

    const otherItems = items.filter(item => !item.categoryId);
    if (otherItems.length > 0) {
        menu.push({
            _id: "other",
            name: "Món khác",
            items: otherItems
        });
    }

    return {
        shop,
        menu
    };
};
