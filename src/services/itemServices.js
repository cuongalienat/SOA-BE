import ItemModel from '../models/Item.js';
import ShopModel from '../models/shop.js';
import ApiError from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';

// --- HELPER FUNCTIONS ---

const getPaginationOptions = (page, limit) => {
    const pageNumber = Math.max(1, parseInt(page) || 1);
    const limitNumber = Math.max(1, parseInt(limit) || 10);
    const skip = (pageNumber - 1) * limitNumber;
    return { page: pageNumber, limit: limitNumber, skip };
};

const executePaginationQuery = async (modelQuery, countQuery, page, limit) => {
    const [data, totalDocuments] = await Promise.all([
        modelQuery.lean(),
        countQuery
    ]);

    return {
        data, // Bạn có thể map thành 'items' ở đây nếu muốn thống nhất key
        meta: {
            page,
            limit,
            totalDocuments,
            totalPages: Math.ceil(totalDocuments / limit)
        }
    };
};

// --- CORE SERVICES ---

/**
 * Lấy danh sách (Có thể dùng cho Admin xem tất cả)
 */
const findAllItems = async (filter = {}, page, limit) => {
    // Nếu không phân trang
    if (!page || !limit) {
        return ItemModel.find(filter).populate('shopId', 'name address').lean();
    }

    const { page: pageNum, limit: limitNum, skip } = getPaginationOptions(page, limit);
    const query = ItemModel.find(filter)
        .skip(skip)
        .limit(limitNum)
        .populate('shopId', 'name address')
        .sort({ createdAt: -1 });

    return executePaginationQuery(query, ItemModel.countDocuments(filter), pageNum, limitNum);
};

/**
 * Tìm món ăn theo ID (CÓ CHECK LỖI)
 */
const findItemById = async (id) => {
    const item = await ItemModel.findById(id)
        .populate('shopId', 'name address phone')
        .lean();

    // Check lỗi ngay tại đây
    if (!item) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy món ăn với ID này!');
    }

    return item;
};

/**
 * Tìm theo tên (Search Name)
 */
const findItemsByName = async (keyword, page, limit) => {
    const { page: pageNum, limit: limitNum, skip } = getPaginationOptions(page, limit);
    const queryFilter = keyword ? { name: { $regex: keyword, $options: 'i' } } : {};

    const dataQuery = ItemModel.find(queryFilter)
        .skip(skip)
        .limit(limitNum)
        .populate('shopId', 'name address');

    const result = await executePaginationQuery(
        dataQuery, 
        ItemModel.countDocuments(queryFilter), 
        pageNum, 
        limitNum
    );

    // Map key 'data' thành 'items' để controller cũ không bị lỗi
    return { items: result.data, meta: result.meta };
};

/**
 * Tìm theo địa chỉ (Search Address)
 */
const findItemsByAddress = async (addressKeyword, page, limit) => {
    const { page: pageNum, limit: limitNum, skip } = getPaginationOptions(page, limit);

    // 1. Tìm Shops
    const shops = await ShopModel.find({
        address: { $regex: addressKeyword, $options: 'i' }
    }).select('_id').lean();

    if (!shops.length) {
        // Trả về mảng rỗng chứ không báo lỗi, vì đây là tìm kiếm
        return {
            items: [],
            meta: { page: pageNum, limit: limitNum, totalDocuments: 0, totalPages: 0 }
        };
    }

    const shopIds = shops.map(shop => shop._id);
    const queryFilter = { shopId: { $in: shopIds } };

    // 2. Query Items
    const dataQuery = ItemModel.find(queryFilter)
        .skip(skip)
        .limit(limitNum)
        .populate('shopId', 'name address');

    const result = await executePaginationQuery(
        dataQuery, 
        ItemModel.countDocuments(queryFilter), 
        pageNum, 
        limitNum
    );

    return { items: result.data, meta: result.meta };
};

/**
 * Tạo mới
 */
const createNewItem = async (itemData) => {
    // Có thể check thêm: Shop có tồn tại không trước khi tạo Item
    const shopExists = await ShopModel.exists({ _id: itemData.shopId });
    if (!shopExists) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Shop ID không tồn tại!');
    }

    const newItem = await ItemModel.create(itemData);
    return newItem;
};

/**
 * Cập nhật (CÓ CHECK LỖI)
 */
const updateItemById = async (id, updateData) => {
    const updatedItem = await ItemModel.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
    }).lean();

    if (!updatedItem) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy món ăn để cập nhật!');
    }

    return updatedItem;
};

/**
 * Xóa (CÓ CHECK LỖI)
 */
const deleteItemById = async (id) => {
    const deletedItem = await ItemModel.findByIdAndDelete(id).lean();

    if (!deletedItem) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy món ăn để xóa!');
    }

    return deletedItem;
};

export default {
    findAllItems,
    findItemById,
    createNewItem,
    updateItemById,
    deleteItemById,
    findItemsByName,
    findItemsByAddress
};