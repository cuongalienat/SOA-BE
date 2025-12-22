import express from "express";
import { StatusCodes } from "http-status-codes";
import authRoutes from './authRoutes.js';
import orderRoutes from './orderRoutes.js';
import userRoutes from './userRoutes.js';
import itemRoutes from './itemRoutes.js';
import shopRoutes from './shopRoutes.js';
import deliveryRoutes from './deliveryRoutes.js';
import ratingRoutes from './ratingRoutes.js';
import walletRoutes from './walletRoutes.js';
import shippingRoutes from './shippingRoutes.js';
import shipperRoutes from './shipperRoutes.js'

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
Router.use("/shops", shopRoutes);
Router.use("/items", itemRoutes);
Router.use("/deliveries", deliveryRoutes)
Router.use("/ratings", ratingRoutes);
Router.use("/shippings", shippingRoutes);
Router.use("/shippers", shipperRoutes)
Router.use("/wallets", walletRoutes);

export const APIs_v1 = Router;
