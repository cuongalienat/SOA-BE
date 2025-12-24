import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddlewares.js';
import { createRating, getRatingsByShop, getRatingsByItem, getRatingByOrderId } from '../../controllers/ratingController.js';

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

/**
 * @route GET /v1/ratings/item/:itemId
 * @description Get all ratings for a specific item with pagination.
 * @access Public
 */
router.get('/item/:itemId', getRatingsByItem);

/**
 * @route GET /v1/ratings/order/:orderId
 * @description Get rating by order ID.
 * @access Public
 */
router.get('/order/:orderId', getRatingByOrderId);

export default router;