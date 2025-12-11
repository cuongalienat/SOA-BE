import express from 'express';
import { getItems, getItemById, createItem, updateItem, deleteItem} from '../../controllers/itemController.js';
import { authMiddleware, isRestaurant } from "../../middlewares/authMiddlewares.js";


const router = express.Router();
router.get('/', getItems); // Lấy tất cả món ăn (có thể lọc theo nhà hàng)
router.get('/:id', getItemById);// Lấy chi tiết một món ăn
router.post('/', authMiddleware, isRestaurant, createItem);
router.put('/:id', authMiddleware, isRestaurant, updateItem);
router.delete('/:id', authMiddleware, isRestaurant, deleteItem);

export default router;