import User from "../models/user.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

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
