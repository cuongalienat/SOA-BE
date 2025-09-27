import express from "express";
import { StatusCodes } from "http-status-codes";
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js'

const Router = express.Router();

// Test route
Router.get("/status", (req, res) => {
    res
        .status(StatusCodes.OK)
        .json({ message: "APIs are ready to use" });
});

// route con
Router.use("/auth", authRoutes);
Router.use("/user", userRoutes);

export const APIs = Router;
