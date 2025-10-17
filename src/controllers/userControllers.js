import { getUserDataService, updateUserPhoneService, updateUserService, deleteUserService, promoteUserService } from "../services/userServices.js";
import { StatusCodes } from "http-status-codes";
export const getUserData = async (req, res, next) => {
    try {
        const { username } = req.query;
        const { user } = await getUserDataService(username);
        res.status(StatusCodes.OK).json({
            message: "User data fetched successfully",
            user: {
                username: user.username,
                name: user.name,
                email: user.email,
                age: user.age,
                phone: user.phone,
            }
        });
    } catch (error) {
        next(error);
    }
}

export const updateUserPhone = async (req, res, next) => {
    try {
        const { username, phone } = req.body;

        if (!username || !phone) {
            return res.status(400).json({ message: "username and phone are required" });
        }

        const { user } = await updateUserPhoneService(username, phone);

        res.status(200).json({
            message: "Phone updated successfully",
            user: {
                username: user.username,
                phone: user.phone,
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { username, password, email, age, phone } = req.body;

        if (!username || !password || !email || !age || !phone) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const { user } = await updateUserService(username, { password, email, age, phone });

        res.status(200).json({
            message: "User updated successfully",
            user: {
                email: user.email,
                age: user.age,
                phone: user.phone
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const { username } = req.query;

        if (!username) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Username is required" });
        }

        await deleteUserService(username);

        res.status(StatusCodes.OK).json({
            message: "User deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const promoteUser = async (req, res, next) => {
    try {
        const { email } = req.body;
        await promoteUserService(email);
        res.status(StatusCodes.OK).json({
            message: "turn user into shop successfully",
            email: email
        });
    } catch (error) {
        next(error);
    }
}