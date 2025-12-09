/* File: src/update_coordinates.js */
import mongoose from 'mongoose';
import Shop from './models/shop.js';
import { getCoordinates } from './services/goongServices.js';

// Connection String
const MONGO_URI = 'mongodb+srv://cuongalienat:Cuong%402005@soa.4bzevi6.mongodb.net/?retryWrites=true&w=majority&appName=SOA';

const updateLocations = async () => {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected DB");

    const shops = await Shop.find({});
    console.log(`📦 Tìm thấy ${shops.length} quán cần cập nhật tọa độ.`);

    for (const shop of shops) {
        // Nếu chưa có tọa độ hoặc tọa độ là [0,0]
        if (shop.location.coordinates[0] === 0) {
            console.log(`⏳ Đang lấy tọa độ cho: ${shop.name} (${shop.address})...`);
            
            const coords = await getCoordinates(shop.address);
            
            if (coords) {
                // Lưu GeoJSON: [Longitude, Latitude] (Goong trả về lat, lng nên phải đảo ngược)
                shop.location.coordinates = [coords.lng, coords.lat];
                await shop.save();
                console.log(`   ✅ Updated: [${coords.lng}, ${coords.lat}]`);
            } else {
                console.log(`   ❌ Không tìm thấy tọa độ.`);
            }
        }
    }
    console.log("🎉 Hoàn tất!");
    process.exit();
};

updateLocations();