import express from 'express';
import { deliveryController } from '../../controllers/deliveryController.js';

// import { authMiddleware } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Route: /api/v1/deliveries

router.route('/').post(deliveryController.createNewDelivery); // Tạo đơn giao hàng
router.route('/:id').get(deliveryController.getDeliveryDetails); // Xem chi tiết
router.route('/:id/accept').patch(deliveryController.acceptDelivery); // Tài xế nhận đơn
router.route('/:id/status').patch(deliveryController.updateDeliveryStatus); // Cập nhật vị trí/trạng thái

export default router;