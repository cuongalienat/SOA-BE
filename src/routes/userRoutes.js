import express from "express";
import { getUserData, updateUserPhone, updateUser, deleteUser } from "../controllers/userControllers.js";

const router = express.Router();

router.get("/getUserData", getUserData)
router.put("/updateUserData", updateUser)
router.patch("/updateUserPhone", updateUserPhone)
router.delete("/deleteUserData", deleteUser)

export default router