
import { jest } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

const mockCreateOrderService = jest.fn();
const mockGetOrderByIdService = jest.fn();
const mockGetOrdersService = jest.fn();

// Mock default export
jest.unstable_mockModule('../src/services/orderServices.js', () => ({
    default: {
        createOrderService: mockCreateOrderService,
        getOrderByIdService: mockGetOrderByIdService,
        getOrdersService: mockGetOrdersService
    }
}));

const { createOrder, getOrderDetails, getOrders } = await import('../src/controllers/orderControllers.js');

describe('Order Controller Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            user: { _id: 'user_123' },
            params: {},
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('createOrder', () => {
        it('should create order successfully', async () => {
            req.body = { shopId: 'shop_1', items: [] };
            mockCreateOrderService.mockResolvedValue({ _id: 'order_1' });

            await createOrder(req, res, next);

            expect(mockCreateOrderService).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user_123',
                shopId: 'shop_1'
            }));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: { _id: 'order_1' }
            }));
        });
    });

    describe('getOrderDetails', () => {
        it('should get order details', async () => {
            req.params.id = 'order_1';
            mockGetOrderByIdService.mockResolvedValue({ _id: 'order_1' });

            await getOrderDetails(req, res, next);

            expect(mockGetOrderByIdService).toHaveBeenCalledWith('order_1');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: { _id: 'order_1' }
            }));
        });
    });

    describe('getOrders', () => {
        it('should get orders list', async () => {
            req.query = { page: 1, limit: 10 };
            mockGetOrdersService.mockResolvedValue({ orders: [], total: 0 });

            await getOrders(req, res, next);

            expect(mockGetOrdersService).toHaveBeenCalledWith(
                { user: 'user_123' },
                1,
                10
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
