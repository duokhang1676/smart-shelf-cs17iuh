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
// Dropdown functionality
function toggleSettingsDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropdown = document.getElementById('settingsDropdown');
    dropdown.classList.toggle('show');
}

// Show sensor data section
function showSensorData(event) {
    event.preventDefault();
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('sensorDataSection').classList.add('active');
    document.getElementById('settingsDropdown').classList.remove('show');
    resetQRFlag(); // Reset QR flag when switching sections
    loadSensorData();
}

// Show mobile app section
function showMobileApp(event) {
    event.preventDefault();
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('mobileAppSection').classList.add('active');
    document.getElementById('settingsDropdown').classList.remove('show');
    resetQRFlag(); // Reset QR flag when switching sections
    generateQRCode();
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('settingsDropdown');
    const navDropdown = document.querySelector('.nav-dropdown');
    if (!navDropdown.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

function formatValue(value) {
    if (value === null || value === undefined) {
        return 'Null';
    }
    if (typeof value === 'number') {
        return value.toFixed(2);
    }
    return value.toString();
}

function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleString('vi-VN');
}

async function loadSensorData() {
    try {
        document.getElementById('lastUpdate').textContent = 'Đang tải...';
        const response = await fetch('/api/sensor-data');
        const data = await response.json();
        document.getElementById('pressure').textContent = formatValue(data.pressure);
        document.getElementById('temperature').textContent = formatValue(data.temperature);
        document.getElementById('humidity').textContent = formatValue(data.humidity);
        document.getElementById('light').textContent = formatValue(data.light);
        document.getElementById('sound').textContent = formatValue(data.sound);
        document.getElementById('magnetic').textContent = formatValue(data.magnetic);
        document.getElementById('lastUpdate').textContent = `Cập nhật lần cuối: ${formatTime(data.timestamp)}`;
    } catch (error) {
        console.error('Error loading sensor data:', error);
        document.getElementById('lastUpdate').textContent = 'Lỗi khi tải dữ liệu. Vui lòng thử lại.';
    }
}

// Load data on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    const currentPath = window.location.pathname;
    if (currentPath === '/mobile-app') {
        showMobileApp(new Event('click'));
    } else {
        showSensorData(new Event('click'));
    }
    
    // Generate QR code if mobile app section is active
    setTimeout(() => {
        if (document.getElementById('mobileAppSection').classList.contains('active')) {
            console.log('Mobile app section is active, generating QR code');
            generateQRCode();
        }
    }, 500); // Increased delay to ensure QRCode library is loaded
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loadSensorData();
        });
    }
});

// Function to load QR code from API
let qrCodeGenerated = false; // Flag to prevent duplicate generation

async function generateQRCode() {
    console.log('generateQRCode called - loading from API');
    const qrContainer = document.getElementById('qrcode');
    console.log('qrContainer:', qrContainer);
    
    if (qrContainer && !qrCodeGenerated) {
        qrCodeGenerated = true; // Set flag to prevent duplicate calls
        
        // Clear existing QR code
        qrContainer.innerHTML = '';
        
        // Add loading indicator
        qrContainer.innerHTML = '<div class="loading-qr">Đang tải QR code...</div>';
        qrContainer.classList.add('loading');
        
        try {
            console.log('Fetching QR from API...');
            const response = await fetch('http://iot.ducdatphat.id.vn:3000/api/shelves/get-qr/685aa9484e13a49f1ef3289c');
            
            if (response.ok) {
                const data = await response.json();
                console.log('API response:', data);
                
                if (data.success && data.data && data.data.length > 0 && data.data[0].qr_url) {
                    const qrUrl = data.data[0].qr_url;
                    // Construct full URL if it's a relative path
                    const fullQrUrl = qrUrl.startsWith('http') ? qrUrl : `http://iot.ducdatphat.id.vn:3000${qrUrl}`;
                    
                    console.log('QR URL from API:', fullQrUrl);
                    
                    // Create image element
                    const img = document.createElement('img');
                    img.src = fullQrUrl;
                    img.alt = 'QR Code from API';
                    img.style.maxWidth = '256px';
                    img.style.maxHeight = '256px';
                    img.onload = function() {
                        console.log('QR image from API loaded successfully');
                        qrContainer.classList.remove('loading');
                    };
                    img.onerror = function() {
                        console.error('Failed to display QR image from API');
                        fallbackQRCode(qrContainer);
                    };
                    
                    // Clear loading and add image
                    qrContainer.innerHTML = '';
                    qrContainer.appendChild(img);
                } else {
                    console.error('Invalid API response format:', data);
                    fallbackQRCode(qrContainer);
                }
            } else {
                console.error('Failed to fetch QR from API:', response.status);
                fallbackQRCode(qrContainer);
            }
        } catch (error) {
            console.error('Error fetching QR from API:', error);
            fallbackQRCode(qrContainer);
        }
    } else if (qrCodeGenerated) {
        console.log('QR code already generated, skipping');
    } else {
        console.error('QR container not found');
    }
}

// Reset flag when switching sections
function resetQRFlag() {
    qrCodeGenerated = false;
}

function fallbackQRCode(qrContainer) {
    // Fallback: create QR code using online API with the shelf ID
    console.log('Using fallback QR method');
    const shelfId = '685aa9484e13a49f1ef3289c';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(shelfId)}`;
    console.log('Fallback QR URL:', qrUrl);
    
    // Add loading class
    qrContainer.classList.add('loading');
    qrContainer.innerHTML = '<div class="loading-qr">Đang tải QR fallback...</div>';
    
    const img = document.createElement('img');
    img.src = qrUrl;
    img.alt = 'QR Code (Fallback)';
    img.style.maxWidth = '256px';
    img.style.maxHeight = '256px';
    img.onload = function() {
        console.log('Fallback QR image loaded successfully');
        qrContainer.classList.remove('loading');
        qrContainer.innerHTML = '';
        qrContainer.appendChild(img);
    };
    img.onerror = function() {
        console.error('Failed to load fallback QR image');
        qrContainer.classList.remove('loading');
        // Final fallback: show text version with better styling
        qrContainer.innerHTML = `
            <div class="qr-fallback">
                <p><strong>Shelf ID:</strong></p>
                <p class="shelf-id">685aa9484e13a49f1ef3289c</p>
                <p><small>QR code không thể hiển thị</small></p>
            </div>
        `;
    };
}
