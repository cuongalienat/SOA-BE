/* File: src/merge_manual_pro.js - Ultimate Version (Deep Scan Menu & Time) */
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

// --- HÀM QUÉT TÌM MÓN ĂN ---
function findDishesArray(obj, foundLists = []) {
    if (!obj || typeof obj !== 'object') return foundLists;
    if (Array.isArray(obj)) {
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

// --- HÀM QUÉT TÌM GIỜ MỞ CỬA (MỚI) ---
// Nó tìm mọi mảng có tên "week_days" hoặc "times" chứa thông tin giờ
function findTimeArray(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // 1. Kiểm tra nếu chính object này chứa key mong muốn
    if (obj.week_days && Array.isArray(obj.week_days) && obj.week_days.length > 0) {
        return obj.week_days; // Cấu trúc Web
    }
    if (obj.times && Array.isArray(obj.times) && obj.times.length > 0) {
        // Kiểm tra kỹ hơn xem bên trong 'times' có start_time không (tránh nhầm lẫn)
        if (obj.times[0].start_time || obj.times[0].days) {
            return obj.times; // Cấu trúc Mobile
        }
    }

    // 2. Nếu là mảng, duyệt từng phần tử
    if (Array.isArray(obj)) {
        for (let item of obj) {
            const result = findTimeArray(item);
            if (result) return result;
        }
    } 
    // 3. Nếu là object, duyệt từng key
    else {
        for (let key of Object.keys(obj)) {
            const result = findTimeArray(obj[key]);
            if (result) return result;
        }
    }
    return null;
}

async function main() {
    try {
        console.log('🔄 Đang đọc dữ liệu...');
        
        if (!fs.existsSync(FILE_INFO) || !fs.existsSync(FILE_MENU)) {
            console.error("❌ Thiếu file input!"); return;
        }
        
        // Parse JSON an toàn
        let infoData, menuData;
        try {
            infoData = JSON.parse(fs.readFileSync(FILE_INFO, 'utf-8'));
            menuData = JSON.parse(fs.readFileSync(FILE_MENU, 'utf-8'));
        } catch (e) { console.error("❌ Lỗi JSON."); return; }

        // --- 1. XỬ LÝ INFO ---
        // Tự dò tìm object delivery_detail
        let d = null;
        if (infoData.reply && infoData.reply.delivery_detail) d = infoData.reply.delivery_detail;
        else if (infoData.delivery_detail) d = infoData.delivery_detail;
        else if (infoData.name && infoData.address) d = infoData; // Trường hợp copy phần ruột

        if (!d) { console.error("❌ Không tìm thấy dữ liệu quán."); return; }

        // Xử lý Ảnh
        let rawPhotos = [];
        if (d.res_photos && d.res_photos.length > 0 && d.res_photos[0].photos) rawPhotos = d.res_photos[0].photos;
        else if (d.photos && Array.isArray(d.photos)) rawPhotos = d.photos;
        
        const fullPhotos = rawPhotos.map(p => ({ width: p.width, height: p.height, value: p.value }));
        let selectedCover = DEFAULT_COVER_IMG;
        if (fullPhotos.length > 0) {
            const ideal = fullPhotos.find(p => p.width === 640);
            selectedCover = ideal ? ideal.value : fullPhotos[fullPhotos.length - 1].value;
        }

        // --- 🔴 QUÉT TÌM GIỜ MỞ CỬA (Dùng hàm đệ quy) 🔴 ---
        console.log("🕒 Đang quét tìm giờ mở cửa...");
        const workingTime = [];
        
        // Gọi hàm quét sâu vào biến d (delivery_detail)
        const foundTimeSource = findTimeArray(d);

        if (foundTimeSource) {
            console.log(`   ✅ Tìm thấy nguồn dữ liệu giờ (${foundTimeSource.length} mục).`);
            
            foundTimeSource.forEach(t => {
                // Loại 1: Mobile (Gộp ngày) -> Bung lụa ra
                if (t.days && Array.isArray(t.days)) {
                    t.days.forEach(day => {
                        workingTime.push({ day: day, open: t.start_time, close: t.end_time });
                    });
                } 
                // Loại 2: Web (Từng ngày lẻ)
                else {
                    const day = t.week_day !== undefined ? t.week_day : t.day;
                    workingTime.push({
                        day: day,
                        open: t.start_time,
                        close: t.end_time
                    });
                }
            });
        } else {
            console.warn("⚠️ Không tìm thấy giờ mở cửa ở bất cứ đâu. Dùng mặc định.");
            for(let i=1; i<=8; i++) workingTime.push({ day: i, open: "07:00", close: "22:00" });
        }

        const shopData = {
            name: d.name,
            address: d.address,
            phones: d.phones || [],
            image: selectedCover,
            photos: fullPhotos,
            openingHours: workingTime, // Kết quả
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
        console.log(`   -> Giờ mở cửa: ${shopData.openingHours.length} ngày.`);

        // --- 2. XỬ LÝ MENU (Logic cũ vẫn ngon) ---
        const allDishLists = findDishesArray(menuData);
        let categories = [];
        if (allDishLists.length > 0) {
            if (menuData.reply && menuData.reply.menu_infos) {
                 menuData.reply.menu_infos.forEach(grp => {
                     const items = grp.dishes.map(d => ({
                         name: d.name, price: d.price.value, description: d.description || "",
                         imageUrl: (d.photos && d.photos.length > 0) ? d.photos[0].value : DEFAULT_ITEM_IMG,
                         isAvailable: d.is_available
                     }));
                     categories.push({ name: grp.dish_type_name, items });
                 });
            } else if (menuData.reply && menuData.reply.dish_type_infos) {
                 menuData.reply.dish_type_infos.forEach(grp => {
                     const items = grp.dishes.map(d => ({
                         name: d.name, price: d.price.value, description: d.description || "",
                         imageUrl: (d.photos && d.photos.length > 0) ? d.photos[0].value : DEFAULT_ITEM_IMG,
                         isAvailable: d.is_available
                     }));
                     categories.push({ name: grp.dish_type_name, items });
                 });
            } else {
                const allItems = [];
                allDishLists.forEach(list => {
                    list.forEach(dish => {
                        let img = "";
                        if (dish.photos && dish.photos.length > 0) img = dish.photos[0].value;
                        let price = 0;
                        if (dish.price && dish.price.value) price = dish.price.value;
                        else if (dish.market_price) price = Number(dish.market_price);
                        allItems.push({
                            name: dish.name, price: price, description: dish.description || "",
                            imageUrl: img || DEFAULT_ITEM_IMG, isAvailable: true
                        });
                    });
                });
                const uniqueItems = [...new Map(allItems.map(item => [item['name'], item])).values()];
                categories.push({ name: "Thực Đơn Tổng Hợp", items: uniqueItems });
            }
        }
        shopData.categories = categories;

        // Lưu file
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

    } catch (error) { console.error('❌ Lỗi:', error.message); }
}

main();