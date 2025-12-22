import express from 'express';
import { getItems, getItemById, createItem, updateItem, deleteItem} from '../../controllers/itemController.js';
import { authMiddleware, isRestaurant } from "../../middlewares/authMiddlewares.js";
import uploadItem from "../../middlewares/uploadItemCloud.js";


const router = express.Router();
router.get('/', getItems); // Lấy tất cả món ăn (có thể lọc theo nhà hàng)
router.get('/:id', getItemById);// Lấy chi tiết một món ăn
router.post(
	'/',
	authMiddleware,
	isRestaurant,
	uploadItem.fields([
		{ name: "image", maxCount: 1 },
		{ name: "imageUrl", maxCount: 1 }
	]),
	createItem
);
router.put(
	'/:id',
	authMiddleware,
	isRestaurant,
	uploadItem.fields([
		{ name: "image", maxCount: 1 },
		{ name: "imageUrl", maxCount: 1 }
	]),
	updateItem
);
router.delete('/:id', authMiddleware, isRestaurant, deleteItem);

export default router;