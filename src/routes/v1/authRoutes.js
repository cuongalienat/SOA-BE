import express from "express";
import { createAdmin, forgetPassword, signIn, signUp, verifyUser } from "../../controllers/authControllers.js"

const router = express.Router();

router.post("/signup", signUp)
router.post("/signin", signIn)
router.patch("/signup", forgetPassword)
router.patch("/verify", verifyUser)
router.post("/admin", createAdmin)

export default router;