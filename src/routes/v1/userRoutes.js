import express from "express";
import { getUserData, updateUserPhone, updateUser, deleteUser } from "../../controllers/userControllers.js";
import { authMiddleware } from "../../middlewares/authMiddlewares.js";

const router = express.Router();

router.get("/", authMiddleware, getUserData)
router.put("/", authMiddleware, updateUser)
router.patch("/", authMiddleware, updateUserPhone)
router.delete("/", authMiddleware, deleteUser)

export default router