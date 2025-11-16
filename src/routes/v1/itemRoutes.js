import express from 'express';
import {getAllItems, getItemById, createItem, updateItem, deleteItem } from '../../controllers/itemController.js';
import { authMiddleware, isAdmin } from "../../middlewares/authMiddlewares.js";


const router = express.Router();

router.get('/', getAllItems); // Lấy tất cả món ăn (có thể lọc theo nhà hàng)
router.get('/:id', getItemById);// Lấy chi tiết một món ăn
router.post('/', authMiddleware, isAdmin, createItem);
router.put('/:id', authMiddleware, isAdmin, updateItem);
router.delete('/:id', authMiddleware, isAdmin, deleteItem);

export default router;