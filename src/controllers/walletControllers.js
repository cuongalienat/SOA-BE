import * as walletService from "../services/walletServices.js";
import { StatusCodes } from "http-status-codes";


export const createWallet = async (req, res, next) => {
    try {

        const userId = req.user._id;
        console.log(req.user._id);
        const pin = req.body.pin;
        const wallet = await walletService.createWalletService(userId, pin);
        res.status(StatusCodes.OK).json({ success: true, data: wallet });
    } catch (error) {
        next(error);
    }
};

// Lấy thông tin ví (Số dư)
export const getMyWallet = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const wallet = await walletService.getMyWalletInfoService(userId);
        res.status(StatusCodes.OK).json({ success: true, data: wallet });
    } catch (error) {
        next(error);
    }
};

export const depositMoney = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { amount } = req.body; // Frontend gửi lên: { amount: 500000 }
        const result = await walletService.depositToWalletService(userId, amount);

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Nạp tiền thành công!",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const withdrawMoney = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { amount } = req.body; // Frontend gửi lên: { amount: 500000 }
        const result = await walletService.withdrawFromWalletService(userId, amount);

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Rút tiền thành công!",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Xem lịch sử giao dịch
export const getHistory = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { page, limit } = req.query;
        const result = await walletService.getTransactionHistoryService(userId, page, limit);

        res.status(StatusCodes.OK).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};