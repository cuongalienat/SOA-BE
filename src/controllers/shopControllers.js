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

export const getMyShop = async (req, res, next) => {
    try {
        const shops = await shopServices.getShopByOwnerService(req.user.id);

        // Trả về { shops: [...] } thay vì { shop: ... }
        res.status(StatusCodes.OK).json({
            success: true,
            data: shops[0] // Giả sử chỉ lấy shop đầu tiên nếu có nhiều shop
        });
    } catch (error) {
        next(error);
    }
};

export const updateMyShop = async (req, res, next) => {
    try {
        // Cho phép cập nhật tất cả các trường mới
        // Lưu ý: userId lấy từ token để đảm bảo chỉ sửa quán của mình
        const updateData = req.body;

        // Tốt nhất nên lọc bớt các trường nhạy cảm không cho sửa (VD: owner, rating, isVerified...)
        const allowedUpdates = {
            name: updateData.name,
            address: updateData.address,
            phone: updateData.phone,
            coverImage: updateData.coverImage,
            photos: updateData.photos,             // <-- Thêm cái này
            openingHours: updateData.openingHours, // <-- Thêm cái này
            priceRange: updateData.priceRange,     // <-- Thêm cái này
            qrImage: updateData.qrImage
        };

        Object.keys(allowedUpdates).forEach(key => allowedUpdates[key] === undefined && delete allowedUpdates[key]);

        const shop = await shopServices.updateShopService(req.user.id, allowedUpdates);

        res.status(StatusCodes.OK).json({
            message: "Shop updated successfully",
            shop
        });
    } catch (error) {
        next(error);
    }
};

export const updateShopStatus = async (req, res, next) => {
    try {
        const { isOpen } = req.body;

        // Validate cơ bản
        if (typeof isOpen !== 'boolean') {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "isOpen must be a boolean" });
        }

        const shop = await shopServices.updateShopStatusService(req.user.id, isOpen);
        res.status(StatusCodes.OK).json({
            message: `Shop is now ${isOpen ? 'Open' : 'Closed'}`,
            shop
        });
    } catch (error) {
        next(error);
    }
};

export const getAllShops = async (req, res, next) => {
    try {
        // Lấy page và limit từ query parameters của URL
        const { page, limit } = req.query;

        // Truyền các tùy chọn này vào service
        const result = await shopServices.getAllShopsService({ page, limit });

        // Trả về kết quả đã bao gồm thông tin phân trang
        res.status(StatusCodes.OK).json(result);
    } catch (error) {
        next(error);
    }
};

// src/controllers/shopControllers.js

export const getShopDetails = async (req, res, next) => {
    try {
        // Gọi hàm service mới update
        const data = await shopServices.getShopDetailService(req.params.id);

        // Trả về cục data to đùng gồm Shop + Menu
        res.status(StatusCodes.OK).json(data);
    } catch (error) {
        next(error);
    }
};

export const getShopByID = async (req, res, next) => {
    try {
        const shop = await shopServices.getShopByIDService(req.params.id);
        res.status(StatusCodes.OK).json(shop);
    } catch (error) {
        next(error);
    }
};