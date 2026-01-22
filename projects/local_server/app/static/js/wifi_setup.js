// WiFi Setup JavaScript

let currentSelectedWifi = null;
let isScanning = false;
let isConnecting = false;

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function() {
    loadWifiStatus();
    loadHotspotInfo();
    scanWifiNetworks();
    
    // Thiết lập sự kiện
    document.getElementById('scanBtn').addEventListener('click', scanWifiNetworks);
    document.getElementById('connectBtn').addEventListener('click', connectToWifi);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('togglePassword').addEventListener('click', togglePasswordVisibility);
    
    // Đóng modal khi click bên ngoài
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('connectModal');
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Tự động refresh trạng thái mỗi 10 giây
    setInterval(loadWifiStatus, 10000);
});

// Lấy trạng thái WiFi hiện tại
async function loadWifiStatus() {
    try {
        const response = await fetch('/api/wifi/status');
        const data = await response.json();
        
        if (data.success) {
            displayWifiStatus(data.data);
        } else {
            displayError('currentStatus', 'Không thể lấy trạng thái WiFi');
        }
    } catch (error) {
        console.error('Error loading WiFi status:', error);
        displayError('currentStatus', 'Lỗi kết nối');
    }
}

// Hiển thị trạng thái WiFi
function displayWifiStatus(status) {
    const statusDiv = document.getElementById('currentStatus');
    const hotspotDiv = document.getElementById('hotspotInfo');
    
    let html = '';
    
    if (status.connected) {
        html = `
            <div class="status-connected">
                <span style="font-size: 1.5em;">✅</span>
                <div>
                    <div>Đã kết nối WiFi</div>
                    <div style="font-size: 0.9em; opacity: 0.8;">SSID: ${status.ssid}</div>
                </div>
            </div>
        `;
        hotspotDiv.style.display = 'none';
    } else if (status.hotspot_active) {
        html = `
            <div class="status-hotspot">
                <span style="font-size: 1.5em;">📡</span>
                <div>
                    <div>Hotspot đang hoạt động</div>
                    <div style="font-size: 0.9em; opacity: 0.8;">Chưa kết nối WiFi</div>
                </div>
            </div>
        `;
        hotspotDiv.style.display = 'block';
    } else {
        html = `
            <div class="status-disconnected">
                <span style="font-size: 1.5em;">❌</span>
                <div>Chưa kết nối WiFi</div>
            </div>
        `;
        hotspotDiv.style.display = 'none';
    }
    
    statusDiv.innerHTML = html;
}

// Lấy thông tin Hotspot
async function loadHotspotInfo() {
    try {
        const response = await fetch('/api/wifi/hotspot/info');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('hotspotSSID').textContent = data.data.ssid;
            document.getElementById('hotspotPassword').textContent = data.data.password;
        }
    } catch (error) {
        console.error('Error loading hotspot info:', error);
    }
}

// Quét mạng WiFi
async function scanWifiNetworks() {
    if (isScanning) return;
    
    isScanning = true;
    const scanBtn = document.getElementById('scanBtn');
    const wifiList = document.getElementById('wifiList');
    
    scanBtn.disabled = true;
    scanBtn.textContent = '🔄 Đang quét...';
    wifiList.innerHTML = '<div class="loading">Đang quét mạng WiFi...</div>';
    
    try {
        const response = await fetch('/api/wifi/scan');
        const data = await response.json();
        
        if (data.success) {
            displayWifiList(data.data);
        } else {
            displayError('wifiList', 'Không thể quét mạng WiFi');
        }
    } catch (error) {
        console.error('Error scanning WiFi:', error);
        displayError('wifiList', 'Lỗi kết nối');
    } finally {
        isScanning = false;
        scanBtn.disabled = false;
        scanBtn.textContent = '🔄 Quét lại';
    }
}

// Hiển thị danh sách WiFi
function displayWifiList(networks) {
    const wifiList = document.getElementById('wifiList');
    
    if (networks.length === 0) {
        wifiList.innerHTML = '<div class="loading">Không tìm thấy mạng WiFi nào</div>';
        return;
    }
    
    let html = '';
    networks.forEach(network => {
        const signalBars = getSignalBars(network.signal);
        const securityIcon = network.security === 'Open' ? '🔓' : '🔒';
        
        html += `
            <div class="wifi-item" onclick="showConnectModal('${escapeHtml(network.ssid)}', '${escapeHtml(network.security)}', ${network.signal})">
                <div class="wifi-item-header">
                    <div class="wifi-ssid">${securityIcon} ${escapeHtml(network.ssid)}</div>
                    <div class="wifi-signal">
                        <span class="signal-bars">${signalBars}</span>
                        <span>${network.signal}%</span>
                    </div>
                </div>
                <div class="wifi-security">${network.security}</div>
            </div>
        `;
    });
    
    wifiList.innerHTML = html;
}

// Chuyển đổi cường độ tín hiệu thành biểu tượng
function getSignalBars(signal) {
    if (signal >= 80) return '📶';
    if (signal >= 60) return '📶';
    if (signal >= 40) return '📶';
    if (signal >= 20) return '📶';
    return '📶';
}

// Hiển thị modal kết nối
function showConnectModal(ssid, security, signal) {
    currentSelectedWifi = { ssid, security, signal };
    
    const modal = document.getElementById('connectModal');
    const modalSSID = document.getElementById('modalSSID');
    const modalPassword = document.getElementById('modalPassword');
    const securityInfo = document.getElementById('securityInfo');
    const connectStatus = document.getElementById('connectStatus');
    
    modalSSID.value = ssid;
    modalPassword.value = '';
    connectStatus.innerHTML = '';
    
    if (security === 'Open') {
        modalPassword.disabled = true;
        modalPassword.placeholder = 'Mạng mở - không cần mật khẩu';
        securityInfo.textContent = '🔓 Mạng WiFi mở';
    } else {
        modalPassword.disabled = false;
        modalPassword.placeholder = 'Nhập mật khẩu WiFi';
        securityInfo.textContent = `🔒 Bảo mật: ${security}`;
    }
    
    modal.style.display = 'block';
    if (!modalPassword.disabled) {
        modalPassword.focus();
    }
}

// Đóng modal
function closeModal() {
    const modal = document.getElementById('connectModal');
    modal.style.display = 'none';
    currentSelectedWifi = null;
}

// Kết nối WiFi
async function connectToWifi() {
    if (isConnecting || !currentSelectedWifi) return;
    
    const password = document.getElementById('modalPassword').value;
    const connectBtn = document.getElementById('connectBtn');
    const connectStatus = document.getElementById('connectStatus');
    
    // Kiểm tra mật khẩu nếu mạng có bảo mật
    if (currentSelectedWifi.security !== 'Open' && !password) {
        connectStatus.className = 'connect-status error';
        connectStatus.textContent = 'Vui lòng nhập mật khẩu';
        return;
    }
    
    isConnecting = true;
    connectBtn.disabled = true;
    connectStatus.className = 'connect-status loading';
    connectStatus.textContent = '⏳ Đang kết nối...';
    
    try {
        const response = await fetch('/api/wifi/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ssid: currentSelectedWifi.ssid,
                password: password || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            connectStatus.className = 'connect-status success';
            connectStatus.textContent = '✅ Kết nối thành công!';
            
            // Đợi 2 giây rồi đóng modal và refresh
            setTimeout(() => {
                closeModal();
                loadWifiStatus();
            }, 2000);
        } else {
            connectStatus.className = 'connect-status error';
            connectStatus.textContent = '❌ ' + (data.error || data.message || 'Kết nối thất bại');
        }
    } catch (error) {
        console.error('Error connecting to WiFi:', error);
        connectStatus.className = 'connect-status error';
        connectStatus.textContent = '❌ Lỗi kết nối';
    } finally {
        isConnecting = false;
        connectBtn.disabled = false;
    }
}

// Toggle hiển thị mật khẩu
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('modalPassword');
    const toggleBtn = document.getElementById('togglePassword');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

// Hiển thị lỗi
function displayError(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="error">${message}</div>`;
}

// Escape HTML để tránh XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
