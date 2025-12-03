/* File: src/seed.js - Cập nhật thêm trường photos */
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
    return parseInt(val.toString().replace(/[^0-9]/g, ''), 10);
};

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected DB');

        if (!fs.existsSync(DATA_FILE)) throw new Error("❌ Thiếu data_full.json");
        const rawData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

        console.log('🧹 Đang dọn dẹp dữ liệu cũ (Giữ lại User)...');
        await Promise.all([
            Shop.deleteMany({}),
            Category.deleteMany({}),
            Item.deleteMany({})
        ]);
        console.log('✨ Đã xóa sạch dữ liệu cũ!');

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

        console.log(`📦 Importing ${rawData.length} shops...`);

        for (const shopData of rawData) {
            // Xóa quán cũ để tạo lại
            await Shop.deleteOne({ name: shopData.name });

            // 1. Tạo Shop (Thêm photos)
            const newShop = await Shop.create({
                owner: owner._id,
                name: shopData.name,
                address: shopData.address,
                
                coverImage: shopData.coverImage, // Ảnh đại diện
                photos: shopData.photos || [],        // 👉 MẢNG ẢNH ĐA KÍCH THƯỚC
                
                phones: shopData.phones,
                rating: shopData.rating,
                priceRange: shopData.priceRange,
                openingHours: shopData.openingHours,
                isOpen: true,
                tags: shopData.categories.map(c => c.name)
            });

            // 2. Tạo Category & Item (Giữ nguyên logic cũ)
            if (shopData.categories) {
                let order = 1;
                for (const catData of shopData.categories) {
                    const newCategory = await Category.create({
                        shopId: newShop._id,
                        name: catData.name,
                        displayOrder: order++
                    });
                    const itemsBuffer = [];
                    if (catData.items) {
                        for (const item of catData.items) {
                            itemsBuffer.push({
                                shopId: newShop._id,
                                categoryId: newCategory._id,
                                name: item.name,
                                price: cleanPrice(item.price),
                                description: item.description,
                                imageUrl: item.imageUrl || "https://via.placeholder.com/300",
                                isAvailable: item.isAvailable
                            });
                        }
                    }
                    if (itemsBuffer.length > 0) await Item.insertMany(itemsBuffer);
                }
            }
            console.log(`   ✅ DONE: "${newShop.name}"`);
        }
        console.log('\n🎉 ALL DONE!');
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

seedData();