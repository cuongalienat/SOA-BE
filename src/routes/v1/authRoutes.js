import express from "express";
import { createAdmin, forgetPassword, resendOTP, signIn, signUp, verifyUser } from "../../controllers/authControllers.js"

const router = express.Router();

router.post("/signup", signUp)
router.post("/signin", signIn)
router.patch("/reset-password", forgetPassword)
router.patch("/verify", verifyUser)
router.patch("/resend-verification", resendOTP)
router.post("/admin", createAdmin)

export default router;