#!/bin/bash
# Backup uploads và database từ container ra host
WEB_CONTAINER=iot-backend
BACKUP_DIR=./IOT_challenge_BE/public/

# Đọc biến môi trường từ file .env
source .env

sudo mkdir -p $BACKUP_DIR

# 1. Backup uploads folder từ container ra host
# (uploads phải nằm trong /app/uploads trong container)
sudo docker cp $WEB_CONTAINER:/app/public/uploads $BACKUP_DIR/uploads

echo "Backup xong! Kiểm tra thư mục $BACKUP_DIR để lấy file về local."
