import express from "express";
import { createAdmin, forgetPassword, signIn, signUp } from "../../controllers/authControllers.js"

const router = express.Router();

router.post("/signup", signUp)

router.post("/signin", signIn)

router.patch("/signup", forgetPassword)

router.post("/admin", createAdmin)

export default router;