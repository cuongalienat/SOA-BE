import express from 'express';
import { deliveryController } from '../../controllers/deliveryController.js';

import { authMiddleware } from '../../middlewares/authMiddlewares.js';

const router = express.Router();

// Route: /api/v1/deliveries

router.route('/').post(deliveryController.createNewDelivery); // Tạo đơn giao hàng
router.route('/nearby')
    .get(authMiddleware, deliveryController.getNearbyOrders);
router.route('/current-job').get(authMiddleware, deliveryController.getCurrentJob);
router.route('/:id').get(deliveryController.getDeliveryDetails); // Xem chi tiết
router.route('/:id/accept').patch(authMiddleware, deliveryController.acceptDelivery);
router.route('/:id/status').patch(authMiddleware, deliveryController.updateDeliveryStatus); // Cập nhật vị trí/trạng thái
export const deliveryRoutes = router;
export default router;