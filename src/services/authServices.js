import User from "../models/user.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { generateOTP } from "../utils/otp.js";
import { sendVerificationEmail } from "../utils/mailer.js";


export const createAdminService = async (adminData) => {
    const {
        username, password, email, fullName, age, phone, role
    } = adminData;
    const admin = await User.findOne({ username });
    if (admin) {
        throw new ApiError(StatusCodes.CONFLICT, "Admin already existed");
    }

    const newAdmin = User.create({ username, password, email, fullName, age, phone, role });
    if (!newAdmin) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to create admin");
    }
    return;
}

export const signUpService = async (userData) => {
    const {
        username, password, email, fullName, age, phone
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

    const { verifyCode, verifyCodeExpires } = generateOTP();

    // Tạo user mới
    const newUser = await User.create(
        { username, password, email, fullName, age, phone, verifyCode, verifyCodeExpires }
    );
    if (!newUser) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to create user");
    }

    const { password: _, ...userWithoutPassword } = newUser.toObject();
    await sendVerificationEmail(email, verifyCode);

    // 3. TRẢ VỀ KẾT QUẢ
    // Lấy bản ghi user sau khi đã xử lý (tạo mới hoặc cập nhật) để trả về

    return {
        user: userWithoutPassword,
    };
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
    const { email, new_password, confirm_password } = userData;

    const user = await User.findOne({ email });

    if (email !== user.email) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Wrong email");
    }

    if (new_password !== confirm_password) {
        throw new ApiError(StatusCodes.CONFLICT, "Passwords do not match");
    }

    user.password = new_password;
    await user.save();
    const { password: _, ...userWithoutPassword } = user.toObject();
    return {
        user: userWithoutPassword
    }
};

export const verifyUserService = async (email, otpCode) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found.");
    }

    // 2. KIỂM TRA MÃ OTP
    if (user.verifyCode !== otpCode) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid verification code.");
    }

    // 3. KIỂM TRA THỜI GIAN HẾT HẠN
    if (user.verifyCodeExpires < new Date()) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Verification code has expired. Please request a new one.");
    }

    // 4. CẬP NHẬT TRẠNG THÁI
    user.isVerified = "yes";
    user.verifyCode = undefined; // Dọn dẹp mã OTP đã dùng
    user.verifyCodeExpires = undefined; // Dọn dẹp thời gian hết hạn
    await user.save();

    // 5. TRẢ VỀ KẾT QUẢ
    const { password: _, ...userWithoutPassword } = user.toObject();

    return {
        user: userWithoutPassword,
        message: "Account successfully verified."
    };
}

export const resendOTPService = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found.");
    }
    const { verifyCode, verifyCodeExpires } = generateOTP();

    user.verifyCode = verifyCode;
    user.verifyCodeExpires = verifyCodeExpires;
    await user.save();
    await sendVerificationEmail(email, verifyCode);
    return {
        message: "A new verification code has been sent to your email."
    };
}   