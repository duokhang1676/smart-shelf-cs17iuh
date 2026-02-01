# 🔐 API Sepay Configuration

## 📋 Base URL
```
/api/sepay-config
```

---

## 🎯 API Endpoints

### 1. **GET - Lấy config chung**
```http
GET /api/sepay-config
```

**Response:**
```json
{
  "_id": "676f7aa88596b623f20bfed5",
  "vietqrAccountNo": "20356972399",
  "vietqrAccountName": "VO DUONG KHANG",
  "vietqrAcqId": "970423",
  "sepayAuthToken": "7JZ4VS6VHX6TTEGLAO4ZTLWEK3CRIMWMZQBYP3AGQ0NPEP7G1U1DV0OHLQXIBF2V",
  "sepayBankAccountId": "6987",
  "sandbox": true,
  "active": true,
  "createdAt": "2026-01-24T10:00:00.000Z",
  "updatedAt": "2026-01-24T15:30:00.000Z",
  "lastUpdated": "2026-01-24T15:30:00.000Z"
}
```

> **Lưu ý:** `sepayAuthToken` tự động được **decrypt** khi trả về

---

### 2. **GET - Lấy config theo Shelf ID**
```http
GET /api/sepay-config/shelf/:shelfId
```

**Example:**
```bash
GET /api/sepay-config/shelf/676f7aa88596b623f20bfed5
```

---

### 3. **PUT - Tạo/Cập nhật config chung**
```http
PUT /api/sepay-config
Content-Type: application/json
```

**Body:**
```json
{
  "vietqrAccountNo": "20356972399",
  "vietqrAccountName": "VO DUONG KHANG",
  "vietqrAcqId": "970423",
  "sepayAuthToken": "7JZ4VS6VHX6TTEGLAO4ZTLWEK3CRIMWMZQBYP3AGQ0NPEP7G1U1DV0OHLQXIBF2V",
  "sepayBankAccountId": "6987",
  "sandbox": false,
  "active": true
}
```

> **Tự động encrypt:** `sepayAuthToken` sẽ được **mã hóa** trước khi lưu vào DB

**Response:**
```json
{
  "_id": "676f7aa88596b623f20bfed5",
  "vietqrAccountNo": "20356972399",
  "vietqrAccountName": "VO DUONG KHANG",
  "vietqrAcqId": "970423",
  "sepayAuthToken": "7JZ4VS6VHX6TTEGLAO4ZTLWEK3CRIMWMZQBYP3AGQ0NPEP7G1U1DV0OHLQXIBF2V",
  "sepayBankAccountId": "6987",
  "sandbox": false,
  "active": true,
  "createdAt": "2026-01-24T10:00:00.000Z",
  "updatedAt": "2026-01-24T15:45:00.000Z"
}
```

---

### 4. **PUT/POST - Tạo/Cập nhật config theo Shelf**
```http
PUT /api/sepay-config/shelf/:shelfId
POST /api/sepay-config/shelf/:shelfId
Content-Type: application/json
```

**Example:**
```bash
PUT /api/sepay-config/shelf/676f7aa88596b623f20bfed5
```

**Body:**
```json
{
  "vietqrAccountNo": "20356972399",
  "vietqrAccountName": "VO DUONG KHANG",
  "vietqrAcqId": "970423",
  "sepayAuthToken": "7JZ4VS6VHX6TTEGLAO4ZTLWEK3CRIMWMZQBYP3AGQ0NPEP7G1U1DV0OHLQXIBF2V",
  "sepayBankAccountId": "6987"
}
```

---

### 5. **DELETE - Xóa config theo ID**
```http
DELETE /api/sepay-config/:id
```

**Response:**
```json
{
  "message": "Sepay config deleted successfully",
  "data": { ... }
}
```

---

### 6. **DELETE - Xóa config theo Shelf ID**
```http
DELETE /api/sepay-config/shelf/:shelfId
```

---

## 📊 Schema Fields

| Field | Type | Required | Encrypted | Mô tả |
|-------|------|----------|-----------|-------|
| `vietqrAccountNo` | String | ✅ | ❌ | Số tài khoản VietQR |
| `vietqrAccountName` | String | ✅ | ❌ | Tên tài khoản |
| `vietqrAcqId` | String | ✅ | ❌ | Mã ngân hàng (BIN) |
| `sepayAuthToken` | String | ✅ | ✅ | Token xác thực Sepay |
| `sepayBankAccountId` | String | ✅ | ❌ | ID tài khoản ngân hàng |
| `shelf_id` | ObjectId | ❌ | ❌ | ID kệ hàng (tùy chọn) |
| `sandbox` | Boolean | ❌ | ❌ | Môi trường test (default: true) |
| `active` | Boolean | ❌ | ❌ | Trạng thái (default: true) |
| `createdAt` | Date | Auto | ❌ | Ngày tạo |
| `updatedAt` | Date | Auto | ❌ | Ngày cập nhật gần nhất |

### Legacy Fields (Backward compatibility):
- `apiKey`, `apiSecret`, `merchantCode`, `webhookUrl`, `callbackUrl`

---

## 🔐 Encryption Details

### Cơ chế mã hóa:
- **Algorithm:** AES-256-CBC
- **Key:** Lấy từ `process.env.SEPAY_ENCRYPTION_KEY`
- **Auto-encrypt:** Khi lưu `sepayAuthToken` vào DB
- **Auto-decrypt:** Khi đọc `sepayAuthToken` từ DB

### Trong Database:
```javascript
// Token gốc
"7JZ4VS6VHX6TTEGLAO4ZTLWEK3CRIMWMZQBYP3AGQ0NPEP7G1U1DV0OHLQXIBF2V"

// Lưu trong DB (encrypted)
"a1b2c3d4e5f6...encrypted_data....:iv_hex_string"

// API trả về (decrypted)
"7JZ4VS6VHX6TTEGLAO4ZTLWEK3CRIMWMZQBYP3AGQ0NPEP7G1U1DV0OHLQXIBF2V"
```

---

## 🧪 Test với Postman/cURL

### Tạo config mới:
```bash
curl -X PUT http://localhost:3000/api/sepay-config \
  -H "Content-Type: application/json" \
  -d '{
    "vietqrAccountNo": "20356972399",
    "vietqrAccountName": "VO DUONG KHANG",
    "vietqrAcqId": "970423",
    "sepayAuthToken": "7JZ4VS6VHX6TTEGLAO4ZTLWEK3CRIMWMZQBYP3AGQ0NPEP7G1U1DV0OHLQXIBF2V",
    "sepayBankAccountId": "6987",
    "sandbox": true,
    "active": true
  }'
```

### Lấy config:
```bash
curl http://localhost:3000/api/sepay-config
```

### Tạo config cho shelf cụ thể:
```bash
curl -X POST http://localhost:3000/api/sepay-config/shelf/676f7aa88596b623f20bfed5 \
  -H "Content-Type: application/json" \
  -d '{
    "vietqrAccountNo": "20356972399",
    "vietqrAccountName": "VO DUONG KHANG",
    "vietqrAcqId": "970423",
    "sepayAuthToken": "7JZ4VS6VHX6TTEGLAO4ZTLWEK3CRIMWMZQBYP3AGQ0NPEP7G1U1DV0OHLQXIBF2V",
    "sepayBankAccountId": "6987"
  }'
```

---

## ⚙️ Environment Setup

Thêm vào `.env`:
```bash
SEPAY_ENCRYPTION_KEY=your-32-char-secret-key-here!!
```

> ⚠️ **Quan trọng:** Key phải có ít nhất 32 ký tự để đảm bảo AES-256 hoạt động đúng!

---

## 🔒 Security Best Practices

1. ✅ Token được mã hóa trong database
2. ✅ Chỉ decrypt khi cần (API response)
3. ✅ Encryption key lưu trong .env
4. ✅ Timestamps tự động (createdAt, updatedAt)
5. ⚠️ **Không log token ra console**
6. ⚠️ **Đổi SEPAY_ENCRYPTION_KEY trước khi deploy production**

---

## 📝 Notes

- `updatedAt` tự động cập nhật mỗi khi config thay đổi
- `lastUpdated` là virtual field, giống với `updatedAt`
- Token được encrypt/decrypt tự động bởi Mongoose getters/setters
- Hỗ trợ backward compatibility với các field cũ (apiKey, apiSecret, etc.)
