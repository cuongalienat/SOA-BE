
import { jest } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

const mockCreateDelivery = jest.fn();
const mockGetDeliveryById = jest.fn();
const mockAssignShipper = jest.fn();
const mockUpdateStatus = jest.fn();
const mockGetCurrentDelivery = jest.fn();
const mockGetNearbyDeliveries = jest.fn();
const mockGetIO = jest.fn();

jest.unstable_mockModule('../src/services/deliveryService.js', () => ({
    deliveryService: {
        createDelivery: mockCreateDelivery,
        getDeliveryById: mockGetDeliveryById,
        assignShipper: mockAssignShipper,
        updateStatus: mockUpdateStatus,
        getCurrentDelivery: mockGetCurrentDelivery,
        getNearbyDeliveries: mockGetNearbyDeliveries
    }
}));

jest.unstable_mockModule('../src/utils/socket.js', () => ({
    getIO: mockGetIO
}));

const { deliveryController } = await import('../src/controllers/deliveryController.js');

describe('Delivery Controller Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: { _id: 'shipper_1' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('createNewDelivery should success', async () => {
        mockCreateDelivery.mockResolvedValue({ _id: 'del_1' });
        await deliveryController.createNewDelivery(req, res, next);
        expect(mockCreateDelivery).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    });

    it('getDeliveryDetails should success', async () => {
        req.params.id = 'del_1';
        mockGetDeliveryById.mockResolvedValue({ _id: 'del_1' });
        await deliveryController.getDeliveryDetails(req, res, next);
        expect(mockGetDeliveryById).toHaveBeenCalledWith('del_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('updateDelivery ASSIGNED should success', async () => {
        req.params.id = 'del_1';
        req.body = { status: 'ASSIGNED', location: { lat: 1, lng: 1 } };
        mockAssignShipper.mockResolvedValue({ _id: 'del_1' });

        await deliveryController.updateDelivery(req, res, next);

        expect(mockAssignShipper).toHaveBeenCalledWith('del_1', 'shipper_1', { lat: 1, lng: 1 });
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('updateDelivery OTHER STATUS should success and emit socket', async () => {
        req.params.id = 'del_1';
        req.body = { status: 'SHIPPING', location: { lat: 1, lng: 1 } };
        mockUpdateStatus.mockResolvedValue({
            _id: 'del_1',
            orderId: { _id: 'order_1' }
        });

        const mockEmit = jest.fn();
        const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
        mockGetIO.mockReturnValue({ to: mockTo });

        await deliveryController.updateDelivery(req, res, next);

        expect(mockUpdateStatus).toHaveBeenCalled();
        expect(mockGetIO).toHaveBeenCalled();
        expect(mockTo).toHaveBeenCalledWith('order:order_1');
        expect(mockEmit).toHaveBeenCalledWith('SHIPPER_MOVED', expect.anything());
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('getCurrentJob should return job', async () => {
        mockGetCurrentDelivery.mockResolvedValue({ _id: 'del_1' });
        await deliveryController.getCurrentJob(req, res, next);
        expect(mockGetCurrentDelivery).toHaveBeenCalledWith('shipper_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('getNearbyOrders should return list', async () => {
        mockGetNearbyDeliveries.mockResolvedValue([]);
        await deliveryController.getNearbyOrders(req, res, next);
        expect(mockGetNearbyDeliveries).toHaveBeenCalledWith('shipper_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
});
