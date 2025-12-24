
import { jest } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

const mockCalculateShippingFee = jest.fn();
// Mock mongoose model Shop
const mockFindById = jest.fn();

jest.unstable_mockModule('../src/services/shippingServices.js', () => ({
    calculateShippingFee: mockCalculateShippingFee
}));

jest.unstable_mockModule('../src/models/shop.js', () => ({
    default: {
        findById: mockFindById
    }
}));

const { shippingController } = await import('../src/controllers/shippingController.js');

describe('Shipping Controller Tests', () => {
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

    it('calculateFee should return fee', async () => {
        req.body = { shopId: 'shop_1', userLocation: 'Hanoi' };

        const mockShop = { _id: 'shop_1', address: 'Shop Addr' };
        mockFindById.mockResolvedValue(mockShop);

        const mockResult = {
            distanceData: { distanceText: '5km', durationText: '20min' },
            shippingFee: 15000
        };
        mockCalculateShippingFee.mockResolvedValue(mockResult);

        await shippingController.calculateFee(req, res, next);

        expect(mockFindById).toHaveBeenCalledWith('shop_1');
        expect(mockCalculateShippingFee).toHaveBeenCalledWith('Hanoi', mockShop);
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ shippingFee: 15000 })
        }));
    });

    it('calculateFee should error if shop not found', async () => {
        req.body = { shopId: 'shop_1', userLocation: 'Hanoi' };
        mockFindById.mockResolvedValue(null);

        await shippingController.calculateFee(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('calculateFee should error if missing args', async () => {
        req.body = { shopId: 'shop_1' }; // missing userLocation

        await shippingController.calculateFee(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
