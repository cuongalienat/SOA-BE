import Shop from "../models/shop.js";
import ApiError from "../utils/ApiError.js";
import Category from "../models/Category.js";
import Item from "../models/Item.js";
import { StatusCodes } from "http-status-codes";
import Order from "../models/order.js";

export const createShopService = async (ownerId, shopData) => {
    // Kiểm tra xem user này đã có shop chưa
    const existingShop = await Shop.findOne({ owner: ownerId });
    if (existingShop) {
        throw new ApiError(StatusCodes.CONFLICT, "User already has a shop");
    }

    const newShop = await Shop.create({
        ...shopData,
        owner: ownerId // Gán chủ sở hữu
    });

    return newShop;
};

// Lấy quán của chủ quán
export const getShopByOwnerService = async (ownerId) => {
    // SỬA Ở ĐÂY: Dùng find để lấy danh sách
    const shops = await Shop.find({ owner: ownerId });
    if (!shops || shops.length === 0) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User has no shops");
    }

    return shops;
};
/**
 * Lấy dữ liệu dashboard cho shop của owner
 */
export const getMyShopDashboardService = async (ownerId) => {
    const shop = await Shop.findOne({ owner: ownerId });
    if (!shop) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
    }

    const shopId = shop._id;

    const orderStats = await Order.aggregate([
        {
            $match: {
                shop: shopId,
                status: { $ne: "Canceled" }
            }
        },
        {
            $group: {
                _id: null,
                revenue: { $sum: "$totalAmount" },
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: "$totalAmount" }
            }
        }
    ]);

    const topProducts = await Order.aggregate([
        { $match: { shop: shopId, status: "Delivered" } },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.name",
                quantity: { $sum: "$items.quantity" }
            }
        },
        { $sort: { quantity: -1 } },
        { $limit: 4 }
    ]);

    const recentOrders = await Order.find({ shop: shopId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("totalAmount status contactPhone");

    return {
        shop: {
            name: shop.name,
            isOpen: shop.isOpen
        },
        stats: {
            revenue: orderStats[0]?.revenue || 0,
            totalOrders: orderStats[0]?.totalOrders || 0,
            avgOrderValue: Math.round(orderStats[0]?.avgOrderValue || 0),
            rating: shop.rating?.avg || 0
        },
        topProducts: topProducts.map(p => ({
            label: p._id,
            value: p.quantity
        })),
        recentOrders: recentOrders.map(o => ({
            customer: o.contactPhone,
            total: o.totalAmount,
            status: o.status
        }))
    };
};

// Cập nhật thông tin quán
export const updateShopService = async (ownerId, updateData) => {
  const shop = await Shop.findOneAndUpdate(
    { owner: ownerId },
    updateData,
    {
      new: true,          // 🔥 CỰC KỲ QUAN TRỌNG
      runValidators: true // 🔒 giữ schema đúng
    }
  );

  if (!shop) {
    throw new ApiError(404, "Shop not found");
  }

  return shop;
};


// Cập nhật trạng thái mở/đóng quán
export const updateShopStatusService = async (ownerId, isOpen) => {
    const shop = await Shop.findOneAndUpdate(
        { owner: ownerId },
        { isOpen },
        { new: true }
    );
    if (!shop) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
    }
    return shop;
};

// Hàm lấy danh sách tất cả các quán để hiển thị trang chủ
export const getAllShopsService = async (options = {}) => {
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const skip = (page - 1) * limit;
    const queryConditions = { isOpen: true }; // Chỉ lấy các shop đang mở cửa

    const shops = await Shop.find(queryConditions)
        .populate('owner', 'name email')
        .skip(skip)   // Bỏ qua các bản ghi của trang trước
        .limit(limit); // Giới hạn số lượng bản ghi của trang này

    const totalShops = await Shop.countDocuments(queryConditions);
    const totalPages = Math.ceil(totalShops / limit);

    return {
        data: shops,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: totalPages,
            totalItems: totalShops,
        },
    };
};

// Hàm lấy thông tin chi tiết 1 shop
export const getShopDetailService = async (shopId) => {
    // BƯỚC 1: Lấy thông tin Shop
    const shop = await Shop.findById(shopId).populate('owner', 'name email');
    if (!shop) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
    }

    // BƯỚC 2: Lấy danh sách Category (Sắp xếp theo thứ tự hiển thị)
    // lean() giúp query nhanh hơn, trả về plain object thay vì mongoose document
    const categories = await Category.find({ shopId: shopId }).sort({ displayOrder: 1 }).lean();

    // BƯỚC 3: Lấy toàn bộ Item đang bán
    const items = await Item.find({ shopId: shopId, isAvailable: true }).lean();

    // BƯỚC 4: Ghép Item vào Category (Mapping in Memory - Tối ưu hơn gọi DB nhiều lần)
    const menu = categories.map(category => {
        const itemsByCategory = items.filter(item =>
            // So sánh String của ID để tránh lỗi objectId
            item.categoryId && item.categoryId.toString() === category._id.toString()
        );

        return {
            _id: category._id,
            name: category.name,
            description: category.description, // Trả thêm mô tả nhóm nếu có
            items: itemsByCategory
        };
    });

    // BƯỚC 5: Xử lý món chưa phân loại (dự phòng)
    const otherItems = items.filter(item => !item.categoryId);
    if (otherItems.length > 0) {
        menu.push({
            _id: "other",
            name: "Món khác",
            items: otherItems
        });
    }

    return {
        shop,
        menu
    };
};

export const getShopByIDService = async (shopId) => {
    const shop = await Shop.findById(shopId);
    if (!shop) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Shop not found");
    }
    return shop;
};