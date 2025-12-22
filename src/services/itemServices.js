// SOA-BE/src/services/itemServices.js

import ItemModel from '../models/Item.js';
import ShopModel from '../models/shop.js';
import CategoryModel from '../models/Category.js';
import ApiError from '../utils/ApiError.js';
import mongoose from "mongoose";

import { StatusCodes } from 'http-status-codes';

/**
 * Lấy danh sách item (filter + search + pagination)
 */
const findAllItems = async (filter, keyword, page, limit) => {
  if (filter.shopId) {
    filter.shopId = new mongoose.Types.ObjectId(filter.shopId);
  }
    // Search theo tên món (nếu có)
  if (keyword) {
    filter.name = { $regex: keyword, $options: 'i' };
  }


  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const [items, totalDocuments] = await Promise.all([
    ItemModel.find(filter)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate("categoryId", "name")
      .lean(),
    ItemModel.countDocuments(filter)
  ]);

  return {
    items,
    meta: {
      page: pageNum,
      limit: limitNum,
      totalDocuments,
      totalPages: Math.ceil(totalDocuments / limitNum)
    }
  };
};

/**
 * Lấy chi tiết 1 item
 */
const findItemById = async (id) => {
  const item = await ItemModel.findById(id)
    .populate('shopId', 'name address phone')
    .lean();

  if (!item) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Không tìm thấy món ăn'
    );
  }

  return item;
};

/**
 * Tạo item mới
 */
const createNewItem = async (itemData) => {
  // Backward compatible: FE may send `category` (name) instead of `categoryId`
  if (!itemData.categoryId && itemData.category) {
    const category = await CategoryModel.findOne({
      shopId: itemData.shopId,
      name: itemData.category
    }).select("_id");

    if (!category) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Category không tồn tại trong shop"
      );
    }

    itemData.categoryId = category._id;
    delete itemData.category;
  }

  const shopExists = await ShopModel.exists({
    _id: itemData.shopId
  });

  if (!shopExists) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Shop ID không tồn tại'
    );
  }

  return ItemModel.create(itemData);
};

/**
 * Cập nhật item
 */
const updateItemById = async (id, updateData) => {
  // Backward compatible: FE may send `category` (name) instead of `categoryId`
  if (!updateData.categoryId && updateData.category) {
    let shopId = updateData.shopId;
    if (!shopId) {
      const existingItem = await ItemModel.findById(id).select("shopId").lean();
      if (!existingItem) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Không tìm thấy món ăn để cập nhật'
        );
      }
      shopId = existingItem.shopId;
    }

    const category = await CategoryModel.findOne({
      shopId,
      name: updateData.category
    }).select("_id");

    if (!category) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Category không tồn tại trong shop"
      );
    }

    updateData.categoryId = category._id;
    delete updateData.category;
  }

  const updatedItem = await ItemModel.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).lean();

  if (!updatedItem) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Không tìm thấy món ăn để cập nhật'
    );
  }

  return updatedItem;
};

/**
 * Xóa item
 */
const deleteItemById = async (id) => {
  const deletedItem = await ItemModel.findByIdAndDelete(id).lean();

  if (!deletedItem) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Không tìm thấy món ăn để xóa'
    );
  }

  return deletedItem;
};

export default {
  findAllItems,
  findItemById,
  createNewItem,
  updateItemById,
  deleteItemById
};
