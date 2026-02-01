# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json và package-lock.json
COPY package*.json ./

# Làm sạch cache và cài đặt dependencies
RUN npm cache clean --force && npm install
RUN npm install rollup --save-dev

# Copy mã nguồn và tệp .env.production
COPY . .
COPY .env.production ./

# Build ứng dụng với chế độ production
RUN npm run build -- --mode production

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]