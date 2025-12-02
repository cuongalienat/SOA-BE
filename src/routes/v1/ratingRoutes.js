import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddlewares.js';
import { createRating, getRatingsByShop } from '../../controllers/ratingController.js';

const router = express.Router();

/**
 * @route POST /v1/ratings
 * @description User creates a new rating for a completed order.
 * @access Private (Requires login)
 */
router.post('/', authMiddleware, createRating);

/**
 * @route GET /v1/ratings/shop/:shopId
 * @description Get all ratings for a specific shop with pagination.
 * @access Public
 */
router.get('/shop/:shopId', getRatingsByShop);

export default router;