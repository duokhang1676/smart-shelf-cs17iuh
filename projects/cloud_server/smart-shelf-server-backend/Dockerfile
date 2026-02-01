FROM node:20-alpine
WORKDIR /app
# Cài curl
RUN apk add --no-cache curl
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]