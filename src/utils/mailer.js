// src/utils/mailer.util.js

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Khởi tạo Transporter với cấu hình SMTP động
// Thay vì service: 'gmail'
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", // Máy chủ
    port: 465, // Cổng thường dùng cho SSL
    secure: true, // true cho cổng 465, false cho các cổng khác (587)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

/**
 * Gửi email chứa mã xác thực OTP.
 * @param {string} toEmail - Địa chỉ email người nhận
 * @param {string} otpCode - Mã OTP cần gửi
 */
export const sendVerificationEmail = async (toEmail, otpCode) => {
    // ... (Giữ nguyên phần mailOptions) ...
    const mailOptions = {
        from: `"Ứng dụng của bạn" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Mã xác thực tài khoản của bạn',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #333;">Xác thực Đăng ký Tài khoản</h2>
                <p>Cảm ơn bạn đã đăng ký. Vui lòng sử dụng mã dưới đây để hoàn tất việc xác thực tài khoản:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <span style="display: inline-block; background-color: #f0f0f0; color: #333; font-size: 24px; padding: 10px 20px; border-radius: 5px; letter-spacing: 5px;">
                        <strong>${otpCode}</strong>
                    </span>
                </div>
                <p style="color: #888; font-size: 12px;">Mã này sẽ hết hạn sau 10 phút.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email xác thực đã được gửi thành công đến: ${toEmail}`);
    } catch (error) {
        console.error('Lỗi khi gửi email xác thực:', error);
        // Thay đổi thông báo lỗi để phản ánh rằng lỗi có thể do cấu hình SMTP
        throw new Error('Không thể gửi email xác thực. Vui lòng kiểm tra cấu hình SMTP (Host, Port, User, Pass).');
    }
};