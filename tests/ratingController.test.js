
import { jest } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

const mockCreateRatingService = jest.fn();
const mockGetRatingsByShopService = jest.fn();
const mockGetRatingsByItemService = jest.fn();
const mockGetRatingByOrderIdService = jest.fn();

jest.unstable_mockModule('../src/services/ratingServices.js', () => ({
    createRatingService: mockCreateRatingService,
    getRatingsByShopService: mockGetRatingsByShopService,
    getRatingsByItemService: mockGetRatingsByItemService,
    getRatingByOrderIdService: mockGetRatingByOrderIdService
}));

const {
    createRating,
    getRatingsByShop,
    getRatingsByItem,
    getRatingByOrderId
} = await import('../src/controllers/ratingController.js');

describe('Rating Controller Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            query: {},
            user: { _id: 'user_1' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('createRating should success', async () => {
        mockCreateRatingService.mockResolvedValue({});
        await createRating(req, res, next);
        expect(mockCreateRatingService).toHaveBeenCalledWith('user_1', req.body);
        expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    });

    it('getRatingsByShop should success', async () => {
        req.params.shopId = 'shop_1';
        mockGetRatingsByShopService.mockResolvedValue([]);
        await getRatingsByShop(req, res, next);
        expect(mockGetRatingsByShopService).toHaveBeenCalledWith('shop_1', expect.anything());
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('getRatingsByItem should success', async () => {
        req.params.itemId = 'item_1';
        mockGetRatingsByItemService.mockResolvedValue([]);
        await getRatingsByItem(req, res, next);
        expect(mockGetRatingsByItemService).toHaveBeenCalledWith('item_1', expect.anything());
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('getRatingByOrderId should success', async () => {
        req.params.orderId = 'order_1';
        mockGetRatingByOrderIdService.mockResolvedValue({});
        await getRatingByOrderId(req, res, next);
        expect(mockGetRatingByOrderIdService).toHaveBeenCalledWith('order_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
});
