// SOA-BE/src/services/itemService.js

import Item from '../models/Item.js';

/**
 * Tìm tất cả các món ăn dựa trên một bộ lọc.
 * @param {object} filter - Đối tượng bộ lọc của Mongoose.
 * @returns {Promise<Array>} - Một mảng các món ăn.
 */
const findAllItems = async (filter) => {
    return Item.find(filter);
};

/**
 * Tìm một món ăn bằng ID.
 * @param {string} id - ID của món ăn.
 * @returns {Promise<object|null>} - Document món ăn hoặc null nếu không tìm thấy.
 */
const findItemById = async (id) => {
    return Item.findById(id);
};

/**
 * Tạo một món ăn mới.
 * @param {object} itemData - Dữ liệu của món ăn mới.
 * @returns {Promise<object>} - Document món ăn vừa được tạo.
 */
const createNewItem = async (itemData) => {
    return Item.create(itemData);
};

/**
 * Cập nhật một món ăn bằng ID.
 * @param {string} id - ID của món ăn cần cập nhật.
 * @param {object} updateData - Dữ liệu cần cập nhật.
 * @returns {Promise<object|null>} - Document món ăn đã được cập nhật hoặc null.
 */
const updateItemById = async (id, updateData) => {
    return Item.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
    });
};

/**
 * Xóa một món ăn bằng ID.
 * @param {string} id - ID của món ăn cần xóa.
 * @returns {Promise<object|null>} - Document món ăn đã bị xóa hoặc null.
 */
const deleteItemById = async (id) => {
    return Item.findByIdAndDelete(id);
};


export default {
  findAllItems,
  findItemById,
  createNewItem,
  updateItemById,
  deleteItemById
};