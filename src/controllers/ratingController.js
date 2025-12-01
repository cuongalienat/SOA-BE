import * as ratingServices from '../services/ratingServices.js';
import { StatusCodes } from 'http-status-codes';

export const createRating = async (req, res, next) => {
    try {
        // req.user.id được lấy từ token sau khi qua authMiddleware
        const rating = await ratingServices.createRatingService(req.user.id, req.body);
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