import User from "../models/user.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

export const createAdminService = async (adminData) => {
    const {
        username, password, email, name, age, phone, role
    } = adminData;
    const admin = await User.findOne({ username });
    if (admin) {
        throw new ApiError(StatusCodes.CONFLICT, "Admin already existed");
    }

    const newAdmin = User.create({ username, password, email, name, age, phone, role });
    if (!newAdmin) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to create admin");
    }
    return;
}

export const signUpService = async (userData) => {
    const {
        username, password, email, name, age, phone
    } = userData;

    // Check trùng Username và Email
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        throw new ApiError(StatusCodes.CONFLICT, "Username already registered");
    }
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
        throw new ApiError(StatusCodes.CONFLICT, "Email already registered");
    }

    // Tạo user mới
    const newUser = await User.create(
        { username, password, email, name, age, phone }
    );
    if (!newUser) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to create user");
    }

    const { password: _, ...userWithoutPassword } = newUser.toObject();
    return {
        user: userWithoutPassword
    }
}

export const signInService = async (username, password) => {
    const user = await User.findOne({ username });
    if (!user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
    }

    // Tạo JWT
    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return { user, token };
};

export const forgetPasswordService = async (userData) => {
    const { username, email, new_password, confirm_password } = userData;

    const user = await User.findOne({ username });
    if (!user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid user");
    }

    if (email !== user.email) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Wrong email");
    }

    if (new_password !== confirm_password) {
        throw new ApiError(StatusCodes.CONFLICT, "Passwords do not match");
    }

    await user.save();
    const { password: _, ...userWithoutPassword } = user.toObject();
    return {
        user: userWithoutPassword
    }
};