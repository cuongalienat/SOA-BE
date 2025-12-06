/* File: src/merge_manual_pro.js - Final Merge (Info Pro + Menu Standard) */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_INFO = path.join(__dirname, 'input_info.json');
const FILE_MENU = path.join(__dirname, 'input_menu.json');
const OUTPUT_FILE = path.join(__dirname, 'data_full.json');

const DEFAULT_ITEM_IMG = "https://via.placeholder.com/300x300.png?text=No+Image";
const DEFAULT_COVER_IMG = "https://via.placeholder.com/640x400.png?text=Shop+Image";

// --- HÀM HELPER: QUÉT TÌM MÓN ĂN (Logic của bạn) ---
function findDishesArray(obj, foundLists = []) {
    if (!obj || typeof obj !== 'object') return foundLists;
    if (Array.isArray(obj)) {
        // Dấu hiệu nhận biết mảng món ăn: có 'name' và có 'price'
        if (obj.length > 0 && obj[0].name && (obj[0].price !== undefined || obj[0].market_price !== undefined)) {
            foundLists.push(obj);
        } else {
            obj.forEach(item => findDishesArray(item, foundLists));
        }
    } else {
        Object.keys(obj).forEach(key => findDishesArray(obj[key], foundLists));
    }
    return foundLists;
}

// --- HÀM HELPER: QUÉT TÌM GIỜ MỞ CỬA (Logic mới nhất) ---
function findTimeArray(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.week_days && Array.isArray(obj.week_days) && obj.week_days.length > 0) return obj.week_days;
    if (obj.times && Array.isArray(obj.times) && obj.times.length > 0) {
        if (obj.times[0].start_time || obj.times[0].days) return obj.times;
    }
    if (Array.isArray(obj)) {
        for (let item of obj) {
            const result = findTimeArray(item);
            if (result) return result;
        }
    } else {
        for (let key of Object.keys(obj)) {
            const result = findTimeArray(obj[key]);
            if (result) return result;
        }
    }
    return null;
}

async function main() {
    try {
        console.log('🔄 Đang đọc dữ liệu đầu vào...');
        
        if (!fs.existsSync(FILE_INFO) || !fs.existsSync(FILE_MENU)) {
            console.error("❌ Thiếu file input!"); return;
        }

        // Parse JSON
        let infoData, menuData;
        try {
            infoData = JSON.parse(fs.readFileSync(FILE_INFO, 'utf-8'));
            menuData = JSON.parse(fs.readFileSync(FILE_MENU, 'utf-8'));
        } catch (e) { console.error("❌ Lỗi cú pháp JSON."); return; }

        // ============================================================
        // PHẦN 1: XỬ LÝ INFO (GIỮ NGUYÊN LOGIC XỊN ĐỂ LẤY GIỜ & ẢNH)
        // ============================================================
        
        // 1. Tìm object delivery_detail
        let d = null;
        if (infoData.reply && infoData.reply.delivery_detail) d = infoData.reply.delivery_detail;
        else if (infoData.delivery_detail) d = infoData.delivery_detail;
        else if (infoData.name && infoData.address) d = infoData;

        if (!d) { console.error("❌ Không tìm thấy dữ liệu quán trong Info."); return; }

        // 2. Xử lý Ảnh (Lấy full mảng)
        let rawPhotos = [];
        if (d.res_photos && d.res_photos.length > 0 && d.res_photos[0].photos) rawPhotos = d.res_photos[0].photos;
        else if (d.photos && Array.isArray(d.photos)) rawPhotos = d.photos;
        
        const fullPhotos = rawPhotos.map(p => ({ width: p.width, height: p.height, value: p.value }));
        let selectedCover = DEFAULT_COVER_IMG;
        if (fullPhotos.length > 0) {
            const ideal = fullPhotos.find(p => p.width === 640);
            selectedCover = ideal ? ideal.value : fullPhotos[fullPhotos.length - 1].value;
        }

        // 3. Xử lý Giờ mở cửa (Dùng hàm Deep Scan Time mới nhất)
        console.log("🕒 Đang quét tìm giờ mở cửa...");
        const workingTime = [];
        const foundTimeSource = findTimeArray(d); // Gọi hàm quét giờ

        if (foundTimeSource) {
            foundTimeSource.forEach(t => {
                if (t.days && Array.isArray(t.days)) { // Mobile
                    t.days.forEach(day => workingTime.push({ day, open: t.start_time, close: t.end_time }));
                } else { // Web
                    const day = t.week_day !== undefined ? t.week_day : t.day;
                    workingTime.push({ day, open: t.start_time, close: t.end_time });
                }
            });
        } else {
            console.warn("⚠️ Không tìm thấy giờ. Dùng mặc định 7:00-22:00.");
            for(let i=1; i<=8; i++) workingTime.push({ day: i, open: "07:00", close: "22:00" });
        }

        const shopData = {
            name: d.name,
            address: d.address,
            phones: d.phones || [],
            image: selectedCover,
            photos: fullPhotos,
            openingHours: workingTime,
            rating: {
                avg: d.rating ? d.rating.avg : 0,
                total_review: d.rating ? d.rating.total_review : 0
            },
            priceRange: {
                min: d.price_range ? d.price_range.min_price : 0,
                max: d.price_range ? d.price_range.max_price : 0
            },
            categories: []
        };

        console.log(`✅ [INFO] ${shopData.name}`);

        // ============================================================
        // PHẦN 2: XỬ LÝ MENU (DÙNG LOGIC BẠN YÊU CẦU)
        // ============================================================
        
        const shopeeData = menuData; // Map tên biến cho khớp logic cũ của bạn
        const allDishLists = findDishesArray(shopeeData);
        let categories = [];

        if (allDishLists.length > 0) {
            // Logic 1: Menu Infos (Web)
            if (shopeeData.reply && shopeeData.reply.menu_infos) {
                 shopeeData.reply.menu_infos.forEach(grp => {
                     const items = grp.dishes.map(d => ({
                         name: d.name,
                         price: d.price.value,
                         description: d.description || "",
                         // 👇 Logic lấy ảnh từ code bạn gửi
                         imageUrl: (d.photos && d.photos.length > 0) ? d.photos[0].value : DEFAULT_ITEM_IMG,
                         isAvailable: true
                     }));
                     categories.push({ name: grp.dish_type_name, items });
                 });
            } 
            // Logic 2: Dish Type Infos (App)
            else if (shopeeData.reply && shopeeData.reply.dish_type_infos) {
                 shopeeData.reply.dish_type_infos.forEach(grp => {
                     const items = grp.dishes.map(d => ({
                         name: d.name,
                         price: d.price.value,
                         description: d.description || "",
                         imageUrl: (d.photos && d.photos.length > 0) ? d.photos[0].value : DEFAULT_ITEM_IMG,
                         isAvailable: true
                     }));
                     categories.push({ name: grp.dish_type_name, items });
                 });
            } 
            // Logic 3: Deep Scan Fallback
            if (categories.length === 0) {
                console.log("   ⚠️ Dùng Deep Scan gộp món...");
                const allItems = [];
                allDishLists.forEach(list => {
                    list.forEach(dish => {
                        let img = "";
                        if (dish.photos && dish.photos.length > 0) img = dish.photos[0].value;
                        let price = 0;
                        if (dish.price && dish.price.value) price = dish.price.value;
                        else if (dish.market_price) price = Number(dish.market_price);

                        allItems.push({
                            name: dish.name,
                            price: price,
                            description: dish.description || "",
                            imageUrl: img || DEFAULT_ITEM_IMG,
                            isAvailable: true
                        });
                    });
                });
                const uniqueItems = [...new Map(allItems.map(item => [item['name'], item])).values()];
                categories.push({ name: "Thực Đơn", items: uniqueItems });
            }
        } else {
            console.log('❌ Lỗi: JSON Menu không chứa món ăn nào.');
            // return; // Không return để vẫn lưu Info quán dù không có menu
        }

        shopData.categories = categories;
        console.log(`✅ [MENU] Đã lấy ${categories.length} nhóm món.`);

        // ============================================================
        // PHẦN 3: LƯU FILE
        // ============================================================
        let currentData = [];
        if (fs.existsSync(OUTPUT_FILE)) {
            try {
                const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
                if (content.trim()) currentData = JSON.parse(content);
            } catch (e) {}
        }

        const index = currentData.findIndex(s => s.name === shopData.name);
        if (index !== -1) {
            currentData[index] = shopData;
            console.log(`🔄 Updated.`);
        } else {
            currentData.push(shopData);
            console.log(`➕ Created.`);
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(currentData, null, 2));
        console.log(`🎉 XONG! Chạy 'node src/seed.js'`);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    }
}

main();