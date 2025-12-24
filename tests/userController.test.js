
import { jest } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

// 1. Define Mock Functions for Service
const mockGetUserDataService = jest.fn();
const mockUpdateUserService = jest.fn();
const mockDeleteUserService = jest.fn();
const mockPromoteUserService = jest.fn();

// 2. Mock the Service Module using unstable_mockModule
jest.unstable_mockModule('../src/services/userServices.js', () => ({
    getUserDataService: mockGetUserDataService,
    updateUserService: mockUpdateUserService,
    deleteUserService: mockDeleteUserService,
    promoteUserService: mockPromoteUserService
}));

// 3. Import the Controller (Dynamic Import AFTER mocking)
const { getUserData, updateUser, deleteUser } = await import('../src/controllers/userControllers.js');

describe('User Controller Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            query: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('getUserData', () => {
        it('should return user data successfully', async () => {
            req.query.username = 'testuser';
            const mockUser = {
                username: 'testuser',
                name: 'Test User',
                email: 'test@example.com',
                age: 20,
                phone: '123456',
                address: 'Hanoi'
            };

            mockGetUserDataService.mockResolvedValue({ user: mockUser });

            await getUserData(req, res, next);

            expect(mockGetUserDataService).toHaveBeenCalledWith('testuser');
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith({
                message: "User data fetched successfully",
                user: mockUser
            });
        });

        it('should call next with error if service fails', async () => {
            req.query.username = 'testuser';
            const error = new Error('Service Error');
            mockGetUserDataService.mockRejectedValue(error);

            await getUserData(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('updateUser', () => {
        it('should update user successfully', async () => {
            req.body = {
                username: 'testuser',
                phone: '0999999999',
                address: 'New Address'
            };

            const mockUpdatedUser = {
                phone: '0999999999',
                address: 'New Address'
            };

            mockUpdateUserService.mockResolvedValue({ user: mockUpdatedUser });

            await updateUser(req, res, next);

            expect(mockUpdateUserService).toHaveBeenCalledWith('testuser', {
                phone: '0999999999',
                address: 'New Address'
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "User updated successfully",
                user: mockUpdatedUser
            });
        });

        it('should return 400 if fields are missing', async () => {
            req.body = { username: 'testuser' }; // Missing phone/address

            await updateUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "All fields are required" });
            expect(mockUpdateUserService).not.toHaveBeenCalled();
        });
    });

    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            req.query.username = 'testuser';

            await deleteUser(req, res, next);

            expect(mockDeleteUserService).toHaveBeenCalledWith('testuser');
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith({ message: "User deleted successfully" });
        });
    });
});
