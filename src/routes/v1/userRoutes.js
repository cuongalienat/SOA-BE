import express from "express";
import { getUserData, updateUserPhone, updateUser, deleteUser, promoteUser } from "../../controllers/userControllers.js";
import { authMiddleware, isAdmin } from "../../middlewares/authMiddlewares.js";

const router = express.Router();

router.get("/", authMiddleware, getUserData)
router.put("/", authMiddleware, updateUser)
router.patch("/", authMiddleware, updateUserPhone)
router.delete("/", authMiddleware, deleteUser)

router.patch("/roles", authMiddleware, isAdmin, promoteUser)

export default router