
import { jest } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

// 1. Mock functions
const mockSignUpService = jest.fn();
const mockSignInService = jest.fn();
const mockVerifyUserService = jest.fn();
const mockResendOTPService = jest.fn();
const mockForgetPasswordService = jest.fn();
const mockCreateAdminService = jest.fn();
const mockSignInWithGoogleService = jest.fn();

// 2. Mock Module
jest.unstable_mockModule('../src/services/authServices.js', () => ({
    signUpService: mockSignUpService,
    signInService: mockSignInService,
    verifyUserService: mockVerifyUserService,
    resendOTPService: mockResendOTPService,
    forgetPasswordService: mockForgetPasswordService,
    createAdminService: mockCreateAdminService,
    signInWithGoogleService: mockSignInWithGoogleService
}));

// 3. Import Controller
const { signUp, signIn, verifyUser } = await import('../src/controllers/authControllers.js');

describe('Auth Controller Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('signUp', () => {
        it('should sign up successfully', async () => {
            req.body = { username: 'test', password: '123' };
            mockSignUpService.mockResolvedValue({ user: { id: 1, username: 'test' } });

            await signUp(req, res, next);

            expect(mockSignUpService).toHaveBeenCalledWith(req.body);
            expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Đăng ký thành công"
            }));
        });

        it('should handle errors', async () => {
            const error = new Error('Sign up failed');
            mockSignUpService.mockRejectedValue(error);

            await signUp(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('signIn', () => {
        it('should sign in successfully', async () => {
            req.body = { username: 'test', password: '123' };
            mockSignInService.mockResolvedValue({
                user: { id: 1, username: 'test' },
                token: 'mock_token'
            });

            await signIn(req, res, next);

            expect(mockSignInService).toHaveBeenCalledWith('test', '123');
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Đăng nhập thành công",
                token: 'mock_token'
            }));
        });
    });

    describe('verifyUser', () => {
        it('should verify user successfully', async () => {
            req.body = { email: 'test@example.com', otpCode: '123456' };
            mockVerifyUserService.mockResolvedValue(true);

            await verifyUser(req, res, next);

            expect(mockVerifyUserService).toHaveBeenCalledWith('test@example.com', '123456');
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Xác thực tài khoản thành công"
            }));
        });
    });
});
