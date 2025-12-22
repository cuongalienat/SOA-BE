import { StatusCodes } from "http-status-codes";
import * as categoryServices from "../services/categoryServices.js";

export const getCategories = async (req, res, next) => {
  try {
    const categories = await categoryServices.getCategoriesForMyShop(req.user.id);

    res.status(StatusCodes.OK).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await categoryServices.createCategoryForMyShop(
      req.user.id,
      req.body
    );

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryServices.updateCategoryForMyShop(
      req.user.id,
      req.params.id,
      req.body
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const result = await categoryServices.deleteCategoryForMyShop(
      req.user.id,
      req.params.id
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
