/* File: src/seed.js
   Tác dụng: Nạp dữ liệu vào DB (Chế độ thông minh: Không lỗi trùng lặp)
*/

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Shop from './models/shop.js';
import User from './models/user.js';
import Category from './models/Category.js';
import Item from './models/Item.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data_full.json');

const MONGO_URI = 'mongodb+srv://cuongalienat:Cuong%402005@soa.4bzevi6.mongodb.net/?retryWrites=true&w=majority&appName=SOA';

const cleanPrice = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseInt(val.toString().replace(/[^0-9]/g, ''), 10);
};

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected DB');

        if (!fs.existsSync(DATA_FILE)) throw new Error("❌ Thiếu file data_full.json");
        const rawData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

        // 1. XỬ LÝ ADMIN USER (Fix lỗi E11000)
        let owner = await User.findOne({ username: "admin_shopee" });
        
        if (!owner) {
            console.log('👤 Đang tạo mới Admin User...');
            owner = await User.create({
                username: "admin_shopee",
                fullName: "Admin ShopeeFood",
                email: "admin@shopee.com",
                password: "password123",
                role: "restaurant_manager",
                phone: "0909000888",
                age: 30,
                address: "Hà Nội"
            });
        } else {
            console.log('👤 Admin User đã tồn tại -> Sử dụng User cũ.');
        }

        console.log(`📦 Đang xử lý ${rawData.length} quán...`);

        // 2. Vòng lặp thêm quán
        for (const shopData of rawData) {
            
            // Kiểm tra quán đã tồn tại chưa
            const existingShop = await Shop.findOne({ name: shopData.name });

            if (existingShop) {
                console.log(`   ⏭️ BỎ QUA: "${shopData.name}" (Đã có trong DB)`);
                continue; 
            }

            // Tạo quán mới
            const newShop = await Shop.create({
                owner: owner._id,
                name: shopData.name,
                address: shopData.address,
                coverImage: shopData.image,
                phone: '090' + Math.floor(Math.random() * 10000000),
                isOpen: true,
                tags: shopData.categories.map(c => c.name)
            });

            // Tạo Category và Item
            if (shopData.categories && Array.isArray(shopData.categories)) {
                let displayOrder = 1;

                for (const catData of shopData.categories) {
                    const newCategory = await Category.create({
                        shopId: newShop._id,
                        name: catData.name,
                        displayOrder: displayOrder++
                    });

                    const itemsBuffer = [];
                    if (catData.items && Array.isArray(catData.items)) {
                        for (const item of catData.items) {
                            itemsBuffer.push({
                                shopId: newShop._id,
                                categoryId: newCategory._id,
                                name: item.name,
                                price: cleanPrice(item.price),
                                description: item.description || `Món ngon tại ${shopData.name}`, // Fix lỗi thiếu description
                                imageUrl: item.image,
                                isAvailable: true
                            });
                        }
                    }
                    if (itemsBuffer.length > 0) {
                        await Item.insertMany(itemsBuffer);
                    }
                }
            }
            console.log(`   ✅ ĐÃ THÊM MỚI: "${newShop.name}"`);
        }

        console.log('\n🎉 SEED COMPLETE! Dữ liệu đã được cập nhật.');
        process.exit();

    } catch (error) {
        console.error('❌ ERROR:', error);
        process.exit(1);
    }
};

seedData();