import mongoose from "mongoose";
import Wallet from "../models/wallet.js";
import Transaction from "../models/transaction.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

// 1. Nạp tiền vào ví (Giả lập hoặc từ Gateway)

export const createWalletService = async (userId, pin) => {
    let wallet = await Wallet.findOne({ userId: userId });
    if (wallet) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Ví đã tồn tại cho người dùng này.");
    }
    wallet = new Wallet({ userId: userId, pin: pin, balance: 0 });
    await wallet.save();
    return wallet;
}

export const depositToWalletService = async (userId, amount) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (amount <= 0) throw new ApiError(StatusCodes.BAD_REQUEST, "Số tiền nạp phải lớn hơn 0");

        let wallet = await Wallet.findOne({ userId: userId }).session(session);
        if (!wallet) {
            wallet = new Wallet({ user: userId, balance: 0 });
        }
        // Logic cộng tiền

        wallet.balance += amount;
        await wallet.save({ session });

        // Tạo lịch sử giao dịch
        const transaction = await Transaction.create([{
            wallet: wallet._id,
            user: userId,
            amount: amount, // Số dương
            type: 'DEPOSIT',
            balanceAfter: wallet.balance
        }], { session });

        await session.commitTransaction();
        return { wallet, transaction: transaction[0] };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// 2. Trừ tiền để thanh toán đơn hàng (Được gọi từ OrderService)
// Hàm này KHÔNG commit transaction, nó nhận session từ OrderService truyền vào
export const processPaymentDeductionService = async (userId, amount, orderId, session) => {
    const wallet = await Wallet.findOne({ userId: userId }).session(session);

    if (!wallet) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Người dùng chưa kích hoạt ví.");
    }

    if (wallet.balance < amount) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Số dư ví không đủ để thanh toán.");
    }

    // Trừ tiền
    wallet.balance -= amount;
    await wallet.save({ session });

    // Lưu lịch sử
    const transaction = await Transaction.create([{
        wallet: wallet._id,
        amount: amount,
        type: 'PAYMENT',
        balanceAfter: wallet.balance,
        relatedOrder: orderId
    }], { session });

    return transaction[0]; // Trả về giao dịch để lưu vào Payment
};

// 3. Lấy lịch sử giao dịch
export const getTransactionHistoryService = async (userId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const transactions = await Transaction.find({ userId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Transaction.countDocuments({ userId: userId });

    return {
        transactions,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
    };
};

// 4. Lấy thông tin ví
export const getMyWalletInfoService = async (userId) => {
    let wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Ví không tồn tại cho người dùng này.");
    }
    return wallet;
};