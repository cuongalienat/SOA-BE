
import { jest } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

const mockRegisterShipper = jest.fn();
const mockUpdateStatus = jest.fn();
const mockUpdateLocation = jest.fn();
const mockGetShipperProfile = jest.fn();
const mockUpdateShipperProfile = jest.fn();
const mockGetShipperHistory = jest.fn();

jest.unstable_mockModule('../src/services/shipperServices.js', () => ({
    shipperService: {
        registerShipper: mockRegisterShipper,
        updateStatus: mockUpdateStatus,
        updateLocation: mockUpdateLocation,
        getShipperProfile: mockGetShipperProfile,
        updateShipperProfile: mockUpdateShipperProfile,
        getShipperHistory: mockGetShipperHistory
    }
}));

const { shipperController } = await import('../src/controllers/shipperController.js');

describe('Shipper Controller Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            user: { _id: 'shipper_1' },
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('register should register shipper', async () => {
        req.body = { vehicleType: 'Bike', licensePlate: '29A1' };
        mockRegisterShipper.mockResolvedValue({ _id: 'shipper_1' });

        await shipperController.register(req, res, next);

        expect(mockRegisterShipper).toHaveBeenCalledWith({
            userId: 'shipper_1',
            vehicleType: 'Bike',
            licensePlate: '29A1'
        });
        expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    });

    it('toggleStatus should success', async () => {
        req.body = { status: 'ONLINE' };
        mockUpdateStatus.mockResolvedValue({ status: 'ONLINE' });
        await shipperController.toggleStatus(req, res, next);
        expect(mockUpdateStatus).toHaveBeenCalledWith('shipper_1', 'ONLINE');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('pingLocation should success', async () => {
        req.body = { lat: 10, lng: 20 };
        mockUpdateLocation.mockResolvedValue(true);
        await shipperController.pingLocation(req, res, next);
        expect(mockUpdateLocation).toHaveBeenCalledWith('shipper_1', 10, 20);
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('getProfile should return profile', async () => {
        mockGetShipperProfile.mockResolvedValue({});
        await shipperController.getProfile(req, res, next);
        expect(mockGetShipperProfile).toHaveBeenCalledWith('shipper_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('updateProfile should success', async () => {
        req.body = { name: 'New Name' };
        mockUpdateShipperProfile.mockResolvedValue({});
        await shipperController.updateProfile(req, res, next);
        expect(mockUpdateShipperProfile).toHaveBeenCalledWith('shipper_1', req.body);
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('getHistory should return history', async () => {
        req.query.status = 'COMPLETED';
        mockGetShipperHistory.mockResolvedValue([]);
        await shipperController.getHistory(req, res, next);
        expect(mockGetShipperHistory).toHaveBeenCalledWith('shipper_1', 'COMPLETED');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
});
