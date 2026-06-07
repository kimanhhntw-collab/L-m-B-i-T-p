# Sử dụng Node.js image chính thức
FROM node:18-alpine

# Đặt thư mục làm việc trong container
WORKDIR /app

# Sao chép file package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Sao chép toàn bộ code
COPY . .

# Expose port 3000
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Chạy server
CMD ["node", "server.js"]
