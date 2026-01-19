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
/**
 * Shelf Page JavaScript - Handle RFID input and real-time updates
 */

// Use existing socket connection from navigation if available
let socket = null;
let isConnected = false;

// RFID input handling variables
let rfidInput = '';
let rfidTimeout = null;

// DOM elements
let rfidIndicator, rfidInputDisplay, rfidInputText, completeAddingContainer, completeAddingButton;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    rfidIndicator = document.getElementById('rfidIndicator');
    rfidInputDisplay = document.getElementById('rfidInputDisplay');
    rfidInputText = document.getElementById('rfidInputText');
    completeAddingContainer = document.getElementById('completeAddingContainer');
    completeAddingButton = document.getElementById('completeAddingButton');
    
    // Add event listener for complete adding button
    if (completeAddingButton) {
        completeAddingButton.addEventListener('click', handleCompleteAdding);
    }
    
    // Use existing socket or create new one
    if (window.NavigationUtils && window.navigation && window.navigation.socket) {
        socket = window.navigation.socket;
        console.log('Shelf: Using existing navigation socket');
    } else if (typeof io !== 'undefined') {
        socket = io();
        console.log('Shelf: Created new socket connection');
    }
    
    // Initialize WebSocket connection
    if (socket) {
        initializeWebSocket();
    }
    
    // Initialize RFID input handling
    initializeRFIDHandling();
    
    // Check if we're in adding state on page load
    checkAddingState();
    
    // Initial load of data
    updateLoadcellTotal();
    updateMaxQuantityInfo();
    
    console.log('Shelf page initialized with real-time WebSocket updates');
});

/**
 * Initialize WebSocket connection and event handlers
 */
function initializeWebSocket() {
    // Notify server that we left slideshow page when entering shelf page
    socket.emit('slideshow_page_leave');
    
    socket.on('connect', function() {
        console.log('WebSocket connected to shelf page');
        isConnected = true;
    });
    
    socket.on('disconnect', function() {
        console.log('WebSocket disconnected from shelf page');
        isConnected = false;
    });
    
    // Listen for loadcell updates (for real-time shelf status)
    // socket.on('loadcell_update', function(data) {
    //     console.log('Loadcell update received');
    //     updateLoadcellTotal(); // Update the total when loadcell data changes
    //     updateMaxQuantityInfo(); // Update individual max_quantity info
        
    //     // Check for taken quantity changes and redirect to cart
    //     if (data.taken_quantity && Array.isArray(data.taken_quantity)) {
    //         const currentTakenQuantities = data.taken_quantity;
            
    //         // Check if any product has been taken (taken quantity > 0)
    //         const hasProductTaken = currentTakenQuantities.some(qty => qty > 0);
    //         console.log('Has product taken:', hasProductTaken, 'Current quantities:', currentTakenQuantities);
            
    //         if (hasProductTaken) {
    //             console.log('Product taken detected on shelf page, redirecting to cart page...');
    //             window.location.href = '/cart';
    //         }
    //     }
    // });
    
    // Listen for combo detection and redirect
    socket.on('redirect_to_combo', function(data) {
        console.log('Combo detection event received:', data);
        showRFIDIndicator('Combo detected! ' + (data.message || 'Redirecting to combo page...'));
        
        window.location.href = data.url || '/combo';
    });
    
    // Listen for create order and redirect event
    socket.on('create_order_and_redirect', function(data) {
        console.log('Create order and redirect event:', data);
        showRFIDIndicator('Thanh toán: ' + (data.message || 'Chuyển đến giỏ hàng để thanh toán...'));
        
        // Redirect to cart page
        setTimeout(() => {
            window.location.href = '/cart';
        }, 1500);
    });
    
    // Listen for empty cart notification
    socket.on('empty_cart_notification', function(data) {
        console.log('Empty cart notification:', data);
        showRFIDIndicator((data.message || 'Vui lòng chọn sản phẩm trước khi thanh toán.'), 'warning');
    });

    // Listen for RFID events from hardware backend listener
    socket.on('employee_adding_max_quantity', function(data) {
        console.log('RFID detected: employee adding max_quantity (shelf page)');
        
        // Lock navigation during employee adding process
        lockNavigation();
    });

    socket.on('max_quantity_added_notification', function(data) {
        console.log('Max quantity added notification:', data);
        
        // Unlock navigation after successful addition
        unlockNavigation();
    });
}

/**
 * Initialize RFID input handling - Now handled by hardware backend listener
 */
function initializeRFIDHandling() {
    // RFID input is now handled by hardware backend listener (listen_rfid.py)
    // and state monitor (rfid_state_monitor.py) which emits WebSocket events
    console.log('RFID handling: Using hardware backend listener');
}

/**
 * Check if we're currently in adding state on page load
 */
function checkAddingState() {
    fetch('/api/rfid-state')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.is_adding) {
                console.log('Page loaded during adding state - locking navigation');
                lockNavigation();
            }
        })
        .catch(error => {
            console.warn('Could not check adding state:', error);
        });
}

/**
 * Function to fetch and update loadcell total
 */
function updateLoadcellTotal() {
    fetch('/api/loadcell-data')
        .then(response => response.json())
        .then(data => {
            const loadcellTotalElement = document.getElementById('loadcell-total');
            const errorCountElement = document.getElementById('error-count');
            
            if (data.success && data.raw_loadcell_data) {
                // Calculate total products excluding error values (255, 200, 222)
                let totalProducts = 0;
                let errorCount = 0;
                
                data.raw_loadcell_data.forEach(value => {
                    if (value === 255 || value === 200 || value === 222) {
                        errorCount++;
                    } else if (value > 0) {
                        totalProducts += value;
                    }
                });
                
                loadcellTotalElement.textContent = totalProducts;
                if (errorCountElement) {
                    errorCountElement.textContent = errorCount;
                }
                
                console.log('Loadcell total updated (excluding errors):', totalProducts);
                console.log('Error slots count:', errorCount);
            } else {
                loadcellTotalElement.textContent = '0';
                if (errorCountElement) {
                    errorCountElement.textContent = '0';
                }
                console.error('Error getting loadcell data:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching loadcell data:', error);
            document.getElementById('loadcell-total').textContent = 'Lỗi';
            const errorCountElement = document.getElementById('error-count');
            if (errorCountElement) {
                errorCountElement.textContent = 'Lỗi';
            }
        });
}

/**
 * Function to update max_quantity info for each product
 */
function updateMaxQuantityInfo() {
    Promise.all([
        fetch('/api/loadcell-data').then(res => res.json()),
        fetch('/api/all-products').then(res => res.json())
    ])
    .then(([loadcellData, productsData]) => {
        if (loadcellData.success && Array.isArray(productsData)) {
            const rawLoadcellData = loadcellData.raw_loadcell_data;
            
            productsData.forEach((product, index) => {
                const stockElement = document.getElementById(`max-quantity-info-${index}`);
                if (stockElement) {
                    const rawValue = rawLoadcellData[index];
                    const maxQuantity = product.max_quantity || 0;
                    
                        // Check for error codes
                        if (rawValue === 255) {
                            stockElement.textContent = 'Error';
                            stockElement.className = 'max-quantity-info max-quantity-out'; // Red color for error
                        } else if (rawValue === 200) {
                            stockElement.textContent = 'N/A';
                            stockElement.className = 'max-quantity-info max-quantity-out';
                        } else if (rawValue === 222) {
                            stockElement.textContent = 'N/A';
                            stockElement.className = 'max-quantity-info max-quantity-out';
                    } else {
                        const shelfQty = Math.max(0, rawValue || 0);
                
                        // Update content with format: "shelf quantity / stock quantity"
                        stockElement.textContent = `${shelfQty}/${maxQuantity}`;
                
                        // Update color based on shelf quantity
                        stockElement.className = 'max-quantity-info';
                        if (shelfQty === 0) {
                            stockElement.classList.add('max-quantity-out');
                        } else if (shelfQty < Math.min(5, maxQuantity * 0.2)) {
                            stockElement.classList.add('max-quantity-low');
                        }
                    }
                }
            });
        }
    })
    .catch(error => {
        console.error('Error updating max_quantity info:', error);
    });
}

/**
 * Show RFID indicator with message and styling
 * @param {string} message - Message to display
 * @param {string} type - Type of message ('error', 'warning', 'persistent', or default)
 */
function showRFIDIndicator(message, type = '') {
    if (rfidIndicator) {
        rfidIndicator.textContent = message;
        rfidIndicator.className = `rfid-indicator show ${type}`;
        
        // Only auto hide if not persistent
        if (type !== 'persistent') {
            // Auto hide after 3 seconds
            setTimeout(() => {
                rfidIndicator.classList.remove('show');
            }, 3000);
        }
    }
}

/**
 * Update RFID input display
 * @param {string} inputText - Current RFID input text
 */
function updateRFIDDisplay(inputText) {
    if (rfidInputText && rfidInputDisplay) {
        rfidInputText.textContent = inputText;
        if (inputText.length > 0) {
            rfidInputDisplay.classList.add('show');
        } else {
            rfidInputDisplay.classList.remove('show');
        }
    }
}

/**
 * Handle RFID input from keyboard - DEPRECATED
 * RFID is now handled by hardware backend listener
 */
function handleRFIDInput(event) {
    // This function is deprecated - RFID processing moved to hardware backend
    // Hardware listener (listen_rfid.py) + state monitor (rfid_state_monitor.py)
    // now handle RFID detection and emit WebSocket events
    console.log('RFID input via keyboard deprecated - using hardware listener');
}

/**
 * Lock navigation during employee adding max_quantity process
 */
function lockNavigation() {
    console.log('Locking navigation - Employee adding max_quantity in progress');
    document.body.classList.add('rfid-adding-mode');
    
    // Show persistent visual indicator that navigation is locked
    showRFIDIndicator('Đang thêm hàng...', 'persistent');
    
    // Show the complete adding button
    if (completeAddingContainer) {
        completeAddingContainer.style.display = 'block';
    }
}

/**
 * Unlock navigation after max_quantity addition is complete
 */
function unlockNavigation() {
    console.log('Unlocking navigation - Max quantity addition complete');
    document.body.classList.remove('rfid-adding-mode');
    
    // Hide the persistent "Đang thêm hàng..." indicator
    if (rfidIndicator) {
        rfidIndicator.classList.remove('show');
    }

    // Hide the complete adding button
    if (completeAddingContainer) {
        completeAddingContainer.style.display = 'none';
    }

    showRFIDIndicator('Thêm sản phẩm thành công: Đã cập nhật số lượng sản phẩm');
    
    // Reload page after adding products to show updated quantities
    setTimeout(() => {
        window.location.reload();
    }, 2000); // Wait 2 seconds to show success message before reload
}

/**
 * Handle complete adding button click
 */
function handleCompleteAdding() {
    console.log('Button clicked - handleCompleteAdding called');
    
    // Send API request to print to server terminal
    fetch('/api/added-product', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: 'hoàn tất thêm hàng'
        })
    })
    .then(response => {
        console.log('API response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('API response data:', data);
        if (data.success) {
            console.log('Message printed to terminal successfully');
        } else {
            console.error('Failed to print to terminal:', data.message);
        }
    })
    .catch(error => {
        console.error('Error printing to terminal:', error);
    });
    
    unlockNavigation();
}
