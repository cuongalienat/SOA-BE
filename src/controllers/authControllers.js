import { forgetPasswordService, signInService, signUpService } from "../services/authServices.js";
import { StatusCodes } from 'http-status-codes';
import ApiError from "../utils/ApiError.js";

export const signUp = async (req, res, next) => {
    try {
        const { user } = await signUpService(req.body);
        res.status(StatusCodes.CREATED).json({
            message: "User registered successfully",
            user: {
                id: user._id,
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

export const signIn = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const { user, token } = await signInService(username, password);

        res.status(StatusCodes.OK).json({
            message: "Login successful",
            token,
            user: { id: user._id, email: user.email, username: user.username, role: user.role },
        });
    } catch (error) {
        next(error);
    }
}

export const forgetPassword = async (req, res, next) => {
    try {
        const userData = req.body;
        const user = await forgetPasswordService(userData);
        res.status(StatusCodes.OK).json({
            message: "Change password successful",
            user: { id: user._id, email: user.email, username: user.username, role: user.role },
        });
    } catch (error) {
        next(error);
    }
}