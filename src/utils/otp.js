import otpGenerator from 'otp-generator';

const OTP_EXPIRY_MINUTES = 10;
/**
 * Tạo một mã OTP gồm 6 chữ số ngẫu nhiên.
 * @returns {string} Mã OTP
 */
export const generateOTP = () => {
    const verifyCode = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
    });
    const verifyCodeExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    return { verifyCode, verifyCodeExpires }
};