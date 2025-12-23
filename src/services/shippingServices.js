/* File: src/services/shippingService.js */
import { getCoordinates, getDistance } from "./goongServices.js";

export const calculateShippingFee = async (userLocation, dbShop) => {
    console.log("📍 Đang tìm tọa độ cho địa chỉ:", userLocation);

    if (!userLocation) {
        throw new ApiError(400, "Vui lòng nhập địa chỉ giao hàng.");
    }

    const coords = await getCoordinates(userLocation);

    if (!coords) {
        throw new ApiError(400, "Không tìm thấy địa chỉ này trên bản đồ. Vui lòng ghi rõ hơn.");
    }

    let finalLat = coords.lat;
    let finalLng = coords.lng;
    console.log("✅ Tìm thấy:", finalLat, finalLng);

    const shopCoords = `${dbShop.location.coordinates[1]},${dbShop.location.coordinates[0]}`; // Lat,Lng
    const userCoords = `${finalLat},${finalLng}`; // Lat,Lng (Dùng toạ độ vừa tìm được)

    const distanceData = await getDistance(shopCoords, userCoords);

    if (!distanceData) {
        throw new ApiError(500, "Lỗi tính khoảng cách (Goong API). Kiểm tra lại Key.");
    }
    // 1. Đổi mét ra km (Làm tròn 1 chữ số thập phân cho dễ tính)
    const distanceKm = distanceData.distanceValue / 1000;

    let shippingFee = 0;

    // --- A. PHÍ CƠ BẢN (Bậc thang) ---
    if (distanceKm <= 2) {
        shippingFee = 16000; // 2km đầu giá cố định 16k
    } else {
        // 16k + 5k cho mỗi km tiếp theo (làm tròn lên)
        // Ví dụ: 2.1km -> Tính là 3km -> Phụ thu 1km
        shippingFee = 16000 + Math.ceil(distanceKm - 2) * 5000;
    }

    // --- B. PHỤ PHÍ GIỜ CAO ĐIỂM (Fix lỗi Timezone) ---
    // Lấy giờ hiện tại theo giờ Việt Nam
    const nowVN = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const currentHour = new Date(nowVN).getHours();

    // Khung giờ: 11h-13h (Trưa) HOẶC 17h-19h (Tối)
    // Lưu ý: Logic < 13 nghĩa là 12:59 vẫn tính, 13:00 là hết. 
    if ((currentHour >= 11 && currentHour < 13) || (currentHour >= 17 && currentHour < 19)) {
        shippingFee += 5000;
    }
    console.log("✅ Phí giao hàng (bao gồm phí cao điểm):", shippingFee);
    return { distanceData, shippingFee };
};