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
export const getMyShopDashboard = async (req, res, next) => {
    try {
        const dashboard = await shopServices.getMyShopDashboardService(req.user.id);
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Get shop dashboard successfully",
            data: dashboard
        });
    } catch (error) {
        next(error);
    }
};

export const updateMyShop = async (req, res, next) => {
    try {
        const updateData = {};

        /* ===== TEXT FIELDS ===== */
        if (req.body.name) updateData.name = req.body.name;
        if (req.body.address) updateData.address = req.body.address;

        // Phones: FE gửi phones[]
        if (req.body["phones[]"]) {
            updateData.phones = Array.isArray(req.body["phones[]"])
                ? req.body["phones[]"]
                : [req.body["phones[]"]];
        }

        /* ===== FILES FROM CLOUDINARY ===== */
        if (req.files?.coverImage?.[0]) {
            updateData.coverImage = req.files.coverImage[0].path; // URL string
        }

        if (req.files?.qrImage?.[0]) {
            updateData.qrImage = req.files.qrImage[0].path;
        }

        /* ===== OPTIONAL FIELDS ===== */
        if (req.body.photos) updateData.photos = req.body.photos;
        if (req.body.openingHours) updateData.openingHours = req.body.openingHours;
        if (req.body.priceRange) updateData.priceRange = req.body.priceRange;

        const shop = await shopServices.updateShopService(
            req.user.id,
            updateData
        );

        res.status(200).json({
            success: true,
            data: shop,
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

export const getShopDashboard = async (req, res, next) => {
    try {
        const shop = await shopServices.getShopDashboardService(req.params.id);
        res.status(StatusCodes.OK).json(shop);
    } catch (error) {
        next(error);
    }
};