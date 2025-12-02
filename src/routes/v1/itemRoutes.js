import express from 'express';
import { getAllItems, getItemById, createItem, updateItem, deleteItem, getItemsByName,getItemsByAddress } from '../../controllers/itemController.js';
import { authMiddleware, isRestaurant } from "../../middlewares/authMiddlewares.js";


const router = express.Router();
router.get('/search/name', getItemsByName);       // GET /api/items/search/name?keyword=...
router.get('/search/address', getItemsByAddress); // GET /api/items/search/address?keyword=...
router.get('/', getAllItems); // Lấy tất cả món ăn (có thể lọc theo nhà hàng)
router.get('/:id', getItemById);// Lấy chi tiết một món ăn
router.post('/', authMiddleware, isRestaurant, createItem);
router.put('/:id', authMiddleware, isRestaurant, updateItem);
router.delete('/:id', authMiddleware, isRestaurant, deleteItem);

export default router;