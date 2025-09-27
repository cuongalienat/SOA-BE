import { signUpService } from "../services/authServices.js";
import { StatusCodes } from 'http-status-codes';

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