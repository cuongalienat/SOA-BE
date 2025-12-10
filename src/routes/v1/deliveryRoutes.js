import express from 'express';
import { deliveryController } from '../../controllers/deliveryController.js';

import { authMiddleware } from '../../middlewares/authMiddlewares.js';

const router = express.Router();

// Route: /api/v1/deliveries

router.route('/').post(deliveryController.createNewDelivery); // Tạo đơn giao hàng
router.route('/nearby')
    .get(authMiddleware, deliveryController.getNearbyOrders);
router.route('/current-job').get(authMiddleware, deliveryController.getCurrentJob);
router.route('/:id').get(authMiddleware, deliveryController.getDeliveryDetails); // Xem chi tiết
router.route('/:id').patch(authMiddleware, deliveryController.updateDelivery)
export const deliveryRoutes = router;
export default router;