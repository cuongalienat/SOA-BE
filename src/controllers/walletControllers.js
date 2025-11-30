import * as walletService from "../services/walletService.js";
import { StatusCodes } from "http-status-codes";

// Lấy thông tin ví (Số dư)
export const getMyWallet = async (req, res, next) => {
    try {
        const wallet = await walletService.getMyWalletInfoService(req.user._id);
        res.status(StatusCodes.OK).json({ success: true, data: wallet });
    } catch (error) {
        next(error);
    }
};

// Nạp tiền (Dùng để test demo)
export const depositMoney = async (req, res, next) => {
    try {
        const { amount } = req.body; // Frontend gửi lên: { amount: 500000 }
        const result = await walletService.depositToWalletService(req.user._id, amount);

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Nạp tiền thành công!",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Xem lịch sử giao dịch
export const getHistory = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const result = await walletService.getTransactionHistoryService(req.user._id, page, limit);

        res.status(StatusCodes.OK).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};