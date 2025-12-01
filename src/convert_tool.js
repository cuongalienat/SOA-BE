/* File: src/convert_tool.js - Phiên bản giữ Category Mixue */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'raw_shopee.json');
const OUTPUT_FILE = path.join(__dirname, 'data_full.json');

// 👇👇👇 SỬA TÊN QUÁN Ở ĐÂY HOẶC NHẬP TỪ TERMINAL 👇👇👇
const args = process.argv.slice(2);
const CUSTOM_NAME = args[0] || "Mixue - Nguyễn Trãi"; 
const CUSTOM_ADDRESS = args[1] || "TP. Hồ Chí Minh";
const DEFAULT_IMAGE = "https://images.foody.vn/res/g108/1077655/prof/s640x400/foody-upload-api-foody-mobile-hmb-d36c478a-210419145604.jpg";

// Hàm đệ quy tìm NHÓM MÓN (Category) thay vì tìm món lẻ
function findMenuGroups(obj, foundGroups = []) {
    if (!obj || typeof obj !== 'object') return foundGroups;

    // Logic nhận diện Category của Mixue/ShopeeFood
    // Nó phải có tên nhóm (dish_type_name) VÀ danh sách món (dishes)
    const hasName = obj.dish_type_name || obj.group_name;
    const hasDishes = obj.dishes && Array.isArray(obj.dishes) && obj.dishes.length > 0;

    if (hasName && hasDishes) {
        foundGroups.push({
            groupName: obj.dish_type_name || obj.group_name,
            items: obj.dishes
        });
    }

    // Tiếp tục đào sâu tìm kiếm (cho các trường hợp lồng nhau)
    if (Array.isArray(obj)) {
        obj.forEach(item => findMenuGroups(item, foundGroups));
    } else {
        Object.keys(obj).forEach(key => {
            // Tránh vòng lặp vô hạn và không cần đào sâu vào chính cái dishes mình vừa lấy
            if (key !== 'dishes') {
                findMenuGroups(obj[key], foundGroups);
            }
        });
    }
    return foundGroups;
}

// Hàm fallback: Nếu không tìm thấy nhóm, thì quét món lẻ (như cũ)
function findDishesFallback(obj, foundLists = []) {
    if (!obj || typeof obj !== 'object') return foundLists;
    if (Array.isArray(obj)) {
        if (obj.length > 0 && obj[0].name && (obj[0].price !== undefined || obj[0].market_price !== undefined)) {
            foundLists.push(obj);
        } else {
            obj.forEach(item => findDishesFallback(item, foundLists));
        }
    } else {
        Object.keys(obj).forEach(key => findDishesFallback(obj[key], foundLists));
    }
    return foundLists;
}

async function main() {
    try {
        console.log('📦 Đang đọc file raw_shopee.json...');
        const rawContent = fs.readFileSync(INPUT_FILE, 'utf-8');
        const shopeeData = JSON.parse(rawContent);

        console.log(`🔎 Đang xử lý cho quán: "${CUSTOM_NAME}"`);

        // 1. ƯU TIÊN: Tìm theo Nhóm (Category) để giữ cấu trúc đẹp (Mixue)
        let foundCategories = findMenuGroups(shopeeData);
        let finalCategories = [];

        if (foundCategories.length > 0) {
            console.log(`   ⚡ Tìm thấy ${foundCategories.length} nhóm phân loại chuẩn (VD: ${foundCategories[0].groupName})`);
            
            foundCategories.forEach(group => {
                const items = [];
                group.items.forEach(dish => {
                    let dishImg = "";
                    if (dish.photos && dish.photos.length > 0) dishImg = dish.photos[0].value;
                    
                    let price = 0;
                    if (dish.price && dish.price.value) price = dish.price.value;
                    else if (dish.market_price) price = Number(dish.market_price);

                    items.push({
                        name: dish.name,
                        price: price,
                        description: dish.description || "",
                        image: dishImg
                    });
                });

                if (items.length > 0) {
                    finalCategories.push({
                        name: group.groupName, // Giữ nguyên tên nhóm (SỮA HOA QUẢ, TRÀ SỮA...)
                        items: items
                    });
                }
            });

        } else {
            // 2. FALLBACK: Nếu cấu trúc lạ quá, dùng cách cũ quét tất cả món
            console.log('   ⚠️ Không thấy cấu trúc nhóm chuẩn. Chuyển sang quét món lẻ (Deep Scan)...');
            const allDishLists = findDishesFallback(shopeeData);
            
            if (allDishLists.length > 0) {
                const allItems = [];
                allDishLists.forEach(list => {
                    list.forEach(dish => {
                        let dishImg = "";
                        if (dish.photos && dish.photos.length > 0) dishImg = dish.photos[0].value;
                        let price = dish.price && dish.price.value ? dish.price.value : Number(dish.market_price || 0);
                        
                        allItems.push({ name: dish.name, price, description: dish.description || "", image: dishImg });
                    });
                });
                // Lọc trùng
                const uniqueItems = [...new Map(allItems.map(item => [item['name'], item])).values()];
                finalCategories.push({ name: "Thực Đơn", items: uniqueItems });
            }
        }

        if (finalCategories.length === 0) {
            console.log('❌ Không tìm thấy món ăn nào. Kiểm tra lại JSON đầu vào.');
            return;
        }

        // Tạo object quán
        const shopObj = {
            name: CUSTOM_NAME,
            address: CUSTOM_ADDRESS,
            image: DEFAULT_IMAGE,
            categories: finalCategories
        };

        // Lưu file
        let currentData = [];
        if (fs.existsSync(OUTPUT_FILE)) {
            try {
                const fileContent = fs.readFileSync(OUTPUT_FILE, 'utf-8');
                if (fileContent.trim()) currentData = JSON.parse(fileContent);
            } catch (e) {}
        }

        currentData = currentData.filter(s => s.name !== shopObj.name);
        currentData.push(shopObj);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(currentData, null, 2));

        console.log(`🎉 THÀNH CÔNG! Đã lưu "${CUSTOM_NAME}" với ${finalCategories.length} nhóm món.`);
        console.log(`   (Nhóm đầu tiên: ${finalCategories[0].name} - ${finalCategories[0].items.length} món)`);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    }
}

main();