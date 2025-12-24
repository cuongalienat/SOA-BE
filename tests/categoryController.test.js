
import { jest } from '@jest/globals';
import { StatusCodes } from 'http-status-codes';

const mockGetCategoriesById = jest.fn();
const mockGetCategoriesForMyShop = jest.fn();
const mockCreateCategoryForMyShop = jest.fn();
const mockUpdateCategoryForMyShop = jest.fn();
const mockDeleteCategoryForMyShop = jest.fn();
const mockGetCategoriesByShopId = jest.fn();

jest.unstable_mockModule('../src/services/categoryServices.js', () => ({
    getCategoriesById: mockGetCategoriesById,
    getCategoriesForMyShop: mockGetCategoriesForMyShop,
    createCategoryForMyShop: mockCreateCategoryForMyShop,
    updateCategoryForMyShop: mockUpdateCategoryForMyShop,
    deleteCategoryForMyShop: mockDeleteCategoryForMyShop,
    getCategoriesByShopId: mockGetCategoriesByShopId
}));

const {
    getCategoryById,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoriesByShop
} = await import('../src/controllers/categoryController.js');

describe('Category Controller Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {},
            user: { id: 'user_1' },
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('getCategoryById should return category', async () => {
        req.params.id = 'cat_1';
        mockGetCategoriesById.mockResolvedValue({ _id: 'cat_1' });

        await getCategoryById(req, res, next);

        expect(mockGetCategoriesById).toHaveBeenCalledWith('cat_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: { _id: 'cat_1' } });
    });

    it('getCategories should return list', async () => {
        mockGetCategoriesForMyShop.mockResolvedValue([]);
        await getCategories(req, res, next);
        expect(mockGetCategoriesForMyShop).toHaveBeenCalledWith('user_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('createCategory should create', async () => {
        req.body = { name: 'New Cat' };
        mockCreateCategoryForMyShop.mockResolvedValue({ _id: 'new_cat' });

        await createCategory(req, res, next);

        expect(mockCreateCategoryForMyShop).toHaveBeenCalledWith('user_1', req.body);
        expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    });

    it('updateCategory should update', async () => {
        req.params.id = 'cat_1';
        req.body = { name: 'Updated' };
        mockUpdateCategoryForMyShop.mockResolvedValue({ _id: 'cat_1' });

        await updateCategory(req, res, next);

        expect(mockUpdateCategoryForMyShop).toHaveBeenCalledWith('user_1', 'cat_1', req.body);
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('deleteCategory should delete', async () => {
        req.params.id = 'cat_1';
        mockDeleteCategoryForMyShop.mockResolvedValue(true);

        await deleteCategory(req, res, next);

        expect(mockDeleteCategoryForMyShop).toHaveBeenCalledWith('user_1', 'cat_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it('getCategoriesByShop should return list', async () => {
        req.params.shopId = 'shop_1';
        mockGetCategoriesByShopId.mockResolvedValue([]);

        await getCategoriesByShop(req, res, next);

        expect(mockGetCategoriesByShopId).toHaveBeenCalledWith('shop_1');
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
});
