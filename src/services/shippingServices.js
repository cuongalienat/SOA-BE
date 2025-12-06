/* File: src/services/shippingService.js */

export const calculateShippingFee = (distanceInMeters, subTotal = 0) => {
    // 1. Đổi mét ra km (Làm tròn 1 chữ số thập phân cho dễ tính)
    const distanceKm = distanceInMeters / 1000;

    let fee = 0;

    // --- A. PHÍ CƠ BẢN (Bậc thang) ---
    if (distanceKm <= 2) {
        fee = 16000; // 2km đầu giá cố định 16k
    } else {
        // 16k + 5k cho mỗi km tiếp theo (làm tròn lên)
        // Ví dụ: 2.1km -> Tính là 3km -> Phụ thu 1km
        fee = 16000 + Math.ceil(distanceKm - 2) * 5000;
    }

    // --- B. PHỤ PHÍ GIỜ CAO ĐIỂM (Fix lỗi Timezone) ---
    // Lấy giờ hiện tại theo giờ Việt Nam
    const nowVN = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const currentHour = new Date(nowVN).getHours();

    // Khung giờ: 11h-13h (Trưa) HOẶC 17h-19h (Tối)
    // Lưu ý: Logic < 13 nghĩa là 12:59 vẫn tính, 13:00 là hết. 
    if ((currentHour >= 11 && currentHour < 13) || (currentHour >= 17 && currentHour < 19)) {
        fee += 5000; 
    }

    // --- C. PHỤ PHÍ ĐƠN NHỎ ---
    // Nếu tổng đơn < 50k thì phạt thêm 3k (service fee/small order fee)
    if (subTotal > 0 && subTotal < 50000) {
        fee += 3000;
    }

    return fee;
};