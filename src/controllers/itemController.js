// SOA-BE/src/controllers/itemController.js

import { StatusCodes } from 'http-status-codes';
import itemService from '../services/itemServices.js'; 
import ApiError from '../utils/ApiError.js'; 

/**
 * GET /api/items
 * Query params:
 *  - shopId
 *  - keyword (search theo tên món)
 *  - category
 *  - page
 *  - limit
 */
export const getItems = async (req, res, next) => {
  try {
    const { shopId, keyword, category, page, limit } = req.query;

    // Controller chỉ xây filter cơ bản
    const filter = {};
    if (shopId) filter.shopId = shopId;
    if (category) filter.category = category;

    const result = await itemService.findAllItems(
      filter,
      keyword,
      page,
      limit
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: result.items,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};


/**
 * GET /api/items/:id
 */
export const getItemById = async (req, res, next) => {
  try {
    const item = await itemService.findItemById(req.params.id);

    if (!item) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Món ăn không tồn tại');
    }
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Tạo một món ăn mới
 */
export const createItem = async (req, res, next) => {
    try {
    const createData = { ...req.body };

    // ===== FILE FROM CLOUDINARY (multer-storage-cloudinary) =====
    const uploadedImage = req.files?.image?.[0] || req.files?.imageUrl?.[0];
    if (uploadedImage?.path) {
      createData.imageUrl = uploadedImage.path;
    }

    const newItem = await itemService.createNewItem(createData);

        res.status(StatusCodes.CREATED).json({
            success: true,
            message: "Tạo món ăn mới thành công",
            data: newItem // Trả về món ăn vừa tạo
        });
    } catch (error) {
        // Mọi lỗi (bao gồm cả validation từ Mongoose) sẽ được đẩy đi
        next(error);
    }
};

/**
 * Cập nhật thông tin một món ăn
 */
export const updateItem = async (req, res, next) => {
    try {
    const updateData = { ...req.body };

    // ===== FILE FROM CLOUDINARY (multer-storage-cloudinary) =====
    const uploadedImage = req.files?.image?.[0] || req.files?.imageUrl?.[0];
    if (uploadedImage?.path) {
      updateData.imageUrl = uploadedImage.path;
    }

    const item = await itemService.updateItemById(req.params.id, updateData);

        if (!item) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy món ăn để cập nhật');
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Cập nhật món ăn thành công",
            data: item // Trả về món ăn sau khi đã cập nhật
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Xóa một món ăn
 */
export const deleteItem = async (req, res, next) => {
    try {
        const item = await itemService.deleteItemById(req.params.id);

        if (!item) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy món ăn để xóa');
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Xóa món ăn thành công",
            data: null // Hoặc không cần trường data
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Tìm kiếm món ăn theo tên (Có phân trang)
 * API: GET /api/items/search/name?keyword=phở&page=1&limit=10
 */
// export const getItemsByName = async (req, res, next) => {
//     try {
//         const { keyword, page, limit } = req.query;

//         // Gọi service xử lý logic tìm kiếm
//         const result = await itemService.findItemsByName(keyword, page, limit);

//         res.status(StatusCodes.OK).json({
//             success: true,
//             message: "Tìm kiếm món ăn theo tên thành công",
//             data: result.items,
//             meta: result.meta // Trả về thông tin phân trang (total page, current page...)
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// /**
//  * Tìm kiếm món ăn theo địa chỉ quán (Có phân trang)
//  * API: GET /api/items/search/address?keyword=Hà Nội&page=1&limit=10
//  * Lưu ý: Hàm này giả định bạn muốn tìm các món ăn thuộc các quán nằm ở địa chỉ này.
//  */
// export const getItemsByAddress = async (req, res, next) => {
//     try {
//         const { keyword, page, limit } = req.query;

//         // Validate cơ bản
//         if (!keyword) {
//             throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng nhập địa chỉ cần tìm');
//         }

//         const result = await itemService.findItemsByAddress(keyword, page, limit);

//         res.status(StatusCodes.OK).json({
//             success: true,
//             message: "Tìm kiếm món ăn theo địa chỉ thành công",
//             data: result.items,
//             meta: result.meta
//         });
//     } catch (error) {
//         next(error);
//     }
// };