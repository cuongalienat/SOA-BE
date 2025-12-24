
# Sử dụng Node.js LTS version (Alpine cho nhẹ)
FROM node:20-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package.json và package-lock.json trước để tận dụng Docker cache
COPY package*.json ./

# Cài đặt dependencies (chỉ production nếu build cho prod, ở đây cài hết để tiện)
RUN npm install

# Copy toàn bộ source code vào image
COPY . .

# Expose port (Mặc định 8017 như trong code cũ, có thể override bằng biến môi trường)
EXPOSE 8017

# Lệnh khởi chạy ứng dụng
CMD ["npm", "start"]
