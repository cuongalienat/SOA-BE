/* File: src/seed.js - Phiên bản có Model Category */
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Models
import Shop from './models/shop.js';
import User from './models/user.js';
import Category from './models/Category.js'; // Model mới
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

        // 1. Clear Data
        console.log('🧹 Clearing old data...');
        await Promise.all([
            Shop.deleteMany({}),
            Category.deleteMany({}), // Xóa category cũ
            Item.deleteMany({}),
            User.deleteMany({})
        ]);

        // 2. Create Owner
        const owner = await User.create({
            username: "admin_shopee",
            fullName: "Admin ShopeeFood",
            email: "admin@shopee.com",
            password: "password123",
            role: "restaurant_manager",
            phone: "0909000888",
            age: 30,
            address: "Hà Nội"
        });

        console.log(`📦 Importing ${rawData.length} shops...`);

        // 3. Loop Shops
        for (const shopData of rawData) {
            // A. Tạo Shop
            const newShop = await Shop.create({
                owner: owner._id,
                name: shopData.name,
                address: shopData.address,
                coverImage: shopData.image,
                phone: '090' + Math.floor(Math.random() * 10000000),
                isOpen: true,
            });

            // B. Duyệt qua từng Category trong JSON
            if (shopData.categories && Array.isArray(shopData.categories)) {
                let displayOrder = 1;

                for (const catData of shopData.categories) {
                    // Tạo Category vào DB
                    const newCategory = await Category.create({
                        shopId: newShop._id,
                        name: catData.name, // VD: "SỮA HOA QUẢ"
                        displayOrder: displayOrder++
                    });

                    // C. Chuẩn bị Items cho Category này
                    const itemsBuffer = [];
                    if (catData.items && Array.isArray(catData.items)) {
                        for (const item of catData.items) {
                            itemsBuffer.push({
                                shopId: newShop._id,
                                categoryId: newCategory._id, // 🔥 Link với Category vừa tạo
                                name: item.name,
                                price: cleanPrice(item.price),
                                description: item.description || "",
                                imageUrl: item.image,
                                isAvailable: true
                            });
                        }
                    }

                    // Insert Items
                    if (itemsBuffer.length > 0) {
                        await Item.insertMany(itemsBuffer);
                    }
                }
            }
            console.log(`   -> 🏪 Đã thêm: "${newShop.name}"`);
        }

        console.log('\n🎉 SEED COMPLETE! Cấu trúc Shop -> Category -> Item đã chuẩn.');
        process.exit();

    } catch (error) {
        console.error('❌ ERROR:', error);
        process.exit(1);
    }
};

seedData();