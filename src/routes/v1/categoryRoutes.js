import express from "express";
import { authMiddleware, isRestaurant } from "../../middlewares/authMiddlewares.js";
import {
	getCategoryById,
	createCategory,
	deleteCategory,
	getCategories,
	updateCategory,
} from "../../controllers/categoryController.js";

const router = express.Router();

router.get("/:id", getCategoryById);
router.get("/", authMiddleware, isRestaurant, getCategories);
router.post("/", authMiddleware, isRestaurant, createCategory);
router.put("/:id", authMiddleware, isRestaurant, updateCategory);
router.delete("/:id", authMiddleware, isRestaurant, deleteCategory);

export default router;
