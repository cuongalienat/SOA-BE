import User from "../models/user.js";
import { StatusCodes } from "http-status-codes";
import ApiError from "../utils/ApiError.js";

export const getUserDataService = async (username) => {
    const userData = await User.findOne({ username });
    if (!userData) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    const { password, ...userWithoutPassword } = userData.toObject();

    return {
        user: userWithoutPassword
    }
}

export const updateUserService = async (username, newData) => {
    const user = await User.findOne({ username });
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    user.phone = newData.phone;
    user.address = newData.address;

    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();
    return {
        user: userWithoutPassword
    };
};

export const deleteUserService = async (username) => {
    const user = await User.findOneAndDelete({ username });
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    return;
};

export const promoteUserService = async (email, role) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    if (user.role === "restaurant_manager") {
        throw new ApiError(StatusCodes.CONFLICT, "User is already restaurant");
    }
    user.role = "restaurant_manager";
    await user.save();
    return {
        email: user.email
    };
}