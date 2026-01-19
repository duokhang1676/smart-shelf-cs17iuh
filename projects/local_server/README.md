# Smart Vending Shelf System 

IoT Challenge 2025 - Smart self-service retail system with real-time monitoring, voice commands, and automated payment processing.

## Key Features

### Core Functionality
- **Real-time WebSocket** communication for instant cart sync
- **BLE Loadcell Integration** (15-slot system) with error handling (255, 200, 222)
- **Voice Command System** via XG26 sensor (combo, payment, cart navigation)
- **RFID Employee Authentication** with navigation lock during adding process
- **VietQR + SEPAY Payment** integration with auto-verification
- **Advanced Error Handling** with position validation and safety checks

### Voice Commands
| Command | Action | Description |
|---------|--------|-------------|
| `"combo"`, `"giảm giá"` | → Combo Page | Navigate to discount products |
| `"thanh toán"`, `"payment"` | → Payment Flow | Validate cart + process payment |
| `"giỏ hàng"`, `"cart"` | → Cart Page | Navigate to shopping cart |

## Requirements

- **Python 3.8+** with pip
- **BLE 4.0+ adapter** for loadcell communication
- **BGM220 loadcell devices** (up to 15 units)
- **Network connection** for payment APIs

## Quick Setup

### 1. Install Dependencies
```bash
cd projects/local_server
pip install -r requirements.txt
```

### 2. Environment Configuration
Create `.env` file:
```env
# BLE Configuration
BGM220_LOADCELL_1_ADDRESS=XX:XX:XX:XX:XX:XX
LOADCELL_UUID=your_service_uuid
CHAR_UUID_WRITE_WEIGHT=your_weight_uuid

# Payment APIs
VIETQR_CLIENT_ID=your_client_id
SEPAY_AUTH_TOKEN=your_token
```

### 3. Run Application
```bash
# Development
python main.py

# Production
gunicorn -w 1 --threads 100 --worker-class eventlet -b 0.0.0.0:5000 main:app
```

Access: `http://localhost:5000`

## Project Structure

```
local_server/
├── main.py                     # Flask app entry point
├── requirements.txt            # Dependencies
├── .env                       # Environment config
│
├── app/
│   ├── modules/               # Core modules
│   │   ├── voice_command_monitor.py  # Voice command processing
│   │   ├── globals.py                # Global state management
│   │   ├── update_loadcell_quantity.py # BLE communication
│   │   └── rfid_state_monitor.py     # RFID + navigation lock
│   │
│   ├── routes/                # Flask routes
│   │   ├── main_routes.py     # Page routes (/, /cart, /shelf)
│   │   ├── api_routes.py      # API endpoints
│   │   ├── payment_routes.py  # Payment processing
│   │   └── websocket_routes.py # WebSocket events
│   │
│   ├── templates/             # HTML templates
│   │   ├── cart.html          # Shopping cart page
│   │   ├── qr.html            # Payment QR page
│   │   └── shelf.html         # Shelf management
│   │
│   └── static/                # CSS, JS, images
│       ├── js/cart.js         # Cart functionality
│       └── css/cart.css       # Styling
│
└── database/                  # JSON data storage
    ├── products.json          # Product catalog
    ├── employees.json         # Employee RFID codes
    └── orders.json            # Order records
```

## Key API Endpoints

### Products & Cart
- `GET /api/products` - Get all products
- `GET /api/loadcell-data` - Current loadcell readings
- `POST /api/orders` - Create new order

### Voice & RFID
- `POST /api/added-product` - Employee completion signal
- `GET /api/rfid-state` - Check adding state

### WebSocket Events
- `loadcell_update` - Real-time cart updates
- `create_order_and_redirect` - Voice payment trigger
- `employee_adding_max_quantity` - RFID navigation lock
- `empty_cart_notification` - Voice empty cart warning

## System Workflow

### Voice Payment Flow
1. **Voice Command** "thanh toán" detected by XG26
2. **Backend Validation** checks `taken_quantity` from loadcell
3. **Error Check** validates position errors (200, 222)
4. **Payment Processing** auto-prints invoice + generates QR
5. **Success/Failure** redirect with order tracking

### Employee Adding Flow
1. **RFID Scan** employee card detected
2. **Navigation Lock** prevents customer navigation
3. **Shelf Redirect** automatic redirect to `/shelf`
4. **Adding Process** employee adds products
5. **Completion** click "Hoàn tất thêm hàng"
6. **State Reset** unlock navigation + auto refresh

## Development Testing

### Hardware Testing
- Press `'s'` in terminal → send test weight data
- Press `'enter'` → toggle RFID state
- Access `/api/debug` → system diagnostics

### API Testing
```bash
# System health
curl http://localhost:5000/api/debug | jq .

# Loadcell status
curl http://localhost:5000/api/loadcell-data | jq .
```

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `255` | Loadcell sensor error | Set quantity = 0, show error |
| `200` | Product position error | Block payment, show warning |
| `222` | Placement error | Block payment, show warning |

## Safety Features

- **Dual Validation** for voice payments (backend + frontend)
- **Error Prevention** mandatory position check before payment
- **Navigation Lock** during employee operations
- **No Duplicate Notifications** smart message management
- **Auto Recovery** error resolution monitoring

## Deployment

### Production Setup
```bash
# Install production server
pip install gunicorn

# Run with optimized settings
gunicorn -w 1 --threads 100 --worker-class eventlet -b 0.0.0.0:5000 main:app
```

### Environment Variables
```env
DEBUG_MODE=False
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
LOG_LEVEL=INFO
```

**IoT Challenge 2025** | Team CS17IUH | Smart Retail Innovation
