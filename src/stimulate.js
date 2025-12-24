/* file: simulate_real.js */
import axios from 'axios';
import polyline from '@mapbox/polyline'; // Nhớ npm install ở backend folder nữa nhé
import dotenv from "dotenv";
dotenv.config();

const DELIVERY_ID = "694bf805b7b1ad31f9bcbc87"; 
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzdkZmUwMDIxMTk2ZTkxYmQ5N2Y4NiIsInJvbGUiOiJkcml2ZXIiLCJpYXQiOjE3NjY1Nzg4ODgsImV4cCI6MTc2NjY2NTI4OH0.wagZQ4-ckMnOK0az2K59C9isOfMnp-4ik034yaLXAK8"; 
const GOONG_API_KEY = process.env.GOONG_API_KEY;

const START_POINT = { lat: 20.99867431900003, lng: 105.82302730300006 }; 
const END_POINT = { lat: 21.007762892000073, lng: 105.82385848800004 };


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


        console.log("⏳ Đang chuyển trạng thái sang PICKING_UP (Đi lấy hàng)...");
        await axios.patch(
            `http://localhost:3000/v1/deliveries/${DELIVERY_ID}`,
            {
                status: "PICKING_UP",
                // Giả sử lấy hàng thì đang đứng ở Shop (START_POINT)
                location: START_POINT 
            },
            { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        console.log("🏪 Đã chuyển sang PICKING_UP. Chờ 2 giây giả vờ lấy đồ...");
        
        // Chờ 2 giây cho giống thật
        await new Promise(r => setTimeout(r, 2000));

        console.log("🛵 Bắt đầu đi giao (DELIVERING)...");

        for (let i = 0; i < pathPoints.length; i++) {
            const point = pathPoints[i]; // [lat, lng]
            
            try {
                await axios.patch(
                    `http://localhost:3000/v1/deliveries/${DELIVERY_ID}`,
                    {
                        status: "DELIVERING", // Giờ chuyển sang DELIVERING là hợp lệ
                        location: {
                            lat: point[0],
                            lng: point[1]
                        }
                    },
                    { headers: { Authorization: `Bearer ${TOKEN}` } }
                );
                
                process.stdout.write(`\r[${Math.round(((i+1)/pathPoints.length)*100)}%] 🛵 Vị trí: ${point[0]}, ${point[1]}   `);
            } catch (err) {
                console.log(`\n❌ Lỗi update bước ${i}:`, err.response?.data?.message || err.message);
                if(err.response?.status === 401 || err.response?.status === 403) return;
            }

            await new Promise(r => setTimeout(r, 200)); 
        }

        console.log("\n🏁 Đã đến nơi! Đang hoàn tất đơn...");
        
        // Hoàn tất đơn
        await axios.patch(
            `http://localhost:3000/v1/deliveries/${DELIVERY_ID}`,
            { status: "COMPLETED", location: { lat: END_POINT.lat, lng: END_POINT.lng } },
            { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        console.log("🎉 ĐƠN HÀNG HOÀN TẤT!");

    } catch (error) {
        console.error("\n❌ Lỗi chung:", error.message);
    }
};

runRealSimulation();