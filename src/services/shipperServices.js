import Shipper from "../models/shipper.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";
import User from "../models/user.js";
import Delivery from "../models/delivery.js";
import { getIO } from "../utils/socket.js";

// 1. Đăng ký làm tài xế
const registerShipper = async ({ userId, vehicleType, licensePlate }) => {
  // 1. Check xem đã đăng ký chưa
  const exist = await Shipper.findOne({ user: userId });

  // Nếu đã tồn tại trong bảng Shipper, kiểm tra xem role bên User đã lên driver chưa
  if (exist) {
    // (Optional) Fix lỗi dữ liệu cũ: Nếu có Shipper mà User vẫn là customer thì update luôn
    const userCheck = await User.findById(userId);
    if (userCheck && userCheck.role !== "driver") {
      await User.findByIdAndUpdate(userId, { role: "driver" });
      return exist; // Trả về luôn coi như thành công
    }

    throw new ApiError(
      StatusCodes.CONFLICT,
      "Tài khoản này đã đăng ký làm tài xế rồi!"
    );
  }

  // 2. Tạo Shipper mới
  const newShipper = await Shipper.create({
    user: userId,
    vehicleType,
    licensePlate,
    status: "OFFLINE",
    currentLocation: {
      // Thêm cái này để đỡ lỗi tìm quanh đây
      type: "Point",
      coordinates: [105.823, 20.998], // Default tạm Hà Nội
    },
  });

  // 3. QUAN TRỌNG: Cập nhật role cho User
  await User.findByIdAndUpdate(userId, { role: "driver" });

  return newShipper;
};

// 2. Bật/Tắt trạng thái (Online/Offline)
const updateStatus = async (userId, status) => {
  if (!["ONLINE", "OFFLINE"].includes(status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Trạng thái không hợp lệ");
  }

  // 1. Cập nhật trạng thái Shipper
  const shipper = await Shipper.findOneAndUpdate(
    { user: userId },
    { status: status },
    { new: true }
  );

  if (!shipper) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Hồ sơ tài xế không tồn tại.");
  }

  // ============================================================
  // 🚀 LOGIC MỚI: QUÉT ĐƠN HÀNG TỒN ĐỌNG (BACKLOG SCAN)
  // ============================================================
  if (status === "OFFLINE") {
    // Nếu trạng thái trong profile đang là SHIPPING -> Chặn ngay
    if (shipper.status === "SHIPPING") {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Bạn đang giao hàng, không thể Offline lúc này!"
      );
    }

    // (Kỹ hơn) Quét trong bảng Delivery xem có đơn nào chưa xong không
    // Phòng trường hợp profile bị lệch trạng thái
    const activeJob = await Delivery.findOne({
      shipperId: userId,
      status: { $in: ["ASSIGNED", "PICKING_UP", "DELIVERING"] },
    });

    if (activeJob) {
      // Tự sửa lại status profile nếu nó bị sai
      if (shipper.status !== "SHIPPING") {
        shipper.status = "SHIPPING";
        await shipper.save();
      }
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Bạn còn đơn hàng chưa hoàn thành!"
      );
    }
  }
  if (status === "ONLINE") {
    try {
      console.log(
        `📡 Shipper ${userId} vừa Online. Đang quét đơn quanh đây...`
      );

      // Tìm các đơn hàng đang SEARCHING trong vòng 5km
      const pendingDeliveries = await Delivery.find({
        status: "SEARCHING",
        "pickup.location": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: shipper.currentLocation.coordinates,
            },
            $maxDistance: 5000, // 5km
          },
        },
      });

      console.log(`📦 Tìm thấy ${pendingDeliveries.length} đơn hàng chờ.`);

      if (pendingDeliveries.length > 0) {
        const io = getIO();

        // Bắn từng đơn hàng cho Shipper này
        pendingDeliveries.forEach((delivery) => {
          io.to(`user:${userId.toString()}`).emit("NEW_JOB", {
            deliveryId: delivery._id,
            pickup: delivery.pickup.address,
            dropoff: delivery.dropoff.address,
            fee: delivery.shippingFee,
            distance: delivery.distance,
          });
        });
      }
    } catch (error) {
      console.error("⚠️ Lỗi quét đơn tồn đọng:", error);
      // Không throw error ở đây để tránh làm lỗi API updateStatus chính
    }
  }
  // ============================================================

  return shipper;
};

// 3. Cập nhật vị trí (Ping Location)
const updateLocation = async (userId, lat, lng) => {
  const shipper = await Shipper.findOneAndUpdate(
    { user: userId },
    {
      currentLocation: {
        type: "Point",
        coordinates: [lng, lat], // GeoJSON: Kinh độ trước
      },
    },
    { new: true }
  );

  if (!shipper) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Hồ sơ tài xế không tồn tại.");
  }

  return shipper;
};

// 4. Lấy thông tin Shipper (Profile)
const getShipperProfile = async (userId) => {
  const shipper = await Shipper.findOne({ user: userId }).populate(
    "user",
    "name email phone avatar"
  );
  if (!shipper)
    throw new ApiError(StatusCodes.NOT_FOUND, "Chưa đăng ký tài xế.");
  return shipper;
};

export const findNearbyShippers = async (
  coords,
  maxDistanceInMeters = 5000
) => {
  // coords: [Lng, Lat] của Quán (Điểm lấy hàng)

  try {
    const shippers = await Shipper.find({
      currentLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: coords,
          },
          $maxDistance: maxDistanceInMeters, // Ví dụ: 5000 mét (5km)
        },
      },
      status: "ONLINE", // Chỉ tìm ông nào đang bật app
    }).populate("user", "_id name"); // Lấy info user để bắn socket

    return shippers;
  } catch (error) {
    console.error("Lỗi tìm shipper:", error);
    return [];
  }
};

// Backend: shippersService.js

const updateShipperProfile = async (userId, data) => {
  const { phone } = data;

  // 1. Chỉ cho phép Shipper tự cập nhật Số điện thoại vào bảng User
  if (!phone) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Số điện thoại là bắt buộc.");
  }

  // Cập nhật SĐT trong bảng User
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { phone: phone },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy tài khoản.");
  }

  // 2. Lấy lại thông tin Shipper đầy đủ để trả về FE
  const shipper = await Shipper.findOne({ user: userId }).populate(
    "user",
    "name email phone avatar"
  );

  return shipper;
};

// 6. Lấy lịch sử đơn hàng của Shipper
const getShipperHistory = async (userId, status = null) => {
  // Tạo query tìm kiếm theo shipperId
  let query = { shipperId: userId };

  // Nếu truyền status (ví dụ: 'COMPLETED'), sẽ lọc theo status đó
  if (status) {
    query.status = status;
  } else {
    // Mặc định thường lịch sử sẽ hiện các đơn đã xong hoặc đã hủy
    // Nếu bạn muốn hiện cả đơn đang đi thì bỏ dòng này
    query.status = { $in: ["COMPLETED", "CANCELLED"] };
  }

  const history = await Delivery.find(query)
    .populate({
      path: "orderId",
      select: "items totalAmount paymentMethod", // Lấy thêm thông tin từ đơn hàng nếu cần
    })
    .sort({ createdAt: -1 }); // Đơn mới nhất hiện lên đầu

  return history;
};

export const shipperService = {
  registerShipper,
  updateStatus,
  updateLocation,
  getShipperProfile,
  findNearbyShippers,
  updateShipperProfile,
  getShipperHistory,
};
