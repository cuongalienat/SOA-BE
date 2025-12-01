import { createAdminService, forgetPasswordService, signInService, signUpService, verifyUserService, resendOTPService, signInWithGoogleService } from "../services/authServices.js";
import { StatusCodes } from 'http-status-codes';

export const signUp = async (req, res, next) => {
    try {
        const { user } = await signUpService(req.body);
        res.status(StatusCodes.CREATED).json({
            message: "Đăng ký thành công",
            user: user
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
            message: "Đăng nhập thành công",
            token: token,
            user: user,
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
            message: "Đổi mật khẩu thành công",
            user: user,
        });
    } catch (error) {
        next(error);
    }
}

export const createAdmin = async (req, res, next) => {
    try {
        const adminData = {
            username: process.env.ADMIN_USERNAME,
            password: process.env.ADMIN_PASSWORD,
            email: " ",
            name: " ",
            age: " ",
            phone: " ",
            role: "admin"
        }
        await createAdminService(adminData);

        res.status(StatusCodes.OK).json({
            message: "Create admin successful"
        });
    } catch (error) {
        next(error);
    }
}

export const verifyUser = async (req, res, next) => {
    try {
        const { email, otpCode } = req.body;
        await verifyUserService(email, otpCode);
        res.status(StatusCodes.OK).json({
            message: "Xác thực tài khoản thành công",
            email: email
        });
    } catch (error) {
        next(error);
    }
}
export const resendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;
        await resendOTPService(email);
        res.status(StatusCodes.OK).json({
            message: "Mã xác thực đã được gửi lại thành công",
        });
    } catch (error) {
        next(error);
    }
}

export const signInWithGoogle = async (req, res, next) => {
    try {
        const { token } = req.body;
        console.log("TOKEN GOOGLE:", token);
        const { user, jwtToken } = await signInWithGoogleService(token);
        res.status(StatusCodes.OK).json({
            message: "Đăng nhập với Google thành công",
            token: jwtToken,
            user: user,
        });
    } catch (error) {
        console.error("CHI TIẾT LỖI GOOGLE:", JSON.stringify(error, null, 2));
        next(error);
    }
}