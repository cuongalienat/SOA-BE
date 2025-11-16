import express from "express";
import { StatusCodes } from "http-status-codes";
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js'
import shopRoutes from './shopRoutes.js';

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
Router.use("/shops", shopRoutes);

export const APIs_v1 = Router;
