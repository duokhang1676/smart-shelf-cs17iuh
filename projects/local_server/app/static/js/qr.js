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
// QR Payment JavaScript functionality

// Global variables
let orderId = null;
let orderTotal = 0;
let orderProducts = [];
let maxTime = 100 * 1000; // default 100 seconds
let startTime = Date.now();
let countdownId = null;
let lastLoadcell = null;
let isNavigatingAway = false;
let socket = null;
let navigationBlocked = true;
let allowPaymentRedirect = false;

// Initialize QR payment functionality
function initializeQRPayment() {
    // Get orderId from URL
    const params = new URLSearchParams(window.location.search);
    orderId = params.get('orderId');

    // Check if orderId exists
    if (!orderId) {
        console.error('No orderId found in URL');
        document.getElementById('qr-error').classList.remove('d-none');
        document.getElementById('qr-loading').classList.add('d-none');
        document.getElementById('fallback-info').innerText = 'Không tìm thấy mã đơn hàng. Vui lòng quay lại trang chủ.';
        return;
    }

    // Get total and products from localStorage if available
    loadOrderData(params);
    
    // Display total immediately if available
    displayOrderTotal();
    
    // Initialize WebSocket connection
    initWebSocket();
    
    // Start countdown and payment monitoring
    startCountdown();
    
    // Set up navigation controls
    setupNavigationControls();
}

// Load order data from URL params and localStorage
function loadOrderData(params) {
    // Try to get from URL params first
    try {
        const totalParam = params.get('total');
        if (totalParam) {
            orderTotal = parseInt(totalParam) || 0;
            console.log('DEBUG QR: Loaded total from URL params:', orderTotal);
        }
    } catch (e) {
        console.warn('Error parsing total from URL:', e);
    }

    // Try to get from localStorage (if available, override URL params)
    if (orderId) {
        try {
            const storageKey = 'order_' + orderId;
            const storedData = localStorage.getItem(storageKey);
            console.log('DEBUG QR: localStorage data:', storedData);
            if (storedData) {
                const tmp = JSON.parse(storedData);
                if (tmp && typeof tmp.total !== 'undefined') {
                    console.log('DEBUG QR: Loaded total from localStorage:', tmp.total, '(overriding URL params)');
                    orderTotal = tmp.total;
                    orderProducts = tmp.products || [];
                }
            }
        } catch (e) {
            console.warn('Error parsing localStorage data:', e);
        }
    }

    // Debug log
    console.log('DEBUG QR: Final orderTotal:', orderTotal);
    console.log('Order details:', { orderId, orderTotal, orderProducts });
}

// Display order total
function displayOrderTotal() {
    const totalElement = document.getElementById('total-text');
    if (orderTotal > 0) {
        totalElement.innerText = 'Tổng cộng: ' + orderTotal.toLocaleString('vi-VN') + ' ₫';
    } else {
        totalElement.innerText = 'Đang tải thông tin đơn hàng...';
    }
}

// Initialize WebSocket connection
function initWebSocket() {
    socket = io();

    // Notify server that we left slideshow page when entering QR page
    socket.emit('slideshow_page_leave');

    // WebSocket event handlers for QR generation
    socket.on('qr_generation_progress', handleQRProgress);
    socket.on('qr_generation_complete', handleQRComplete);
    
    // WebSocket event handlers for payment monitoring
    socket.on('payment_monitoring_status', handlePaymentMonitoringStatus);
    socket.on('payment_received', handlePaymentReceived);
    socket.on('payment_timeout', handlePaymentTimeout);
    
    // WebSocket loadcell monitoring for redirect
    socket.on('loadcell_update', handleLoadcellUpdate);
    socket.on('loadcell_disconnected', handleLoadcellDisconnected);
    
    // WebSocket disconnect handling
    socket.on('disconnect', handleSocketDisconnect);
    socket.on('connect', handleSocketConnect);
    
    // Listen for create order and redirect event
    socket.on('create_order_and_redirect', handleCreateOrderRedirect);
    socket.on('empty_cart_notification', handleEmptyCartNotification);

    // Start QR generation via WebSocket - only if orderId exists
    if (orderId) {
        console.log('DEBUG QR: Sending generate_qr_request with total:', orderTotal);
        socket.emit('generate_qr_request', {
            orderId: orderId,
            total: orderTotal,
            products: orderProducts
        });
    } else {
        console.error('Cannot generate QR without orderId');
    }
}

// Handle QR generation progress
function handleQRProgress(data) {
    if (data.order_id === orderId) {
        console.log('QR Progress:', data);
        // Update loading message with progress
        const loadingDiv = document.getElementById('qr-loading');
        loadingDiv.querySelector('p').innerText = `${data.message} (${data.progress}%)`;
        
        // Add progress bar if not exists
        let progressBar = document.getElementById('qr-progress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'qr-progress';
            progressBar.innerHTML = `
                <div class="progress mt-2" style="height: 6px;">
                    <div class="progress-bar progress-bar-animated" role="progressbar" style="width: 0%"></div>
                </div>
            `;
            loadingDiv.appendChild(progressBar);
        }
        
        // Update progress bar
        const progressBarElement = progressBar.querySelector('.progress-bar');
        progressBarElement.style.width = data.progress + '%';
    }
}

// Handle QR generation complete
function handleQRComplete(data) {
    if (data.order_id === orderId) {
        console.log('QR Complete:', data);
        
        if (data.success && data.qrUrl) {
            // Success: Show QR code immediately and hide loading
            document.getElementById('qr-img').src = data.qrUrl;
            document.getElementById('qr-img').classList.remove('d-none');
            document.getElementById('qr-instruction').classList.remove('d-none');
            document.getElementById('qr-error').classList.add('d-none');
            document.getElementById('qr-loading').classList.add('d-none');
            
            // Update total if not already set
            if (!orderTotal && data.total && typeof data.total !== 'undefined') {
                orderTotal = data.total;
                const totalElement = document.getElementById('total-text');
                if (totalElement) {
                    totalElement.innerText = 'Tổng cộng: ' + orderTotal.toLocaleString('vi-VN') + ' ₫';
                }
            }
            
            // Payment monitoring auto-starts from backend after QR generation
            console.log('QR generated successfully, payment monitoring will auto-start');
            
        } else {
            // Error: Show fallback
            document.getElementById('qr-img').classList.add('d-none');
            document.getElementById('qr-instruction').classList.add('d-none');
            document.getElementById('qr-error').classList.remove('d-none');
            document.getElementById('qr-loading').classList.add('d-none');
            
            // Set fallback message
            const fallbackMsg = data.fallback_message || 
                `Chuyển khoản ${(orderTotal || 0).toLocaleString('vi-VN')} VND với nội dung: ${orderId || 'N/A'}`;
            document.getElementById('fallback-info').innerText = fallbackMsg;
            
            // For manual transfers (QR failed), manually start payment monitoring - only if orderId exists
            if (orderId) {
                socket.emit('start_payment_monitoring', {
                    orderId: orderId,
                    total: orderTotal,
                    products: orderProducts
                });
            }
        }
    }
}

// Handle payment monitoring status
function handlePaymentMonitoringStatus(data) {
    if (data.order_id === orderId) {
        console.log('Payment monitoring:', data);
        // Remove the alert display - only keep countdown
    }
}

// Handle payment received
function handlePaymentReceived(data) {
    if (data.order_id === orderId) {
        console.log('Payment received:', data);
        console.log('PAYMENT SUCCESS - Starting redirect process...');
        
        if (countdownId) clearInterval(countdownId);
        
        // Allow payment redirect without blocking
        allowPaymentRedirect = true;
        navigationBlocked = false;
        isNavigatingAway = true;
        
        console.log('Navigation flags set - allowPaymentRedirect:', allowPaymentRedirect, 'navigationBlocked:', navigationBlocked);
        
        // Remove all event listeners that might block navigation
        window.removeEventListener('beforeunload', arguments.callee);
        window.removeEventListener('popstate', arguments.callee);
        
        // Use setTimeout to ensure all flags are processed
        setTimeout(() => {
            console.log('Executing redirect to payment_success...');
            try {
                // Try multiple redirect methods as fallback
                window.location.href = `/payment_success?orderId=${orderId}`;
                
                // Fallback if href doesn't work
                setTimeout(() => {
                    console.log('Fallback redirect attempt...');
                    window.location.replace(`/payment_success?orderId=${orderId}`);
                }, 500);
                
                // Final fallback
                setTimeout(() => {
                    console.log('Final fallback redirect attempt...');
                    document.location.href = `/payment_success?orderId=${orderId}`;
                }, 1000);
                
            } catch (error) {
                console.error('Redirect error:', error);
                // Manual navigation as last resort
                document.location = `/payment_success?orderId=${orderId}`;
            }
        }, 100);
    }
}

// Handle payment timeout
function handlePaymentTimeout(data) {
    if (data.order_id === orderId) {
        console.log('Payment timeout:', data);
        console.log('PAYMENT TIMEOUT - Starting redirect to payment_fail...');
        
        if (countdownId) clearInterval(countdownId);
        
        // Allow payment redirect without blocking
        allowPaymentRedirect = true;
        navigationBlocked = false;
        isNavigatingAway = true;
        
        console.log('Timeout redirect flags set - allowPaymentRedirect:', allowPaymentRedirect);
        
        setTimeout(function() { 
            console.log('Executing timeout redirect to payment_fail...');
            window.location.replace('/payment_fail'); 
        }, 100);
    }
}

// Handle loadcell update
function handleLoadcellUpdate(data) {
    // Don't redirect if payment has been successful
    if (allowPaymentRedirect || isNavigatingAway) {
        console.log('Loadcell update ignored - payment successful or navigating away');
        return;
    }
    
    console.log('Loadcell update received on QR page:', data);
    console.log('Taken quantity data:', data.taken_quantity);
    
    // Check for taken_quantity first (immediate redirect for product taken)
    if (data.taken_quantity && Array.isArray(data.taken_quantity)) {
        const currentTakenQuantities = data.taken_quantity;
        
        // Check if any product has been taken (taken quantity > 0)
        const hasProductTaken = currentTakenQuantities.some(qty => qty > 0);
        console.log('Has product taken:', hasProductTaken, 'Current quantities:', currentTakenQuantities);
        
        if (hasProductTaken) {
            console.log('Product taken detected during payment, stopping payment monitoring and redirecting to cart...');
            
            // Clear payment countdown timer
            if (countdownId) clearInterval(countdownId);
            
            // Stop auto payment checking
            socket.emit('payment_monitoring_stop', {
                order_id: orderId,
                reason: 'product_taken'
            });
            
            // Redirect to cart page immediately
            window.location.href = '/cart';
            return;
        }
    }
    
    // Fallback: check for general loadcell changes
    const currentLoadcell = JSON.stringify(data.loadcell_data);
    if (lastLoadcell === null) {
        lastLoadcell = currentLoadcell;
    } else {
        if (currentLoadcell !== lastLoadcell) {
            console.log('Loadcell quantity changed during payment, stopping payment monitoring and redirecting to cart...');
            
            // Clear payment countdown timer
            if (countdownId) clearInterval(countdownId);
            
            // Stop auto payment checking
            socket.emit('payment_monitoring_stop', {
                order_id: orderId,
                reason: 'quantity_changed'
            });
            
            // Redirect to cart page immediately
            window.location.href = '/cart';
        }
    }
}

// Handle loadcell disconnection
function handleLoadcellDisconnected(data) {
    console.log('Loadcell disconnected during payment - but continue payment monitoring...');
    // Don't stop payment monitoring for loadcell disconnection
    // Payment can still be received via bank transfer
}

// Handle socket disconnect
function handleSocketDisconnect() {
    console.warn('WebSocket disconnected - waiting for reconnection...');
}

// Handle socket connect
function handleSocketConnect() {
    console.log('WebSocket reconnected');
}

// Handle create order redirect
function handleCreateOrderRedirect(data) {
    console.log('Create order and redirect event on QR page:', data);
    
    // Show notification - this shouldn't normally happen on QR page but handle it gracefully
    showNotification('#2196F3', 'Thanh toán', 'Đã nhận yêu cầu thanh toán', 3000);
}

// Handle empty cart notification
function handleEmptyCartNotification(data) {
    console.log('Empty cart notification:', data);
    
    // Show warning notification
    showNotification('#ff9800', 'Giỏ hàng trống', data.message || 'Vui lòng chọn sản phẩm trước khi thanh toán.', 5000);
}

// Show notification helper
function showNotification(bgColor, title, message, duration) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 16px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        max-width: 300px;
        text-align: center;
    `;
    notification.innerHTML = `
        <div style="margin-bottom: 5px; font-weight: bold;">${title}</div>
        <div style="font-size: 14px; font-weight: normal;">${message}</div>
    `;
    document.body.appendChild(notification);
    
    // Auto remove after specified duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, duration);
}

// Start countdown timer
function startCountdown() {
    // Start countdown only if we have valid orderId
    if (!orderId) return;
    
    function updateCountdown() {
        let timeLeft = Math.max(0, maxTime - (Date.now() - startTime));
        let min = Math.floor(timeLeft / 60000);
        let sec = Math.floor((timeLeft % 60000) / 1000);
        
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            countdownElement.innerText = `Thời gian còn lại: ${min}:${sec.toString().padStart(2, '0')}`;
        }
        
        if (timeLeft <= 0) {
            if (countdownId) clearInterval(countdownId);
            
            // Allow payment redirect without blocking
            allowPaymentRedirect = true;
            navigationBlocked = false;
            
            // Let WebSocket handle timeout, but have fallback
            setTimeout(function() { window.location.replace('/payment_fail'); }, 100);
        }
    }
    
    updateCountdown();
    countdownId = setInterval(updateCountdown, 500); // Update every 0.5 seconds for smoother countdown
}

// Stop payment monitoring when user navigates away from QR page
function stopPaymentMonitoring(reason) {
    // Only stop monitoring for specific critical reasons
    const criticalReasons = ['user_navigation', 'quantity_changed'];
    
    if (criticalReasons.includes(reason)) {
        if (orderId && socket && socket.connected) {
            console.log(`Stopping payment monitoring - reason: ${reason}`);
            socket.emit('payment_monitoring_stop', {
                order_id: orderId,
                reason: reason
            });
            
            // Clear countdown timer
            if (countdownId) {
                clearInterval(countdownId);
                countdownId = null;
            }
        }
    } else {
        // For non-critical reasons, just log but continue monitoring
        console.log(`Payment monitoring continues despite: ${reason}`);
    }
}

// Setup navigation controls
function setupNavigationControls() {
    // Add current state to history to catch back button
    history.pushState(null, null, window.location.href);
    
    // Handle browser back button and redirect to cart
    window.addEventListener('popstate', function(event) {
        event.preventDefault();
        const userChoice = confirm('Bạn đang trong quá trình thanh toán. Chỉ có thể quay lại trang giỏ hàng. Bạn có muốn quay lại giỏ hàng không?');
        if (userChoice) {
            stopPaymentMonitoring('user_navigation');
            window.location.href = '/cart';
        } else {
            // Push current state back to prevent navigation
            history.pushState(null, null, window.location.href);
        }
    });
    
    // Handle page visibility change (tab switching, minimizing)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Don't stop monitoring when tab is hidden - payment can still be received
            console.log('Tab hidden - but payment monitoring continues in background');
        } else {
            console.log('Tab visible again - payment monitoring still active');
        }
    });
    
    // Handle window focus/blur events
    window.addEventListener('blur', function() {
        // Don't stop monitoring when window loses focus - payment can still be received
        console.log('Window lost focus - but payment monitoring continues in background');
    });
    
    // Block navigation to other pages except cart and payment result pages
    window.addEventListener('beforeunload', function(event) {
        // CRITICAL: Don't block if payment redirect is allowed or navigating away
        if (allowPaymentRedirect || isNavigatingAway) {
            console.log('beforeunload: allowing navigation - payment redirect or navigating away');
            return;
        }
        
        // Don't block navigation to payment-related pages
        if (window.location.pathname.includes('/payment_success') || 
            window.location.pathname.includes('/payment_fail') ||
            window.location.pathname.includes('/cart')) {
            console.log('beforeunload: allowing navigation to payment/cart page');
            return;
        }
        
        // Check if user is trying to navigate to allowed pages
        const isGoingToAllowed = event.target && event.target.activeElement && 
                              event.target.activeElement.href && 
                              (event.target.activeElement.href.includes('/cart') ||
                               event.target.activeElement.href.includes('/payment_success') ||
                               event.target.activeElement.href.includes('/payment_fail'));
        
        if (!isGoingToAllowed) {
            console.log('beforeunload: blocking navigation to non-allowed page');
            // Prevent navigation to other pages
            event.preventDefault();
            event.returnValue = 'Bạn đang trong quá trình thanh toán. Bạn có chắc chắn muốn rời khỏi trang này?';
            
            // Show custom confirmation
            const userChoice = confirm('Bạn đang trong quá trình thanh toán. Chỉ có thể quay lại trang giỏ hàng. Bạn có muốn quay lại giỏ hàng không?');
            if (userChoice) {
                // Redirect to cart instead
                setTimeout(() => {
                    stopPaymentMonitoring('user_navigation');
                    window.location.href = '/cart';
                }, 100);
            }
            return false;
        }
        
        // Don't stop monitoring on page unload - payment can still be received
        console.log('Page unloading - but payment monitoring continues in background');
    });
    
    // Override navigation methods to control navigation
    const originalLocation = window.location;
    
    // Override window.location.href setter (safer approach)
    let originalHref = originalLocation.href;
    
    // Store original methods
    const originalAssign = originalLocation.assign;
    const originalReplace = originalLocation.replace;
    
    // Override location.assign
    originalLocation.assign = function(url) {
        if (navigationBlocked && !allowPaymentRedirect && typeof url === 'string') {
            if (url.includes('/cart') || url.includes('/payment_success') || url.includes('/payment_fail')) {
                originalAssign.call(originalLocation, url);
            } else {
                const userChoice = confirm('Bạn đang trong quá trình thanh toán. Chỉ có thể quay lại trang giỏ hàng. Bạn có muốn quay lại giỏ hàng không?');
                if (userChoice) {
                    stopPaymentMonitoring('user_navigation');
                    originalAssign.call(originalLocation, '/cart');
                }
            }
        } else {
            originalAssign.call(originalLocation, url);
        }
    };
    
    // Override location.replace
    originalLocation.replace = function(url) {
        if (navigationBlocked && !allowPaymentRedirect && typeof url === 'string') {
            if (url.includes('/cart') || url.includes('/payment_success') || url.includes('/payment_fail')) {
                originalReplace.call(originalLocation, url);
            } else {
                const userChoice = confirm('Bạn đang trong quá trình thanh toán. Chỉ có thể quay lại trang giỏ hàng. Bạn có muốn quay lại giỏ hàng không?');
                if (userChoice) {
                    stopPaymentMonitoring('user_navigation');
                    originalReplace.call(originalLocation, '/cart');
                }
            }
        } else {
            originalReplace.call(originalLocation, url);
        }
    };
    
    // Block links that try to navigate away (except cart)
    document.addEventListener('click', function(event) {
        const target = event.target;
        if (target.tagName === 'A' && target.href) {
            const href = target.href;
            // Allow navigation to cart and payment result pages
            if (!href.includes('/cart') && !href.includes('/payment_success') && !href.includes('/payment_fail')) {
                event.preventDefault();
                const userChoice = confirm('Bạn đang trong quá trình thanh toán. Chỉ có thể quay lại trang giỏ hàng. Bạn có muốn quay lại giỏ hàng không?');
                if (userChoice) {
                    stopPaymentMonitoring('user_navigation');
                    window.location.href = '/cart';
                }
            }
        }
    });
    
    // Handle page visibility changes (modern replacement for unload)
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden' && !isNavigatingAway) {
            isNavigatingAway = true;
            // Don't stop monitoring when page becomes hidden - payment can still be received
            console.log('Page hidden - but payment monitoring continues in background');
        }
    });
    
    // Handle page hide
    window.addEventListener('pagehide', function(event) {
        // Don't stop monitoring on page hide - payment can still be received
        console.log('Page hidden - but payment monitoring continues in background');
    });
}

// Global function to be called from HTML onclick
window.stopPaymentMonitoring = stopPaymentMonitoring;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeQRPayment);
