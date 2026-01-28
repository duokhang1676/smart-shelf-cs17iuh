/*
* Copyright 2025 Tran Vu Thuy Trang [C]
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
// Cart JavaScript functionality
let cart = [];
let allProducts = [];
let loadcellIntervalId = null;
let rfidInput = '';  // Store RFID input
let rfidTimeout = null;  // Timeout for RFID input reset
let webSocketOverride = false; // Flag to control WebSocket override
let socket = null; // WebSocket connection
let webSocketOverrideTimeout = null; // Timeout to reset override flag
let lastConnectionTime = Date.now();
let reconnectAttempts = 0;
let reconnectInterval = null;
let connectionTimeout = null;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimer = null;

// Auto redirect to slideshow variables
let emptyCartTimer = null;
let emptyCartStartTime = null;
const EMPTY_CART_TIMEOUT = 10000; // 10 seconds

// Update connection status UI - now uses notifications only
function updateConnectionStatus(status, message) {
    // Always hide the status bar - we use notifications instead
    const statusBar = document.getElementById('connectionStatusBar');
    if (statusBar) {
        statusBar.style.display = 'none';
    }
    
    // Show notification based on status
    if (status === 'connected') {
        console.log('Kết nối thành công:', message || 'Đã kết nối thành công');
    } else if (status === 'connecting') {
        console.log('Đang kết nối:', message || 'Đang kết nối...');
    } else if (status === 'error') {
        console.log('Lỗi kết nối:', message || 'Có lỗi kết nối xảy ra');
    }
}

// Connection status management
function originalUpdateConnectionStatus(status, message) {
    const statusDiv = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-text');
    
    if (!statusDiv || !statusText) return;
    
    statusDiv.className = `connection-status ${status}`;
    statusText.textContent = message;
    
    // Auto-hide success messages
    if (status === 'connected') {
        setTimeout(() => {
            if (statusDiv.classList.contains('connected')) {
                statusDiv.style.display = 'none';
            }
        }, 3000);
    } else {
        statusDiv.style.display = 'block';
    }
}

// Simple console logging instead of notifications
function showNotification(type, title, message, options = {}) {
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
}

function hideNotification(notification) {
    // Do nothing - no notifications to hide
}

function resetReconnectAttempts() {
    reconnectAttempts = 0;
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }
    if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
    }
}

function startReconnectTimer() {
    if (reconnectInterval) return; // Don't start multiple timers
    
    // Log initial reconnecting message
    console.log('Mất kết nối - Đang kết nối lại với loadcell...');
    
    reconnectInterval = setInterval(() => {
        reconnectAttempts++;
        console.log(`Thử lại lần thứ ${reconnectAttempts}`);
        
        // Try to reconnect socket if disconnected
        if (!socket.connected) {
            socket.connect();
        }
        
        // Auto-stop after 30 seconds of trying
        if (reconnectAttempts >= 10) {
            console.log('Dừng thử kết nối lại sau 10 lần thử');
            resetReconnectAttempts();
        }
    }, 3000); // Try every 3 seconds
}

// Auto redirect to slideshow functions
function startEmptyCartTimer() {
    if (emptyCartTimer) return; // Don't start multiple timers
    
    emptyCartStartTime = Date.now();
    console.log('Starting empty cart timer - will redirect to slideshow in 10 seconds');
    
    emptyCartTimer = setTimeout(() => {
        console.log('Cart has been empty for 10 seconds, redirecting to slideshow...');
        window.location.href = '/';
    }, EMPTY_CART_TIMEOUT);
}

function stopEmptyCartTimer() {
    if (emptyCartTimer) {
        clearTimeout(emptyCartTimer);
        emptyCartTimer = null;
        emptyCartStartTime = null;
        console.log('Empty cart timer stopped - cart has items');
    }
}

function checkCartEmptyStatus() {
    const hasItems = cart && cart.length > 0;
    
    if (hasItems) {
        stopEmptyCartTimer();
    } else {
        startEmptyCartTimer();
    }
}

// WebSocket initialization
function initWebSocket() {
    // Use existing socket or create new one
    if (window.NavigationUtils && window.navigation && window.navigation.socket) {
        socket = window.navigation.socket;
        console.log('Cart: Using existing navigation socket');
    } else if (typeof io !== 'undefined') {
        socket = io();
        console.log('Cart: Created new socket connection');
    } else {
        console.log('Socket.IO not available');
        return;
    }
    
    // Notify server that we left slideshow page when entering cart page
    socket.emit('slideshow_page_leave');
    // Only setup connection handlers if we created a new socket
    if (socket && !window.navigation?.socket) {
        socket.on('connect', function() {
            console.log('WebSocket đã kết nối');
            resetReconnectAttempts();
            lastConnectionTime = Date.now();
        });
        
        socket.on('disconnect', function() {
            webSocketOverride = false; // Allow polling to take over
            console.log('WebSocket đã ngắt kết nối');
            startReconnectTimer();
        });
    }

    socket.on('loadcell_data', function(data) {

        lastConnectionTime = Date.now(); // Update connection time
        
        if (data.error) {
            console.error('Loadcell error:', data.error);
            return;
        }
        
        // Store current loadcell data for error checking
        currentLoadcellData = data.quantities || [];
        
        renderCartByLoadcell(data.quantities || [], data.error_codes || []);
        renderCart();
    });

    socket.on('loadcell_update', function(data) {
        console.log('WebSocket update received:', data);
        console.log('Loadcell data:', data.loadcell_data);
        console.log('Cart data:', data.cart);
                
        // Update connection status if we receive data
        lastConnectionTime = Date.now();
        
        // Store current loadcell data for error checking
        if (data.loadcell_data && Array.isArray(data.loadcell_data)) {
            currentLoadcellData = data.loadcell_data;
            
            // If we're monitoring for error resolution, check if errors are resolved
            if (loadcellErrorCheckInterval && window.loadcellErrorResolvedCallback) {
                const hasErrors = data.loadcell_data.some(value => value === 200 || value === 222);
                if (!hasErrors) {
                    console.log('Loadcell errors resolved via WebSocket update!');
                    // Clear monitoring since errors are resolved
                    if (loadcellErrorCheckInterval) {
                        clearInterval(loadcellErrorCheckInterval);
                        loadcellErrorCheckInterval = null;
                    }
                    if (window.loadcellErrorResolvedCallback) {
                        window.loadcellErrorResolvedCallback();
                        window.loadcellErrorResolvedCallback = null;
                    }
                }
            }
        }
        
        // Set WebSocket override flag
        webSocketOverride = true;
        
        // Clear any existing override timeout
        if (webSocketOverrideTimeout) {
            clearTimeout(webSocketOverrideTimeout);
        }
        
        // Maintain override for 5 seconds to prevent health check interference (reduced for faster response)
        webSocketOverrideTimeout = setTimeout(() => {
            webSocketOverride = false;
        }, 5000); // Reduced from 20000 to 5000ms
        
        // Always hide notification when receiving real data
        resetReconnectAttempts();
        
        if (data.loadcell_data && Array.isArray(data.loadcell_data)) {
            renderCartByLoadcell(data.loadcell_data, data.error_codes);
        }
    });
    
    // Listen for cart reset events
    socket.on('cart_reset', function(data) {
        console.log('Cart reset via WebSocket:', data);
        cart = [];
        renderCart();
    });
    
    // Listen for combo detection and redirect
    socket.on('redirect_to_combo', function(data) {
        console.log('Combo detection event received:', data);
        showNotification('info', 'Combo detected!', data.message || 'Redirecting to combo page...', {
            closeable: false,
            duration: 2000
        });
        
        window.location.href = data.url || '/combo';
    });

    // Listen for QR page redirect
    socket.on('redirect_to_qr', function(data) {
        console.log('QR page redirect event received:', data);
        showNotification('info', 'QR Page!', data.message || 'Redirecting to QR page...', {
            closeable: false,
            duration: 2000
        });
        
        // Only redirect if we have a proper URL with orderId
        if (data.url && data.url.includes('orderId=')) {
            window.location.href = data.url;
        } else {
            console.error('Invalid QR redirect URL:', data.url);
            showNotification('error', 'Lỗi', 'Không thể chuyển đến trang QR. Vui lòng thử lại.', {
                closeable: true,
                duration: 5000
            });
        }
    });

    // Voice command: redirect to main/slideshow page
    socket.on('redirect_to_main', function(data) {
        console.log('Voice command: redirect to main page');
        showNotification('info', 'Quay lại', data.message || 'Đang chuyển về trang chính...', {
            closeable: false,
            duration: 2000
        });
        window.location.href = data.url || '/';
    });

    // Voice command: empty cart notification
    socket.on('empty_cart_notification', function(data) {
        console.log('Voice command: empty cart notification');
        showNotification('warning', 'Giỏ hàng trống', data.message || 'Vui lòng chọn sản phẩm trước khi thanh toán.', {
            closeable: true,
            duration: 4000
        });
    });

    // Voice command: create order and redirect to payment
    socket.on('create_order_and_redirect', function(data) {
        console.log('Voice command: create order and redirect to payment');
        
        // Check for loadcell position errors before proceeding (same as manual payment)
        checkLoadcellPositionErrors(() => {
            proceedPayment(true); // Automatically set print bill to true
        });
    });

    socket.on('order_failed', function(data) {
        console.log('Order failed:', data);
        showNotification('error', 'Đặt hàng thất bại', 
            data.message || 'Có lỗi xảy ra khi xử lý đơn hàng.', {
            closeable: true
        });
    });

    socket.on('cart_updated', function(data) {
        console.log('Cart updated:', data);
        if (data.products) {
            cart = data.products;
            renderCart();
        }
    });

    socket.on('product_updated', function(data) {
        console.log('Product updated:', data);
        // Update product in allProducts array
        const productIndex = allProducts.findIndex(p => 
            (p.product_id || p.productId) === (data.product_id || data.productId)
        );
        if (productIndex !== -1) {
            allProducts[productIndex] = { ...allProducts[productIndex], ...data };
            renderCart();
        }
    });

    // Promotional notifications
    socket.on('promotion_applied', function(data) {
        console.log('Promotion applied:', data);
        showNotification('success', 'Khuyến mãi áp dụng!', 
            data.message || 'Khuyến mãi đã được áp dụng cho đơn hàng.', {
            closeable: false,
            duration: 2000
        });
    });

    socket.on('combo_detected', function(data) {
        console.log('Combo detected:', data);
        showNotification('info', 'Combo phát hiện!', 
            data.message || 'Hệ thống đã phát hiện combo và áp dụng giá ưu đãi.', {
            closeable: false,
            duration: 2000
        });
    });

    // Listen for RFID events from hardware backend listener
    socket.on('employee_adding_max_quantity', function(data) {
        console.log('RFID detected: employee adding max_quantity, redirecting to shelf page');
        
        // Lock navigation briefly before redirect
        lockNavigation();
        
        window.location.href = data.url || '/shelf';
    });

    socket.on('max_quantity_added_notification', function(data) {
        console.log('Max quantity added notification:', data);
        
        // Unlock navigation when max_quantity added successfully
        unlockNavigation();
        
        showNotification('success', 'Thành công', 
            data.message || 'Đã cập nhật số lượng sản phẩm.', {
            closeable: true,
            duration: 2000
        });
        
        // Reload cart page to show updated product quantities
        console.log('Reloading cart page to show updated quantities...');
        setTimeout(() => {
            window.location.reload();
        }, 2000); // Wait 2 seconds to show success message before reload
    });

    // Error handling
    socket.on('error', function(error) {
        console.error('WebSocket error:', error);
        updateConnectionStatus('error', 'Lỗi kết nối');
    });

    // Listen for loadcell connection status events from cart_old
    socket.on('loadcell_connected', function(data) {
        webSocketOverride = true; // WebSocket has control
        console.log('Kết nối thành công:', data.message || 'Loadcell đã kết nối!');
        resetReconnectAttempts();
        lastConnectionTime = Date.now();
    });
    
    socket.on('loadcell_connecting', function(data) {
        webSocketOverride = true; // WebSocket has control
        // Show connecting notification only if we have previous connection attempts
        if (reconnectAttempts > 0) {
            showNotification('warning', 'Đang kết nối', data.message || 'Đang kết nối loadcell...', {
                closeable: false
            });
        }
    });
    
    socket.on('loadcell_disconnected', function(data) {
        webSocketOverride = false; // Allow health check to take over
        showNotification('error', 'Mất kết nối', data.message || 'Loadcell đã ngắt kết nối', {
            closeable: false
        });
        startReconnectTimer();
    });
    
    socket.on('loadcell_error', function(data) {
        webSocketOverride = false; // Allow health check to take over
        showNotification('error', 'Lỗi loadcell', data.message || 'Có lỗi xảy ra với loadcell', {
            closeable: false
        });
        startReconnectTimer();
    });
    
    // Listen for combo detection and redirect
    socket.on('redirect_to_combo', function(data) {
        window.location.href = data.url || '/combo';
    });

    // Listen for QR page redirect
    socket.on('redirect_to_qr', function(data) {
        window.location.href = data.url || '/qr';
    });

    // Voice command: redirect to main/slideshow page
    socket.on('redirect_to_main', function(data) {
        window.location.href = data.url || '/';
    });
    
    // Listen for manual quantity update results
    socket.on('manual_quantity_result', function(data) {
        if (data.success) {
            showNotification('success', 'Cập nhật thành công', data.message || 'Số lượng đã được cập nhật.', {
                closeable: false,
                duration: 1500
            });
        } else {
            showNotification('error', 'Cập nhật thất bại', data.message || 'Không thể cập nhật số lượng.', {
                closeable: true
            });
        }
    });
    
    // Request initial cart update
    socket.emit('request_cart_update');
}

// RFID input handling - DEPRECATED
// RFID is now handled by hardware backend listener
function handleRFIDInput(event) {
    // This function is deprecated - RFID processing moved to hardware backend
    // Hardware listener (listen_rfid.py) + state monitor (rfid_state_monitor.py)
    // now handle RFID detection and emit WebSocket events
    console.log('RFID input via keyboard deprecated - using hardware listener');
}

// RFID event listener deprecated - using hardware backend listener
// document.addEventListener('keydown', handleRFIDInput);

// Initialize everything
fetch('/api/products')
    .then(res => res.json())
    .then(data => {
        if (!data || data.length === 0) {
            const productList = document.getElementById('product-list');
            const emptyMsg = document.getElementById('empty-msg');
            const totalRow = document.getElementById('total-row');
            if (productList) productList.style.display = 'none';
            if (emptyMsg) emptyMsg.style.display = 'block';
            if (totalRow) totalRow.style.display = 'none';
            return;
        }
        allProducts = data;
        
        // Use real quantities from loaded products instead of hardcoded test
        const realQuantities = allProducts.map(p => p.qty || 0);
        
        renderCartByLoadcell(realQuantities, []); // Use actual quantities from products
        
        // Initialize WebSocket for real-time updates
        initWebSocket();
        
        // Fetch initial loadcell data for error checking
        fetchInitialLoadcellData();
        
        // Note: No more backup polling - rely fully on WebSocket
        console.log('Cart initialized with WebSocket-only updates');
    })
    .catch(error => {
        console.error('Error fetching products:', error);
    });

/**
 * Fetch initial loadcell data to populate currentLoadcellData
 */
function fetchInitialLoadcellData() {
    fetch('/api/loadcell-data')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.raw_loadcell_data) {
                currentLoadcellData = data.raw_loadcell_data;
                console.log('Initial loadcell data fetched:', currentLoadcellData);
            }
        })
        .catch(error => {
            console.warn('Could not fetch initial loadcell data:', error);
        });
}
function addProductToCart(product) {
    const found = cart.find(p => (p.product_id || p.productId) === (product.product_id || product.productId));
    if (found) {
        found.qty += 1;
    } else {
        cart.push({...product, qty: 1});
    }
    renderCart();
}

function renderCart() {
    const productsList = document.getElementById('cart-products-list');
    const emptyMsg = document.getElementById('empty-msg');
    const promoSection = document.getElementById('promo-section');
    const totalRow = document.getElementById('total-row');
    const orderSummary = document.querySelector('.order-summary');
    
    if (productsList) productsList.innerHTML = '';
    let total = 0;
    let originalSubtotal = 0; // Giá gốc chưa tính khuyến mãi
    let totalSavings = 0; // Tổng tiền tiết kiệm
    
    if (cart.length === 0) {
        if (productsList) productsList.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (promoSection) promoSection.style.display = 'none';
        if (totalRow) totalRow.style.display = 'none';
        
        // Update order summary with empty cart (reset to 0)
        updateOrderSummary([]);
        
        // Update navigation badge with 0 items
        if (window.NavigationUtils && navigation) {
            try {
                navigation.showBadge('/cart', 0);
            } catch (e) {
                console.warn('Navigation badge update failed:', e);
            }
        }
        
        // Check if cart is empty and start/stop timer
        checkCartEmptyStatus();
        return;
    }
    
    if (productsList) productsList.style.display = 'flex';
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (promoSection) promoSection.style.display = 'block';
    if (totalRow) totalRow.style.display = 'flex';
    if (orderSummary) orderSummary.style.display = 'block';
    
    cart.forEach((p, idx) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        let originalTotal, displayTotal, savings = 0;
        
        // Handle different pricing scenarios
        if (p.promotion_type === 'buy_x_get_y') {
            const boughtQty = p.original_qty || 0;
            const freeQty = p.free_qty || 0;
            const originalPrice = p.original_price || p.price;
            
            originalTotal = originalPrice * p.qty;
            if (freeQty > 0) {
                displayTotal = originalPrice * boughtQty;
                savings = originalPrice * freeQty;
            } else {
                displayTotal = originalPrice * boughtQty;
                savings = 0;
            }
        } else if (p.in_combo) {
            const originalPrice = p.original_price || p.price;
            originalTotal = originalPrice * p.qty;
            displayTotal = p.price * p.qty;
            savings = (originalPrice - p.price) * p.qty;
        } else {
            originalTotal = displayTotal = p.price * p.qty;
            savings = 0;
        }
        
        total += displayTotal;
        originalSubtotal += originalTotal;
        totalSavings += savings;
        
        // Product image
        const img = document.createElement('img');
        img.className = 'product-image';
        img.src = p.img_url || p.imgUrl || '/static/img/no-image.jpg';
        img.alt = p.product_name || 'Product';
        img.onerror = () => { img.src = '/static/img/no-image.jpg'; };
        
        // Product details section
        const details = document.createElement('div');
        details.className = 'product-details';
        
        const name = document.createElement('div');
        name.className = 'product-name';
        name.textContent = p.product_name || p.productName || '';
        
        const attributes = document.createElement('div');
        attributes.className = 'product-attributes';
        
        // Add price display (with discount support like shelf page)
        const priceDiv = document.createElement('div');
        priceDiv.className = 'product-price';
        
        // Check if product has discount or combo pricing
        if (p.in_combo && p.original_price && p.original_price > p.price) {
            // Combo pricing: show original price (crossed) and discounted price
            priceDiv.innerHTML = `
                <span class="original-price">${formatMoney(p.original_price)}₫</span>
                <span class="discounted-price">${formatMoney(p.price)}₫</span>
            `;
        } else if (p.original_price && p.original_price > p.price) {
            // Regular discount: show original price (crossed) and discounted price
            priceDiv.innerHTML = `
                <span class="original-price">${formatMoney(p.original_price)}₫</span>
                <span class="discounted-price">${formatMoney(p.price)}₫</span>
            `;
        } else {
            // No discount: show regular price
            priceDiv.textContent = `${formatMoney(p.price)}₫`;
        }
        
        attributes.appendChild(priceDiv);
        
        const quantity = document.createElement('div');
        quantity.className = 'product-quantity';
        if (p.promotion_type === 'buy_x_get_y' && p.free_qty > 0) {
            quantity.innerHTML = `${p.original_qty} + ${p.free_qty}`; /* compact display in pill */
        } else {
            quantity.innerHTML = `${p.qty}`;
        }
        
        // Combo badge
        if (p.in_combo) {
            const badge = document.createElement('div');
            badge.className = 'combo-badge';
            badge.textContent = 'COMBO';
            details.appendChild(badge);
        }
        
    details.appendChild(name);
    details.appendChild(attributes);
        
    // Assemble card (three-part: left image, center details, right qty)
    card.appendChild(img);
    card.appendChild(details);
    card.appendChild(quantity);
        
        productsList.appendChild(card);
    });
    
    updateOrderSummary(cart);
    
    // Update navigation badge with cart item count
    const totalItems = cart.reduce((sum, p) => sum + p.qty, 0);
    if (window.NavigationUtils && navigation) {
        try {
            navigation.showBadge('/cart', totalItems);
        } catch (e) {
            console.warn('Navigation badge update failed:', e);
        }
    }
    
    // Check if cart is empty and start/stop timer
    checkCartEmptyStatus();
}

function updateOrderSummary(cartItems) {
    console.log('DEBUG updateOrderSummary:', cartItems);
    
    const subtotalSpan = document.querySelector('#subtotal-amount');
    const discountSpan = document.querySelector('#discount-row .amount');
    const totalAmountSpan = document.querySelector('#total-row .total-amount');
    
    let subtotal = 0; // Tổng giá gốc
    let totalDiscount = 0; // Tổng giảm giá
    
    cartItems.forEach(item => {
        // Tạm tính dựa trên giá gốc
        const originalPrice = item.original_price || item.price;
        const itemSubtotal = originalPrice * item.qty;
        subtotal += itemSubtotal;
        
        // Tính giảm giá từ combo
        if (item.original_price && item.original_price > item.price) {
            totalDiscount += (item.original_price - item.price) * item.qty;
        }
        
        // Tính giảm giá từ promotion buy_x_get_y
        if (item.promotion_type === 'buy_x_get_y' && item.free_qty > 0) {
            const freeValue = (item.original_price || item.price) * item.free_qty;
            totalDiscount += freeValue;
        }
    });
    
    const finalTotal = subtotal - totalDiscount;
    
    if (subtotalSpan) subtotalSpan.textContent = formatMoney(subtotal) + ' ₫';
    if (discountSpan) discountSpan.textContent = '-' + formatMoney(totalDiscount) + ' ₫';
    if (totalAmountSpan) totalAmountSpan.textContent = formatMoney(finalTotal) + ' ₫';
    
    // Show/hide discount row
    const discountRow = document.getElementById('discount-row');
    if (discountRow) {
        discountRow.style.display = totalDiscount > 0 ? 'flex' : 'none';
    }
}

function updateComboSavingsDisplay(products) {
    const comboSavingsDiv = document.getElementById('combo-savings');
    if (!comboSavingsDiv) return;
    
    let totalSavings = 0;
    let hasCombo = false;
    
    products.forEach(product => {
        if (product.in_combo && product.original_price) {
            const savings = (product.original_price - product.price) * product.qty;
            totalSavings += savings;
            hasCombo = true;
        }
    });
    
    if (hasCombo && totalSavings > 0) {
        comboSavingsDiv.innerHTML = `
            <div class="combo-savings-content">
                <span class="combo-icon">🎉</span>
                <span class="combo-text">Tiết kiệm combo: ${formatMoney(totalSavings)} ₫</span>
            </div>
        `;
        comboSavingsDiv.style.display = 'block';
    } else {
        comboSavingsDiv.style.display = 'none';
    }
}

function renderCartByLoadcell(loadcellArr, errorCodes = []) {
    const productsList = document.getElementById('cart-products-list');
    const emptyMsg = document.getElementById('empty-msg');
    const promoSection = document.getElementById('promo-section');
    const totalRow = document.getElementById('total-row');
    
    if (!productsList || !emptyMsg) {
        console.error('Required DOM elements not found!');
        return;
    }
    
    productsList.innerHTML = '';
    let total = 0;
    let hasProduct = false;
    cart = []; // reset cart according to loadcell
    
    // Handle both array format and object format from WebSocket
    let quantities = [];
    if (Array.isArray(loadcellArr)) {
        quantities = loadcellArr;
    } else if (loadcellArr && loadcellArr.cart) {
        // Handle cart format: [{position: 12, quantity: 1}]
        quantities = new Array(allProducts.length).fill(0);
        loadcellArr.cart.forEach(item => {
            // Convert 1-based position to 0-based index
            const index = (item.position || item.pos) - 1;
            if (index >= 0 && index < quantities.length) {
                quantities[index] = item.quantity || item.qty || 0;
            }
        });
    }
    
    allProducts.forEach((p, idx) => {
        const detectedQty = quantities[idx] || 0;
        
        // Check if this position has loadcell error (255) - define once for entire loop iteration
        const hasLoadcellError = errorCodes && errorCodes.some(error => 
            error.position === idx && error.code === 255
        );
        
        // Only show product if quantity > 0 (remove loadcell error condition)
        if (detectedQty > 0) {
            hasProduct = true;
            const productPrice = p.price || 0;
            
            // Use detected quantity only (no manual override for errors)
            let cartQty = detectedQty;
            const productTotal = productPrice * cartQty;
            total += productTotal;
            
            // Add to cart
            cart.push({
                ...p,
                qty: cartQty,
                loadcell_position: idx
            });
        }
    });
    
    // Update display
    if (!hasProduct) {
        if (productsList) productsList.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (promoSection) promoSection.style.display = 'none';
        if (totalRow) totalRow.style.display = 'none';
        
        // Update order summary with empty cart (reset to 0)
        updateOrderSummary([]);
        
        // Update navigation badge (empty cart)
        if (window.NavigationUtils && navigation) {
            navigation.showBadge('/cart', 0);
        }
        
        // Check if cart is empty and start/stop timer
        checkCartEmptyStatus();
    } else {
        if (productsList) productsList.style.display = 'flex';
        if (emptyMsg) emptyMsg.style.display = 'none';
        if (promoSection) promoSection.style.display = 'block';
        if (totalRow) totalRow.style.display = 'flex';
        
        updateGrandTotal();
        
        // Apply combo logic to cart
        if (cart.length > 0) {
            console.log('Applying combo logic to cart:', cart);
            
            // First render products immediately (fallback)
            renderCartWithComboDisplay(cart);
            
            // Then try to apply combo logic
            fetch('/api/cart/apply-combos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cart_items: cart })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Combo response:', data);
                if (data.cart_items) {
                    // Re-render with combo data
                    renderCartWithComboDisplay(data.cart_items);
                }
            })
            .catch(error => {
                console.error('Error applying combo:', error);
                // Fallback to original display with simple render
                renderCartWithComboDisplay(cart);
            });
        }
        
        // Update order summary and navigation badge with cart item count
        updateOrderSummary(cart);
        const totalItems = cart.reduce((sum, p) => sum + p.qty, 0);
        if (window.NavigationUtils && navigation) {
            navigation.showBadge('/cart', totalItems);
        }
    }
    
    // Display errors if any (only log, don't show notification)
    if (errorCodes.length > 0) {
        console.warn('Loadcell errors detected but hidden from user:', errorCodes);
    }
    
    // Check if cart is empty and start/stop timer
    checkCartEmptyStatus();
}

function renderCartWithComboDisplay(cartItems) {
    console.log('DEBUG renderCartWithComboDisplay:', cartItems);
    
    const productsList = document.getElementById('cart-products-list');
    const emptyMsg = document.getElementById('empty-msg');
    const promoSection = document.getElementById('promo-section');
    const totalRow = document.getElementById('total-row');
    const orderSummary = document.querySelector('.order-summary');
    
    productsList.innerHTML = '';
    
    if (cartItems.length === 0) {
        if (productsList) productsList.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (promoSection) promoSection.style.display = 'none';
        if (totalRow) totalRow.style.display = 'none';
        
        // Update order summary with empty cart (reset to 0)
        updateOrderSummary([]);
        updateComboSavingsDisplay([]);
        return;
    }
    
    if (productsList) productsList.style.display = 'flex';
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (promoSection) promoSection.style.display = 'block';
    if (totalRow) totalRow.style.display = 'flex';
    if (orderSummary) orderSummary.style.display = 'block';
    
    cartItems.forEach((p, idx) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Add combo styling if applicable
        if (p.in_combo) {
            card.classList.add('combo-item');
        }
        
        // Product image
        const img = document.createElement('img');
        img.className = 'product-image';
        img.src = p.img_url || p.imgUrl || '/static/img/no-image.jpg';
        img.alt = p.product_name || 'Product';
        img.onerror = () => { img.src = '/static/img/no-image.jpg'; };
        
        // Product details section
        const details = document.createElement('div');
        details.className = 'product-details';
        
        const name = document.createElement('div');
        name.className = 'product-name';
        name.textContent = p.product_name || p.productName || '';
        
        const quantity = document.createElement('div');
        quantity.className = 'product-quantity';
        quantity.innerHTML = `Số lượng: ${p.qty}`;
        
        // Add price display (always show original price)
        const priceDiv = document.createElement('div');
        priceDiv.className = 'product-price';
        const originalPrice = p.original_price || p.price;
        console.log('Product:', p.product_name, 'Original Price:', originalPrice, 'Current Price:', p.price);
        priceDiv.innerHTML = `${formatMoney(originalPrice)} ₫`;
        
        // Add combo badge
        if (p.in_combo) {
            const comboBadge = document.createElement('div');
            comboBadge.className = 'combo-badge';
            comboBadge.textContent = 'COMBO';
            details.appendChild(comboBadge);
        }
        
    details.appendChild(name);
        details.appendChild(priceDiv);
        
    // Assemble card (image, details, quantity pill)
    card.appendChild(img);
    card.appendChild(details);
    card.appendChild(quantity);
        
        productsList.appendChild(card);
    });
    
    updateOrderSummary(cartItems);
    updateComboSavingsDisplay(cartItems);
}

// Function to get loadcell_quantity from backend and re-render products
function fetchAndRenderLoadcell() {
    // Skip polling if WebSocket is active and working
    if (webSocketOverride && socket && socket.connected) {
        return;
    }
    
    Promise.all([
        fetch('/api/loadcell').then(res => res.json()),
        fetch('/api/loadcell-status').then(res => res.json())
    ])
    .then(([loadcellData, statusData]) => {
        if (Array.isArray(loadcellData)) {
            const errorCodes = statusData.error_codes || [];
            renderCartByLoadcell(loadcellData, errorCodes);
        }
    })
    .catch(error => {
        console.error('Error fetching loadcell data:', error);
    });
}

// Utility functions
function changeQty(idx, delta) {
    if (cart[idx]) {
        cart[idx].qty = Math.max(1, cart[idx].qty + delta);
        renderCart();
    }
}

function formatMoney(val) {
    return parseFloat(val || 0).toLocaleString('vi-VN');
}

function refreshCart() {
    if (socket && socket.connected) {
        socket.emit('request_cart_update');
    } else {
        alert('Không thể làm mới: WebSocket chưa kết nối. Vui lòng thử lại sau khi kết nối được khôi phục.');
    }
}

// Global variables for loadcell error tracking
let currentLoadcellData = [];
let loadcellErrorCheckInterval = null;

// Payment functions
function confirmPayment() {
    if (cart.length === 0) {
        showNotification('warning', 'Giỏ hàng trống', 'Vui lòng chọn sản phẩm trước khi thanh toán.', {
            closeable: true,
            duration: 4000
        });
        return;
    }
    
    // Check for loadcell position errors before proceeding
    checkLoadcellPositionErrors(() => {
        // If no errors, show print invoice confirmation modal
        showPrintInvoiceModal();
    });
}

/**
 * Check for loadcell position errors (200 and 222 values)
 * @param {Function} onSuccess - Callback to execute if no errors found
 */
function checkLoadcellPositionErrors(onSuccess) {
    fetch('/api/loadcell-data')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.raw_loadcell_data) {
                currentLoadcellData = data.raw_loadcell_data;
                
                // Check for position error values (200 and 222)
                const errorPositions = [];
                data.raw_loadcell_data.forEach((value, index) => {
                    if (value === 200 || value === 222) {
                        errorPositions.push({
                            position: index + 1, // Convert to 1-based position
                            value: value
                        });
                    }
                });
                
                if (errorPositions.length > 0) {
                    // Show position error modal
                    showProductPositionErrorModal(errorPositions);
                } else {
                    // No errors, proceed with payment
                    onSuccess();
                }
            } else {
                console.warn('Could not fetch loadcell data, blocking payment for safety');
                alert('Không thể kiểm tra trạng thái cảm biến. Vui lòng thử lại sau.');
            }
        })
        .catch(error => {
            console.error('Error checking loadcell data:', error);
            // Block payment if API call fails for safety
            alert('Lỗi kiểm tra cảm biến. Vui lòng thử lại sau.');
        });
}

/**
 * Show modal with product position errors
 * @param {Array} errorPositions - Array of error positions with their values
 */
function showProductPositionErrorModal(errorPositions) {
    const modal = document.getElementById('productPositionErrorModal');
    const messageElement = document.getElementById('productPositionErrorMessage');
    const errorListElement = document.getElementById('errorProductList');
    
    if (modal && messageElement && errorListElement) {
        // Create error message
        let errorMessage = 'Phát hiện sản phẩm đặt sai vị trí:';
        let errorListHTML = '<ul style="text-align: left; margin: 0; padding-left: 20px;">';
        
        errorPositions.forEach(error => {
            errorListHTML += `<li>Ô thứ ${error.position} - Mã lỗi: ${error.value}</li>`;
        });
        errorListHTML += '</ul>';
        errorListHTML += '<p style="margin-top: 10px; font-weight: bold; color: #e74c3c;">Vui lòng đặt lại sản phẩm đúng vị trí và thử lại thanh toán.</p>';
        
        messageElement.textContent = errorMessage;
        errorListElement.innerHTML = errorListHTML;
        
        modal.style.display = 'flex';
    }
}

/**
 * Close the product position error modal
 */
function closeProductPositionErrorModal() {
    const modal = document.getElementById('productPositionErrorModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showPrintInvoiceModal() {    
    // Show modal
    const modal = document.getElementById('printInvoiceModal');
    modal.style.display = 'flex';
}

function closePrintInvoiceModal() {
    const modal = document.getElementById('printInvoiceModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function proceedPayment(shouldPrint) {
    // Hide modal first
    const modal = document.getElementById('printInvoiceModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Calculate total from cart
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // Show processing notification
    showNotification('info', 'Đang xử lý...', 'Vui lòng đợi trong giây lát.', {
        closeable: false
    });

    // Set print bill preference to server (only set the global variable)
    fetch('/api/set-print-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ print_bill: shouldPrint })
    })
    .then(res => res.json())
    .then(data => {
        // Continue with payment processing regardless of print bill setting result
        return processPaymentFlow(total);
    })
    .catch(error => {
        console.warn('Print bill setting failed, continuing with payment:', error);
        // Continue with payment even if print setting fails
        return processPaymentFlow(total);
    });
}

function processPaymentFlow(total) {
    // Declare controller and timeoutId outside the promise chain
    const controller = new AbortController();
    let timeoutId;
    let products; // Declare products at function scope
    
    // First process cart to get combo pricing
    fetch('/api/cart/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: cart })
    })
    .then(res => res.json())
    .then(cartProcessResult => {
        if (!cartProcessResult.success) {
            throw new Error(cartProcessResult.message || 'Cart processing failed');
        }
        
        console.log('Cart processed with combo pricing:', cartProcessResult);
        
        // Use processed cart with combo pricing
        const processedCart = cartProcessResult.cart;
        const finalTotal = cartProcessResult.total;
        const comboInfo = cartProcessResult.combo_info;
        
        // Show combo savings to user
        if (comboInfo.combo_count > 0) {
            console.log(`Applied ${comboInfo.combo_count} combos, saved ${comboInfo.total_savings.toLocaleString()} VND`);
        }
        
        products = processedCart.map(p => ({ 
            product_id: p.product_id, 
            qty: p.qty || p.quantity,
            product_name: p.product_name || p.name,
            price: p.price, // This is combo price if applicable
            original_price: p.original_price,
            in_combo: p.in_combo,
            savings: p.savings
        }));
        
        // Use timeout for faster response
        timeoutId = setTimeout(() => controller.abort(), 2000);
        
        return fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: products,
                total: finalTotal,
                combo_info: comboInfo
            }),
            signal: controller.signal
        });
    })
    .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
    })
    .then(order => {
        clearTimeout(timeoutId); // Clear timeout on success
        
        console.log('Tạo đơn hàng thành công! Đang chuyển đến trang thanh toán...');
        
        if (order && order.id) {
            // Save order data to localStorage for QR page to retrieve
            localStorage.setItem('order_' + order.id, JSON.stringify({ 
                total: total, 
                products: products,
                timestamp: Date.now()
            }));
            
            // Clear cart
            cart = [];
            renderCart();
            
            // Redirect immediately without notification
            window.location.href = `/qr?orderId=${order.id}&total=${total}`;
        } else {
            throw new Error('Order creation failed');
        }
    })
    .catch(error => {
        clearTimeout(timeoutId); // Clear timeout on error
        console.error('Payment error:', error);
        
        console.log('Đã ẩn thông báo xử lý');
        
        if (error.name === 'AbortError') {
            showNotification('error', 'Timeout', 'Quá trình xử lý mất quá nhiều thời gian. Vui lòng thử lại.', {
                closeable: true
            });
        } else {
            showNotification('error', 'Lỗi thanh toán', 
                error.message || 'Không thể xử lý thanh toán. Vui lòng thử lại.', {
                closeable: true
            });
        }
    });
}

function removeProduct(index) {
    cart.splice(index, 1);
    renderCart();
}

// Helper function to update grand total
function updateGrandTotal() {
    let total = 0;
    
    // Calculate total from cart only (no manual quantities)
    cart.forEach(p => {
        total += p.price * p.qty;
    });
    
    // Update both subtotal and total
    const subtotalSpan = document.querySelector('#subtotal-row .amount');
    const totalAmountSpan = document.querySelector('#total-row .total-amount');
    
    if (subtotalSpan) {
        subtotalSpan.textContent = formatMoney(total) + ' ₫';
    }
    if (totalAmountSpan) {
        totalAmountSpan.textContent = formatMoney(total) + ' ₫';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners to stop empty cart timer on user interaction
    document.addEventListener('click', function() {
        if (emptyCartTimer && cart.length === 0) {
            console.log('User clicked - resetting empty cart timer');
            stopEmptyCartTimer();
            startEmptyCartTimer(); // Restart the timer
        }
    });
    
    document.addEventListener('keydown', function() {
        if (emptyCartTimer && cart.length === 0) {
            console.log('User pressed key - resetting empty cart timer');
            stopEmptyCartTimer();
            startEmptyCartTimer(); // Restart the timer
        }
    });
});

/**
 * Lock navigation during employee adding max_quantity process
 */
function lockNavigation() {
    console.log('Locking navigation - Employee adding max_quantity in progress');
    document.body.classList.add('rfid-adding-mode');
}

/**
 * Unlock navigation after max_quantity addition is complete
 */
function unlockNavigation() {
    console.log('Unlocking navigation - Max quantity addition complete');
    document.body.classList.remove('rfid-adding-mode');
}