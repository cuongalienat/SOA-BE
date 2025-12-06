// src/routes/v1/shippingRoutes.js
import express from 'express';
import { calculateFee } from '../../controllers/shippingController.js';

const router = express.Router();

router.post('/calculate', calculateFee);

export default router;