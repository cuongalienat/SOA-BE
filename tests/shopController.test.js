
import { jest } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

const mockCreateShopService = jest.fn();
const mockGetShopByOwnerService = jest.fn();
const mockGetMyShopDashboardService = jest.fn();
const mockUpdateShopService = jest.fn();
const mockUpdateShopStatusService = jest.fn();
const mockGetAllShopsService = jest.fn();
const mockGetShopDetailService = jest.fn();
const mockGetShopByIDService = jest.fn();
const mockGetShopDashboardService = jest.fn();

jest.unstable_mockModule('../src/services/shopServices.js', () => ({
    createShopService: mockCreateShopService,
    getShopByOwnerService: mockGetShopByOwnerService,
    getMyShopDashboardService: mockGetMyShopDashboardService,
    updateShopService: mockUpdateShopService,
    updateShopStatusService: mockUpdateShopStatusService,
    getAllShopsService: mockGetAllShopsService,
    getShopDetailService: mockGetShopDetailService,
    getShopByIDService: mockGetShopByIDService,
    getShopDashboardService: mockGetShopDashboardService
}));

const {
    createShop,
    getMyShop,
    getMyShopDashboard,
    updateMyShop,
    updateShopStatus,
    getAllShops,
    getShopDetails,
    getShopByID,
    getShopDashboard
} = await import('../src/controllers/shopControllers.js');

describe('Shop Controller Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            user: { id: 'owner_1' },
            files: {},
            query: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('createShop should success', async () => {
        mockCreateShopService.mockResolvedValue({});
        await createShop(req, res, next);
        expect(mockCreateShopService).toHaveBeenCalledWith('owner_1', req.body);
        expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    });

    it('getMyShop should success', async () => {
        mockGetShopByOwnerService.mockResolvedValue([{ name: 'Shop 1' }]);
        await getMyShop(req, res, next);
        expect(mockGetShopByOwnerService).toHaveBeenCalledWith('owner_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Shop 1' } }));
    });

    it('getMyShopDashboard should success', async () => {
        mockGetMyShopDashboardService.mockResolvedValue({});
        await getMyShopDashboard(req, res, next);
        expect(mockGetMyShopDashboardService).toHaveBeenCalledWith('owner_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('updateMyShop should handle file uploads and return success', async () => {
        req.files = {
            coverImage: [{ path: 'url_cover' }],
            qrImage: [{ path: 'url_qr' }]
        };
        req.body = { name: 'Updated Shop' };

        mockUpdateShopService.mockResolvedValue({});

        await updateMyShop(req, res, next);

        expect(mockUpdateShopService).toHaveBeenCalledWith('owner_1', expect.objectContaining({
            name: 'Updated Shop',
            coverImage: 'url_cover',
            qrImage: 'url_qr'
        }));
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('updateShopStatus should success', async () => {
        req.body = { isOpen: true };
        mockUpdateShopStatusService.mockResolvedValue({});
        await updateShopStatus(req, res, next);
        expect(mockUpdateShopStatusService).toHaveBeenCalledWith('owner_1', true);
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('getAllShops should success', async () => {
        req.query = { page: 1, limit: 10 };
        mockGetAllShopsService.mockResolvedValue({});
        await getAllShops(req, res, next);
        expect(mockGetAllShopsService).toHaveBeenCalledWith({ page: 1, limit: 10 });
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('getShopDetails should success', async () => {
        req.params.id = 'shop_1';
        mockGetShopDetailService.mockResolvedValue({});
        await getShopDetails(req, res, next);
        expect(mockGetShopDetailService).toHaveBeenCalledWith('shop_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
});
