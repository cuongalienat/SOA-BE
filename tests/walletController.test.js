
import { jest } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

const mockCreateWalletService = jest.fn();
const mockGetMyWalletInfoService = jest.fn();
const mockDepositToWalletService = jest.fn();
const mockWithdrawFromWalletService = jest.fn();
const mockGetTransactionHistoryService = jest.fn();
const mockCheckPinService = jest.fn();

jest.unstable_mockModule('../src/services/walletServices.js', () => ({
    createWalletService: mockCreateWalletService,
    getMyWalletInfoService: mockGetMyWalletInfoService,
    depositToWalletService: mockDepositToWalletService,
    withdrawFromWalletService: mockWithdrawFromWalletService,
    getTransactionHistoryService: mockGetTransactionHistoryService,
    checkPinService: mockCheckPinService
}));

const {
    createWallet,
    getMyWallet,
    depositMoney,
    withdrawMoney,
    getHistory,
    checkPin
} = await import('../src/controllers/walletControllers.js');

describe('Wallet Controller Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            user: { _id: 'user_1' },
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('createWallet should success', async () => {
        req.body = { pin: '123456' };
        mockCreateWalletService.mockResolvedValue({});
        await createWallet(req, res, next);
        expect(mockCreateWalletService).toHaveBeenCalledWith('user_1', '123456');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('getMyWallet should success', async () => {
        mockGetMyWalletInfoService.mockResolvedValue({});
        await getMyWallet(req, res, next);
        expect(mockGetMyWalletInfoService).toHaveBeenCalledWith('user_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('depositMoney should success', async () => {
        req.body = { amount: 50000 };
        mockDepositToWalletService.mockResolvedValue({});
        await depositMoney(req, res, next);
        expect(mockDepositToWalletService).toHaveBeenCalledWith('user_1', 50000);
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('withdrawMoney should success', async () => {
        req.body = { amount: 50000 };
        mockWithdrawFromWalletService.mockResolvedValue({});
        await withdrawMoney(req, res, next);
        expect(mockWithdrawFromWalletService).toHaveBeenCalledWith('user_1', 50000);
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('getHistory should success', async () => {
        req.query = { page: 1, limit: 10 };
        mockGetTransactionHistoryService.mockResolvedValue([]);
        await getHistory(req, res, next);
        expect(mockGetTransactionHistoryService).toHaveBeenCalledWith('user_1', 1, 10);
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('checkPin should success', async () => {
        req.body = { pin: '123456' };
        mockCheckPinService.mockResolvedValue(true);
        await checkPin(req, res, next);
        expect(mockCheckPinService).toHaveBeenCalledWith('user_1', '123456');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
});
