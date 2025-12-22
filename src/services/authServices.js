import User from "../models/user.js";
import Shop from "../models/shop.js"; 
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { generateOTP } from "../utils/otp.js";
import { sendVerificationEmail } from "../utils/mailer.js";
import { OAuth2Client } from "google-auth-library";

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
        throw new ApiError(StatusCodes.CONFLICT, "Username đã được sử dụng");
    }
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
        throw new ApiError(StatusCodes.CONFLICT, "Email đã được đăng ký");
    }

    const { verifyCode, verifyCodeExpires } = generateOTP();

    // Tạo user mới
    const newUser = await User.create(
        { username, password, email, fullName, age, phone, verifyCode, verifyCodeExpires }
    );
    if (!newUser) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Không thể tạo người dùng mới");
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
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Tài khoản không tồn tại");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Mật khẩu không đúng");
    }

    // Tạo JWT
    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Convert sang Object JS thuần để chỉnh sửa dữ liệu trả về
    let userResponse = user.toObject();
    delete userResponse.password; // Xóa password cho bảo mật

    // 🔥 LOGIC MỚI: Nếu là chủ quán, tìm shopId gắn vào luôn
    if (user.role === 'restaurant_manager') {
        // Tìm Shop mà user này sở hữu (Giả sử trong ShopModel có trường owner)
        const shop = await Shop.findOne({ owner: user._id }).select('_id name');
        
        if (shop) {
            userResponse.shopId = shop._id;
            // userResponse.shopName = shop.name; // Gửi kèm tên quán nếu thích
        } else {
            // Optional: Có thể log warning nếu là manager mà chưa có quán
            // console.warn(`Manager ${user.username} chưa được gán Shop nào!`);
        }
    }

    return { user: userResponse, token: token };
};

export const forgetPasswordService = async (userData) => {
    const { email, new_password, confirm_password } = userData;

    const user = await User.findOne({ username });
    if (!user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Tài khoản không tồn tại");
    }

    if (email !== user.email) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Email không đúng");
    }

    if (new_password !== confirm_password) {
        throw new ApiError(StatusCodes.CONFLICT, "Mật khẩu xác nhận không khớp");
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
        throw new ApiError(StatusCodes.NOT_FOUND, "Tài khoản không tồn tại");
    }

    // 2. KIỂM TRA MÃ OTP
    if (user.verifyCode !== otpCode) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Mã xác minh không đúng");
    }

    // 3. KIỂM TRA THỜI GIAN HẾT HẠN
    if (user.verifyCodeExpires < new Date()) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Mã xác minh đã hết hạn, hãy yêu cầu mã mới");
    }

    // 4. CẬP NHẬT TRẠNG THÁI
    user.isVerified = "yes";
    user.verifyCode = undefined; // Dọn dẹp mã OTP đã dùng
    user.verifyCodeExpires = undefined; // Dọn dẹp thời gian hết hạn
    await user.save();

    // 5. TRẢ VỀ KẾT QUẢ
    const { password: _, ...userWithoutPassword } = user.toObject();

    return {
        user: userWithoutPassword
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

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const signInWithGoogleService = async (googleToken) => {
    try {
        // 1. Xác thực token với Server của Google
        // Nếu token giả hoặc hết hạn, hàm này sẽ throw lỗi ngay
        const ticket = await client.verifyIdToken({
            idToken: googleToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        // 2. Lấy thông tin user từ payload của Google
        const payload = ticket.getPayload();
        const { email, name, sub } = payload;
        // sub chính là Google ID duy nhất của user

        // 3. Kiểm tra xem user này đã tồn tại trong DB chưa
        let user = await User.findOne({ email });

        if (user) {

            // Nếu user này trước đây đăng ký bằng password, giờ muốn link với Google
            if (!user.googleId) {
                user.googleId = sub;
            }

            // Google đã xác thực email rồi, nên ta set luôn isVerified = true
            if (!user.isVerified) {
                user.isVerified = "yes";
            }

            await user.save();
        } else {
            const generatedUsername = email.split('@')[0];

            user = await User.create({
                username: generatedUsername,
                fullName: generatedUsername,
                age: null,
                phone: null,
                email: email,
                googleId: sub,
                isVerified: "yes",
                password: null,
            });
        }

        // 4. Tạo JWT Token của hệ thống (Giống hệt login thường)
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // 5. Chuẩn bị dữ liệu trả về (Bỏ password, googleId cho gọn)
        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.googleId;

        return { user: userObj, token: token };

    } catch (error) {
        // Bắt lỗi từ Google Verify hoặc DB
        console.error("Google Login Error:", error);
        throw new ApiError(StatusCodes.BAD_REQUEST, "Google Token không hợp lệ hoặc đã hết hạn.");
    }
};