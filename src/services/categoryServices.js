import CategoryModel from "../models/Category.js";
import ShopModel from "../models/shop.js";
import ItemModel from "../models/Item.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";

export const getCategoriesByShopId = async (shopId) => {
  if (!shopId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "shopId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "shopId không hợp lệ");
  }

  const categories = await CategoryModel.find({ shopId })
    .sort({ displayOrder: 1, createdAt: 1 })
    .select("_id name description displayOrder")
    .lean();

  return categories;
};

export const getCategoriesForMyShop = async (ownerId) => {
  const shop = await ShopModel.findOne({ owner: ownerId }).select("_id").lean();
  if (!shop) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
  }

  const categories = await CategoryModel.find({ shopId: shop._id })
    .sort({ displayOrder: 1, createdAt: 1 })
    .select("_id name description displayOrder")
    .lean();

  return categories;
};

export const createCategoryForMyShop = async (ownerId, payload) => {
  const { name, description } = payload || {};

  if (!name || !String(name).trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Tên danh mục là bắt buộc");
  }

  const shop = await ShopModel.findOne({ owner: ownerId }).select("_id").lean();
  if (!shop) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
  }

  const normalizedName = String(name).trim();
  const existing = await CategoryModel.exists({
    shopId: shop._id,
    name: normalizedName,
  });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, "Danh mục đã tồn tại");
  }

  const maxOrder = await CategoryModel.findOne({ shopId: shop._id })
    .sort({ displayOrder: -1 })
    .select("displayOrder")
    .lean();

  const displayOrder = (maxOrder?.displayOrder || 0) + 1;

  const category = await CategoryModel.create({
    shopId: shop._id,
    name: normalizedName,
    description,
    displayOrder,
  });

  return category.toObject();
};

export const updateCategoryForMyShop = async (ownerId, categoryId, payload) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "categoryId không hợp lệ");
  }

  const { name, description } = payload || {};
  if (name !== undefined && !String(name).trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Tên danh mục không được rỗng");
  }

  const shop = await ShopModel.findOne({ owner: ownerId }).select("_id").lean();
  if (!shop) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
  }

  const existingCategory = await CategoryModel.findOne({
    _id: categoryId,
    shopId: shop._id,
  }).lean();

  if (!existingCategory) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  const update = {};
  if (name !== undefined) {
    const normalizedName = String(name).trim();
    const duplicate = await CategoryModel.exists({
      shopId: shop._id,
      name: normalizedName,
      _id: { $ne: categoryId },
    });
    if (duplicate) {
      throw new ApiError(StatusCodes.CONFLICT, "Danh mục đã tồn tại");
    }
    update.name = normalizedName;
  }
  if (description !== undefined) update.description = description;

  const updated = await CategoryModel.findOneAndUpdate(
    { _id: categoryId, shopId: shop._id },
    update,
    { new: true, runValidators: true }
  ).lean();

  return updated;
};

export const deleteCategoryForMyShop = async (ownerId, categoryId) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "categoryId không hợp lệ");
  }

  const shop = await ShopModel.findOne({ owner: ownerId }).select("_id").lean();
  if (!shop) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
  }

  const category = await CategoryModel.findOne({
    _id: categoryId,
    shopId: shop._id,
  }).select("_id").lean();

  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  const usedCount = await ItemModel.countDocuments({
    shopId: shop._id,
    categoryId: category._id,
  });

  if (usedCount > 0) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Không thể xóa danh mục đang có món"
    );
  }

  await CategoryModel.deleteOne({ _id: category._id, shopId: shop._id });
  return { deleted: true };
};
