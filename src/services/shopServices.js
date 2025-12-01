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

export const getAllShopsService = async (options = {}) => {
    // 1. Thiết lập giá trị mặc định cho phân trang
    const page = parseInt(options.page) || 1; // Mặc định là trang 1
    const limit = parseInt(options.limit) || 10; // Mặc định là 10 shop mỗi trang
    const skip = (page - 1) * limit; // Tính toán số lượng bản ghi cần bỏ qua

    // 2. Tạo điều kiện truy vấn
    const queryConditions = { isOpen: true }; // Chỉ lấy các shop đang mở cửa

    // 3. Lấy dữ liệu của trang hiện tại
    const shops = await Shop.find(queryConditions)
        .populate('owner', 'name email')
        .skip(skip)   // Bỏ qua các bản ghi của trang trước
        .limit(limit); // Giới hạn số lượng bản ghi của trang này

    // 4. Lấy tổng số lượng bản ghi để tính tổng số trang
    const totalShops = await Shop.countDocuments(queryConditions);
    const totalPages = Math.ceil(totalShops / limit);

    // 5. Trả về một đối tượng chứa cả dữ liệu và thông tin phân trang
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
// --- SERVICE MỚI ---
export const getShopByIdService = async (shopId) => {
    const shop = await Shop.findById(shopId).populate('owner', 'name email');
    if (!shop) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
    }
    // Sau này, bạn có thể lấy thêm cả menu của shop ở đây
    return shop;
};