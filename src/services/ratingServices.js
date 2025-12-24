import Rating from '../models/rating.js';
import Shop from '../models/shop.js';
import Order from '../models/order.js';
import ApiError from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

/**
 * Hàm helper để tính toán và cập nhật lại điểm trung bình, tổng lượt đánh giá cho Shop.
 * Sẽ được gọi mỗi khi có một rating mới được tạo hoặc cập nhật.
 * @param {string} shopId - ID của Shop cần cập nhật.
 */
const updateShopRatingStats = async (shopId) => {
    const stats = await Rating.aggregate([
        { $match: { shop: new mongoose.Types.ObjectId(shopId) } },
        {
            $group: {
                _id: '$shop', // Nhóm theo shopId
                averageRating: { $avg: '$stars' }, // Tính giá trị trung bình của trường 'stars'
                totalRatings: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        const { averageRating, totalRatings } = stats[0];
        await Shop.findByIdAndUpdate(shopId, {
            averageRating: averageRating.toFixed(1),
            totalRatings: totalRatings
        });
    } else {
        await Shop.findByIdAndUpdate(shopId, {
            averageRating: 0,
            totalRatings: 0
        });
    }
};


/**
 * Service để user tạo một đánh giá mới cho một đơn hàng đã hoàn thành.
 * @param {string} userId - ID của người dùng đang thực hiện (lấy từ token).
 * @param {object} ratingData - Dữ liệu đánh giá từ client ({ orderId, stars, comment }).
 * @returns {Promise<Document>} - Document rating vừa được tạo.
 */
export const createRatingService = async (userId, ratingData) => {
    const { orderId, stars, comment } = ratingData;

    const order = await Order.findById(orderId);

    if (!order) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Order not found.");
    }
    if (order.user.toString() !== userId.toString()) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You can only rate your own orders.");
    }
    if (order.status !== 'Delivered') {
        throw new ApiError(StatusCodes.BAD_REQUEST, "You can only rate completed orders.");
    }

    if (order.rating) {
        throw new ApiError(StatusCodes.CONFLICT, "This order has already been rated.");
    }

    const newRating = await Rating.create({
        user: userId,
        shop: order.shop, // Lấy shopId trực tiếp từ đơn hàng
        order: orderId,
        stars,
        comment
    });

    order.rating = newRating._id;
    await order.save();

    await updateShopRatingStats(order.shop.toString());

    return newRating;
};

/**
 * Service để lấy danh sách các đánh giá của một shop (có phân trang).
 * @param {string} shopId - ID của shop muốn xem đánh giá.
 * @param {object} options - Tùy chọn phân trang { page, limit }.
 * @returns {Promise<object>} - Đối tượng chứa dữ liệu và thông tin phân trang.
 */
export const getRatingsByShopService = async (shopId, options = {}) => {
    // Thiết lập giá trị mặc định cho phân trang
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const skip = (page - 1) * limit;

    const queryConditions = { shop: shopId };

    const ratings = await Rating.find(queryConditions)
        .populate('user', 'name') // Lấy thông tin 'name' của người dùng đã đánh giá
        .sort({ createdAt: -1 }) // Sắp xếp các đánh giá mới nhất lên đầu
        .skip(skip)
        .limit(limit);

    const totalRatings = await Rating.countDocuments(queryConditions);
    const totalPages = Math.ceil(totalRatings / limit);

    return {
        data: ratings,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: totalPages,
            totalItems: totalRatings,
        },
    };
};

/**
 * Service để lấy danh sách các đánh giá của một món ăn (dựa trên order history).
 * @param {string} itemId - ID của món ăn.
 * @param {object} options - Tùy chọn phân trang { page, limit }.
 * @returns {Promise<object>} - Đối tượng chứa dữ liệu và thông tin phân trang.
 */
export const getRatingsByItemService = async (itemId, options = {}) => {
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const skip = (page - 1) * limit;

    const pipeline = [
        {
            $lookup: {
                from: 'orders',
                localField: 'order',
                foreignField: '_id',
                as: 'orderDetail'
            }
        },
        { $unwind: '$orderDetail' },
        {
            $match: {
                'orderDetail.items.item': new mongoose.Types.ObjectId(itemId)
            }
        },
        {
            $facet: {
                data: [
                    { $sort: { createdAt: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'user',
                            foreignField: '_id',
                            as: 'userDetails'
                        }
                    },
                    { $unwind: '$userDetails' },
                    {
                        $project: {
                            _id: 1,
                            stars: 1,
                            comment: 1,
                            createdAt: 1,
                            user: {
                                _id: '$userDetails._id',
                                name: '$userDetails.fullName'
                            }
                        }
                    }
                ],
                totalCount: [
                    { $count: 'count' }
                ]
            }
        }
    ];

    const results = await Rating.aggregate(pipeline);

    // Aggregate returns an array, and due to $facet, results[0] contains our streams
    // Need to handle case where results might be empty (unlikely with facet but possible structure)
    const data = results[0]?.data || [];
    const totalRatings = results[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalRatings / limit);

    return {
        data,
        pagination: {
            currentPage: page,
            limit,
            totalPages,
            totalItems: totalRatings,
        },
    };
};

export const getRatingByOrderIdService = async (orderId) => {
    const rating = await Rating.findOne({ order: orderId });
    return { data: rating };
};