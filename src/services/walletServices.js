import mongoose from "mongoose";
import Wallet from "../models/wallet.js";
import Transaction from "../models/transaction.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";
import Payment from "../models/payment.js";
import dotenv from "dotenv";
dotenv.config();


export const createWalletService = async (userId, pin) => {
    let wallet = await Wallet.findOne({ userId: userId });
    if (wallet) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Ví đã tồn tại cho người dùng này.");
    }
    wallet = new Wallet({ userId: userId, pin: pin, balance: 0 });
    await wallet.save();
    return wallet;
}
// 3. Lấy lịch sử giao dịch
export const getTransactionHistoryService = async (userId, page = 1, limit = 10) => {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Lấy từ Payment
    const payments = await Payment.find({ user: userId })
        .select('amount type createdAt')
        .lean();

    // Lấy từ Transaction
    const transactions = await Transaction.find({
        $or: [{ senderID: userId }, { receiverID: userId }]
    })
        .select('amount type createdAt')
        .lean();

    // Gộp và sắp xếp
    const allHistory = [...payments, ...transactions];
    allHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Phân trang
    const total = allHistory.length;
    const paginatedHistory = allHistory.slice(skip, skip + limitNum);

    return {
        transactions: paginatedHistory,
        total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum
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

export const createTransactionUserToAdmin = async (userId, amount, orderId, session = null) => {
    const adminId = process.env.ADMIN_ID;
    console.log(adminId);
    // Tìm ví với session (nếu có)
    let walletUser = await Wallet.findOne({ userId: userId }).session(session);
    let walletAdmin = await Wallet.findOne({ userId: adminId }).session(session);

    if (!walletUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Ví không tồn tại cho người dùng này.");
    }

    // Cập nhật tiền trong 

    walletUser.balance -= amount;
    await walletUser.save({ session });

    walletAdmin.balance += amount;
    await walletAdmin.save({ session });

    // Lưu giao dịch
    // Transaction.create trả về mảng nếu dùng option, hoặc object. 
    // Dùng create([doc], { session }) buộc trả về array.
    const transactionData = {
        senderID: userId,
        receiverID: adminId,
        type: 'ORDER_PAYMENT', // Sửa từ biến ORDER_PAYMENT chưa định nghĩa thành string hoặc constant import
        amount: amount,
        status: "Completed",
        senderBalanceBefore: walletUser.balance + amount,
        senderBalanceAfter: walletUser.balance,
        receiverBalanceBefore: walletAdmin.balance - amount,
        receiverBalanceAfter: walletAdmin.balance,
        relatedOrder: orderId,
        description: "Thanh toán đơn hàng"
    };

    const result = await Transaction.create([transactionData], { session });
    return result[0];
}

export const createTransactionAdminToUser = async (userId, amount, orderId) => {
    const adminId = process.env.ADMIN_ID;
    let walletUser = await Wallet.findOne({ userId: userId });
    let walletAdmin = await Wallet.findOne({ userId: adminId });
    if (!walletUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Ví không tồn tại cho người dùng này.");
    }

    // Cập nhật tiền trong ví
    walletUser.balance += amount;
    await walletUser.save();
    walletAdmin.balance -= amount;
    await walletAdmin.save();

    // Lưu giao dịch
    const transactionAdminToUser = await Transaction.create({
        senderID: adminId,
        receiverID: userId,
        type: "ORDER_REFUND",
        amount: amount,
        status: "Completed",
        senderBalanceBefore: walletAdmin.balance + amount,
        senderBalanceAfter: walletAdmin.balance,
        receiverBalanceBefore: walletUser.balance - amount,
        receiverBalanceAfter: walletUser.balance,
        relatedOrder: orderId,
        description: "Hoàn tiền cho đơn hàng bị hủy"
    })

    return transactionAdminToUser;
}

export const createTransactionAdminToShipper = async (shipperId, orderId) => {
    const adminId = process.env.ADMIN_ID;
    let walletShipper = await Wallet.findOne({ userId: shipperId });
    let walletAdmin = await Wallet.findOne({ userId: adminId });
    if (!walletShipper) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Ví không tồn tại cho người dùng này.");
    }
    let order = await Order.findOne({ _id: orderId });
    if (!order) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Đơn hàng không tồn tại.");
    }

    // Cập nhật tiền trong ví
    let amount = order.shippingFee;
    walletShipper.balance += amount;
    await walletShipper.save();
    walletAdmin.balance -= amount;
    await walletAdmin.save();

    // Lưu giao dịch
    const transactionAdminToShipper = await Transaction.create({
        senderID: adminId,
        receiverID: shipperId,
        type: "SHIPPER_PAYOUT",
        amount: amount,
        status: "Completed",
        senderBalanceBefore: walletAdmin.balance + amount,
        senderBalanceAfter: walletAdmin.balance,
        receiverBalanceBefore: walletShipper.balance - amount,
        receiverBalanceAfter: walletShipper.balance,
        relatedOrder: orderId,
        description: "Thanh toán phí giao hàng"
    })

    return transactionAdminToShipper;
}

export const createTransactionAdminToShop = async (shopId, orderId) => {
    const adminId = process.env.ADMIN_ID;
    let walletShop = await Wallet.findOne({ userId: shopId });
    let walletAdmin = await Wallet.findOne({ userId: adminId });
    if (!walletShop) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Ví không tồn tại cho người dùng này.");
    }
    let order = await Order.findOne({ _id: orderId });
    if (!order) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Đơn hàng không tồn tại.");
    }

    // Cập nhật tiền trong ví
    let amount = order.totalAmount - order.shippingFee;
    walletShop.balance += amount;
    await walletShop.save();
    walletAdmin.balance -= amount;
    await walletAdmin.save();

    // Lưu giao dịch
    const transactionAdminToShop = await Transaction.create({
        senderID: adminId,
        receiverID: shopId,
        type: "SHOP_PAYOUT",
        amount: amount,
        status: "Completed",
        senderBalanceBefore: walletAdmin.balance + amount,
        senderBalanceAfter: walletAdmin.balance,
        receiverBalanceBefore: walletShop.balance - amount,
        receiverBalanceAfter: walletShop.balance,
        relatedOrder: orderId,
        description: "Thanh toán phí shop"
    })

    return transactionAdminToShop;
}

export const checkPinService = async (userID, pin) => {
    let wallet = await Wallet.findOne({ userId: userID });
    if (!wallet) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Ví không tồn tại cho người dùng này.");
    }
    return wallet.comparePin(pin);
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
        const payment = await Payment.create([{
            user: userId,
            amount: amount, // Số dương
            type: 'DEPOSIT',
            status: 'COMPLETED',
            balanceBefore: wallet.balance - amount,
            balanceAfter: wallet.balance,
        }], { session });

        await session.commitTransaction();
        return { wallet, payment: payment[0] };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const withdrawFromWalletService = async (userId, amount) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (amount <= 0) throw new ApiError(StatusCodes.BAD_REQUEST, "Số tiền rút phải lớn hơn 0");

        let wallet = await Wallet.findOne({ userId: userId }).session(session);
        if (!wallet) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Ví không tồn tại cho người dùng này.");
        }
        if (wallet.balance < amount) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Số dư không đủ để rút tiền.");
        }
        // Logic trừ tiền

        wallet.balance -= amount;
        await wallet.save({ session });

        // Tạo lịch sử giao dịch
        const payment = await Payment.create([{
            user: userId,
            amount: amount, // Số âm
            type: 'WITHDRAW',
            status: 'COMPLETED',
            balanceBefore: wallet.balance + amount,
            balanceAfter: wallet.balance,
        }], { session });

        await session.commitTransaction();
        return { wallet, payment: payment[0] };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};