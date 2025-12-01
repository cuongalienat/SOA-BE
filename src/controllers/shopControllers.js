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
        const shop = await shopServices.getShopByOwnerService(req.user.id);
        res.status(StatusCodes.OK).json({ shop });
    } catch (error) {
        next(error);
    }
};

export const updateMyShop = async (req, res, next) => {
    try {
        // Chỉ cho phép cập nhật: name, address, phone, coverImage, qrImage
        const { name, address, phone, coverImage, qrImage } = req.body;
        const shop = await shopServices.updateShopService(req.user.id, { name, address, phone, coverImage, qrImage });
        
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

// --- HÀM MỚI ---
export const getShopById = async (req, res, next) => {
    try {
        const shop = await shopServices.getShopByIdService(req.params.id);
        res.status(StatusCodes.OK).json({ shop });
    } catch (error) {
        next(error);
    }
};