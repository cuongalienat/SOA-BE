import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'raw_shopee.json');
const OUTPUT_FILE = path.join(__dirname, 'data_full.json');

// --- LẤY THAM SỐ TỪ DÒNG LỆNH ---
// Cách dùng: node src/convert_tool.js "Tên Quán" "Địa chỉ"
const args = process.argv.slice(2);
const CUSTOM_NAME = args[0] || "Unknown Shop"; 
const CUSTOM_ADDRESS = args[1] || "TP. Hồ Chí Minh";
const DEFAULT_IMG = "https://images.foody.vn/res/g103/1029147/prof/s640x400/foody-upload-api-foody-mobile-7-11-200521142928.jpg";

// Hàm đệ quy tìm món ăn (Deep Scan)
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
        Object.keys(obj).forEach(key => {
            findDishesArray(obj[key], foundLists);
        });
    }
    return foundLists;
}

async function main() {
    try {
        if (!fs.existsSync(INPUT_FILE)) {
            console.error("❌ Không tìm thấy file raw_shopee.json");
            return;
        }

        const rawContent = fs.readFileSync(INPUT_FILE, 'utf-8');
        const shopeeData = JSON.parse(rawContent);

        console.log(`🔎 Đang xử lý cho quán: "${CUSTOM_NAME}"`);

        // Quét tìm menu
        const allDishLists = findDishesArray(shopeeData);
        let categories = [];

        if (allDishLists.length > 0) {
            // Logic: Nếu JSON có phân nhóm (Mixue/Phúc Long) -> Giữ nguyên
            if (shopeeData.reply && shopeeData.reply.menu_infos) {
                 shopeeData.reply.menu_infos.forEach(grp => {
                     const items = grp.dishes.map(d => ({
                         name: d.name,
                         price: d.price.value,
                         description: d.description || "",
                         imageUrl: (d.photos && d.photos.length > 0) ? d.photos[0].value : DEFAULT_IMG,
                         isAvailable: true
                     }));
                     categories.push({ name: grp.dish_type_name, items });
                 });
            } else if (shopeeData.reply && shopeeData.reply.dish_type_infos) {
                 // Logic cho API mobile
                 shopeeData.reply.dish_type_infos.forEach(grp => {
                     const items = grp.dishes.map(d => ({
                         name: d.name,
                         price: d.price.value,
                         description: d.description || "",
                         imageUrl: (d.photos && d.photos.length > 0) ? d.photos[0].value : DEFAULT_IMG,
                         isAvailable: true
                     }));
                     categories.push({ name: grp.dish_type_name, items });
                 });
            }
            
            // Nếu logic trên không bắt được (7-Eleven hoặc JSON lạ), dùng Deep Scan gộp tất cả
            if (categories.length === 0) {
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
                            imageUrl: img,
                            isAvailable: true
                        });
                    });
                });
                // Lọc trùng tên món
                const uniqueItems = [...new Map(allItems.map(item => [item['name'], item])).values()];
                categories.push({ name: "Thực Đơn", items: uniqueItems });
            }
        } else {
            console.log('❌ Lỗi: JSON này không chứa món ăn nào. Bạn copy nhầm file info rồi!');
            return;
        }

        // Tạo object quán
        const shopObj = {
            name: CUSTOM_NAME,
            address: CUSTOM_ADDRESS,
            image: DEFAULT_IMG, // (Bạn có thể sửa tay link ảnh sau nếu muốn đẹp)
            categories: categories
        };

        // Đọc data cũ
        let currentData = [];
        if (fs.existsSync(OUTPUT_FILE)) {
            try {
                const fileContent = fs.readFileSync(OUTPUT_FILE, 'utf-8');
                if (fileContent.trim()) currentData = JSON.parse(fileContent);
            } catch (e) {}
        }

        // Cập nhật hoặc Thêm mới
        const index = currentData.findIndex(s => s.name === shopObj.name);
        if (index !== -1) {
            currentData[index] = shopObj; // Ghi đè
            console.log(`🔄 Đã cập nhật lại quán: ${CUSTOM_NAME}`);
        } else {
            currentData.push(shopObj); // Thêm mới
            console.log(`✅ Đã thêm mới quán: ${CUSTOM_NAME}`);
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(currentData, null, 2));
        console.log(`📊 Tổng số quán trong kho: ${currentData.length}`);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    }
}

main();