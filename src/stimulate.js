/* file: simulate_real.js */
import axios from 'axios';
import polyline from '@mapbox/polyline'; // Nhớ npm install ở backend folder nữa nhé

// 👇 CẤU HÌNH (Điền thông tin thật của bạn vào)
const DELIVERY_ID = "693556caf3e05c312e73e3fe"; 
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzQwMmJmMTQxZDZmOTkwZWU3N2EzOSIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc2NTA0MjA5NCwiZXhwIjoxNzY1MTI4NDk0fQ.m52DMsQOlE_f9wDYuHt5Sc4dgJpDEW3nZRK5-l3qb3s"; 
const GOONG_API_KEY = "63QnExA88BuAbVaQNU4EDxGyfjAbNZRO9Bqhh2NK";

const START_POINT = { lat: 20.998674, lng: 105.823027 }; 
const END_POINT = { lat: 21.028511, lng: 105.804817 };

const runRealSimulation = async () => {
    console.log("📡 Đang lấy lộ trình thực tế từ Goong...");

    try {
        const origin = `${START_POINT.lat},${START_POINT.lng}`;
        const destination = `${END_POINT.lat},${END_POINT.lng}`;
        const url = `https://rsapi.goong.io/Direction?origin=${origin}&destination=${destination}&vehicle=bike&api_key=${GOONG_API_KEY}`;

        const res = await axios.get(url);
        
        if (!res.data.routes || !res.data.routes[0]) {
            console.error("❌ Không tìm thấy đường đi!");
            return;
        }

        const encodedPolyline = res.data.routes[0].overview_polyline.points;
        const pathPoints = polyline.decode(encodedPolyline); 

        console.log(`✅ Tìm thấy lộ trình dài ${pathPoints.length} điểm. Bắt đầu chạy...`);

        for (let i = 0; i < pathPoints.length; i++) {
            const point = pathPoints[i]; // [lat, lng]
            
            // Gọi API Update Status
            await axios.patch(
                `http://localhost:3000/v1/deliveries/${DELIVERY_ID}/status`,
                {
                    status: "DELIVERING", // Status giữ nguyên, chỉ update vị trí
                    location: {
                        lat: point[0],
                        lng: point[1]
                    }
                },
                { headers: { Authorization: `Bearer ${TOKEN}` } }
            );

            console.log(`[${i + 1}/${pathPoints.length}] 🛵 Đang đi qua: ${point[0]}, ${point[1]}`);

            // ⏳ Chờ 1 chút cho giống thật (Xe chạy nhanh hay chậm chỉnh ở đây)
            // 500ms = Nửa giây update 1 lần (Xe chạy khá nhanh)
            await new Promise(r => setTimeout(r, 50)); 
        }

        console.log("🏁 Đã đến nơi! (Giao hàng thành công)");
        
        // Tự động Complete luôn cho xịn
        await axios.patch(
            `http://localhost:3000/v1/deliveries/${DELIVERY_ID}/status`,
            { status: "COMPLETED", location: { lat: END_POINT.lat, lng: END_POINT.lng } },
            { headers: { Authorization: `Bearer ${TOKEN}` } }
        );

    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    }
};

runRealSimulation();