import { createVNPayUrlService, verifyReturnUrlService } from "../services/paymentServices.js";
import { updateOrderStatusService } from "../services/orderServices.js";
import Order from "../models/order.js";
import Payment from "../models/payment.js";
import { StatusCodes } from "http-status-codes";
import ApiError from "../utils/ApiError.js";

export const createPaymentUrl = async (req, res, next) => {
    try {
        const { amount, orderId, orderInfo } = req.body;
        // Basic validation
        if (!amount || !orderId) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Amount and OrderId are required.");
        }

        const url = createVNPayUrlService(req, amount, orderId, orderInfo || "Thanh toan don hang");

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Successfully generated payment URL",
            data: { url }
        });
    } catch (error) {
        next(error);
    }
};

export const vnpayReturn = async (req, res, next) => {
    try {
        let vnp_Params = req.query;
        const result = verifyReturnUrlService(vnp_Params);

        if (!result) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Checksum");
        }

        const { isSuccess, orderId } = result;

        if (isSuccess) {
            // 1. Update Order Status
            // Note: Ensure orderId is valid
            const order = await Order.findById(orderId);
            if (!order) {
                // Even if order not found, signature was valid, but this is weird.
                return res.status(StatusCodes.NOT_FOUND).json({ message: "Order not found" });
            }

            if (order.status === 'Pending') {
                await updateOrderStatusService(orderId, 'Confirmed');

                // 2. Update Payment Status if exists
                if (order.payment) {
                    await Payment.findByIdAndUpdate(order.payment, { status: 'Completed' });
                }
            }

            // Redirect to Frontend Success Page
            // You might want to configure this URL in .env
            // For now, redirect to a generic success page or just return JSON if testing
            res.redirect(`http://localhost:5173/order-success/${orderId}`);
            // Assuming Frontend is on port 5173
        } else {
            // Failed
            res.redirect(`http://localhost:5173/order-failed`);
        }
    } catch (error) {
        next(error);
    }
};

export const vnpayIpn = async (req, res, next) => {
    try {
        let vnp_Params = req.query;
        const result = verifyReturnUrlService(vnp_Params);

        if (!result) {
            return res.status(200).json({ RspCode: '97', Message: 'Invalid Checksum' });
        }

        const { isSuccess, orderId } = result;
        // In IPN, you should check Order status in DB before updating to avoid double update

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
        }

        if (isSuccess) {
            if (order.status === 'Pending') {
                await updateOrderStatusService(orderId, 'Confirmed');
                if (order.payment) {
                    await Payment.findByIdAndUpdate(order.payment, { status: 'Completed' });
                }
                return res.status(200).json({ RspCode: '00', Message: 'Success' });
            } else {
                return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
            }
        } else {
            // Payment failed logic?
            return res.status(200).json({ RspCode: '00', Message: 'Success' }); // Handled failure
        }

    } catch (error) {
        console.error("IPN Error:", error);
        return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
};
