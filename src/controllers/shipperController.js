import { shipperService } from "../../src/services/shipperServices.js";
import { StatusCodes } from "http-status-codes";

const register = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { vehicleType, licensePlate } = req.body;

    const result = await shipperService.registerShipper({
      userId,
      vehicleType,
      licensePlate,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Đăng ký tài xế thành công!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status } = req.body; // { status: 'ONLINE' }

    const result = await shipperService.updateStatus(userId, status);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const pingLocation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { lat, lng } = req.body;

    await shipperService.updateLocation(userId, lat, lng);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Ping vị trí thành công",
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await shipperService.getShipperProfile(userId);
    res.status(StatusCodes.OK).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id; // Lấy từ Middleware Auth (token)

    // Gọi service xử lý
    const updatedShipper = await shipperService.updateShipperProfile(
      userId,
      req.body
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Cập nhật hồ sơ tài xế thành công!",
      data: updatedShipper,
    });
  } catch (error) {
    next(error); // Đẩy lỗi sang Middleware xử lý lỗi tập trung
  }
};

// Lấy lịch sử đơn hàng của Shipper
const getHistory = async (req, res, next) => {
  try {
    const userId = req.user._id; // Lấy từ authMiddleware

    // Bạn có thể lấy status từ query params nếu muốn lọc (VD: /history?status=COMPLETED)
    const { status } = req.query;

    // Gọi service xử lý
    const history = await shipperService.getShipperHistory(userId, status);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Lấy lịch sử đơn hàng thành công.",
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const shipperController = {
  register,
  toggleStatus,
  pingLocation,
  getProfile,
  updateProfile,
  getHistory,
};
