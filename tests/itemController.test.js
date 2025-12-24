
import { jest } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

const mockFindAllItems = jest.fn();
const mockFindItemById = jest.fn();
const mockCreateNewItem = jest.fn();

jest.unstable_mockModule('../src/services/itemServices.js', () => ({
    default: {
        findAllItems: mockFindAllItems,
        findItemById: mockFindItemById,
        createNewItem: mockCreateNewItem
    }
}));

const { getItems, getItemById, createItem } = await import('../src/controllers/itemController.js');

describe('Item Controller Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            query: {},
            params: {},
            body: {},
            files: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('getItems', () => {
        it('should return items list', async () => {
            req.query = { shopId: 'shop_1', page: 1, limit: 10 };
            const mockResult = { items: [], meta: {} };
            mockFindAllItems.mockResolvedValue(mockResult);

            await getItems(req, res, next);

            expect(mockFindAllItems).toHaveBeenCalledWith(
                { shopId: 'shop_1' },
                undefined,
                1,
                10
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: [],
                meta: {}
            }));
        });
    });

    describe('getItemById', () => {
        it('should return item details', async () => {
            req.params.id = 'item_1';
            mockFindItemById.mockResolvedValue({ _id: 'item_1' });

            await getItemById(req, res, next);

            expect(mockFindItemById).toHaveBeenCalledWith('item_1');
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
        });

        it('should error if not found', async () => {
            req.params.id = 'invalid';
            mockFindItemById.mockResolvedValue(null);

            await getItemById(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('createItem', () => {
        it('should create item successfully', async () => {
            req.body = { name: 'Food' };
            req.files = { image: [{ path: 'http://image.url' }] };

            mockCreateNewItem.mockResolvedValue({ _id: 'item_new' });

            await createItem(req, res, next);

            expect(mockCreateNewItem).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Food',
                imageUrl: 'http://image.url'
            }));
            expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
        });
    });
});
