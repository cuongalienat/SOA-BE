import express from "express";
import { StatusCodes } from "http-status-codes";
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js'
import orderRoutes from './orderRoutes.js';

const Router = express.Router();

// Test route
Router.get("/status", (req, res) => {
    res
        .status(StatusCodes.OK)
        .json({ message: "APIs are ready to use" });
});

// route con
Router.use("/auths", authRoutes);
Router.use("/users", userRoutes);
Router.use("/orders", orderRoutes);

export const APIs_v1 = Router;
