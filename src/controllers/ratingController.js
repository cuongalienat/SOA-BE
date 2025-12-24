import * as ratingServices from '../services/ratingServices.js';
import { StatusCodes } from 'http-status-codes';

export const createRating = async (req, res, next) => {
    try {
        // req.user.id được lấy từ token sau khi qua authMiddleware
        const userId = req.user._id || req.user.id;
        const rating = await ratingServices.createRatingService(userId, req.body);
        res.status(StatusCodes.CREATED).json({ message: "Rating submitted successfully", rating });
    } catch (error) {
        next(error);
    }
};

export const getRatingsByShop = async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { page, limit } = req.query;
        const result = await ratingServices.getRatingsByShopService(shopId, { page, limit });
        res.status(StatusCodes.OK).json(result);
    } catch (error) {
        next(error);
    }
};

export const getRatingsByItem = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const { page, limit } = req.query;
        const result = await ratingServices.getRatingsByItemService(itemId, { page, limit });
        res.status(StatusCodes.OK).json(result);
    } catch (error) {
        next(error);
    }
};

export const getRatingByOrderId = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const result = await ratingServices.getRatingByOrderIdService(orderId);
        res.status(StatusCodes.OK).json(result);
    } catch (error) {
        next(error);
    }
};