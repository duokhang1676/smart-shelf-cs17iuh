package com.example.iot_employee_android;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.MenuItem;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.example.iot_employee_android.bluetooth.BluetoothManager;
import com.example.iot_employee_android.components.DrawerHelper;
import com.example.iot_employee_android.databinding.ActivityMainBinding;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.util.List;

public abstract class BaseDrawerActivity extends AppCompatActivity {
    protected ActivityMainBinding binding;
    protected DrawerHelper drawerHelper;

    // Camera constants
    protected static final int REQUEST_CAMERA_PERMISSION = 1001;
    protected static final int REQUEST_QR_SCAN = 1002;

    private BarcodeScanner scanner;

    // Bluetooth
    protected BluetoothManager bluetoothManager;
    private static final String IOT_DEVICE_MAC = "D8:3A:DD:78:09:C5";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        drawerHelper = new DrawerHelper(
                this,
                binding.drawerLayout,
                binding.appBarMain.toolbar,
                binding.navView
        );

        drawerHelper.setup(new DrawerHelper.DrawerListener() {
            @Override
            public boolean onDrawerMenuSelected(MenuItem item) {
                return handleDrawerMenuSelection(item);
            }
        });

        // Setup ML Kit barcode scanner
        setupBarcodeScanner();
        setupFAB();

        // Setup Bluetooth
        setupBluetooth();
    }

    private void setupBarcodeScanner() {
        BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build();
        scanner = BarcodeScanning.getClient(options);
    }

    private void setupBluetooth() {
        bluetoothManager = new BluetoothManager(this);
        bluetoothManager.setConnectionListener(new BluetoothManager.BluetoothConnectionListener() {
            @Override
            public void onConnected() {
                showBluetoothToast("✅ Kết nối IoT thành công!", true);
                onBluetoothConnected();
            }

            @Override
            public void onDisconnected() {
                showBluetoothToast("❌ Mất kết nối IoT", false);
                onBluetoothDisconnected();
            }

            @Override
            public void onDataReceived(String data) {
                android.util.Log.d("BaseDrawerActivity", "Received: " + data);
                
                // Kiểm tra nếu là phản hồi handshake
                if (data.trim().equalsIgnoreCase("Handshake_OK") || 
                    data.trim().equalsIgnoreCase("OK") ||
                    data.contains("Handshake")) {
                    showBluetoothToast("🤝 Handshake thành công!", true);
                }
                
                onBluetoothDataReceived(data);
            }

            @Override
            public void onError(String error) {
                showBluetoothToast("⚠️ Lỗi Bluetooth: " + error, false);
                onBluetoothError(error);
            }

            @Override
            public void onStatusUpdate(String status) {
                showBluetoothToast("📡 " + status, null);
                onBluetoothStatusUpdate(status);
            }
        });
    }

    // Phương thức để Activity con override (không bắt buộc)
    protected void onBluetoothConnected() {
        // Activity con có thể override - mặc định không làm gì
    }

    protected void onBluetoothDisconnected() {
        // Activity con có thể override - mặc định không làm gì
    }

    protected void onBluetoothDataReceived(String data) {
        // Activity con có thể override - mặc định không làm gì
    }

    protected void onBluetoothError(String error) {
        // Activity con có thể override - mặc định không làm gì
    }

    protected void onBluetoothStatusUpdate(String status) {
        // Activity con có thể override - mặc định không làm gì
    }

    // Phương thức hiển thị Toast với màu sắc
    private void showBluetoothToast(String message, Boolean isSuccess) {
        android.widget.Toast toast = android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_SHORT);
        
        // Log để debug
        if (isSuccess != null) {
            android.util.Log.d("BaseDrawerActivity", (isSuccess ? "SUCCESS: " : "ERROR: ") + message);
        } else {
            android.util.Log.d("BaseDrawerActivity", "INFO: " + message);
        }
        
        toast.show();
    }

    // Phương thức kết nối với MAC address mặc định
    protected void connectToBluetooth() {
        connectToBluetoothDevice(IOT_DEVICE_MAC);
    }

    // Phương thức gửi dữ liệu với Toast
    protected void sendBluetoothData(String data) {
        if (bluetoothManager != null && bluetoothManager.isConnected()) {
            bluetoothManager.sendData(data);
            showBluetoothToast("📤 Đã gửi: " + data, true);
        } else {
            showBluetoothToast("❌ Chưa kết nối IoT", false);
        }
    }

    // Thêm constant cho permission request
    private static final int REQUEST_BLUETOOTH_PERMISSIONS = 1003;

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    protected boolean handleDrawerMenuSelection(MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.nav_shelf_history) {
            if (!(this instanceof ShelfHistoryActivity)) {
                startActivity(new Intent(this, ShelfHistoryActivity.class));
            }
            return true;
        } else if (id == R.id.nav_gallery || id == R.id.nav_home) {
            if (!(this instanceof MainActivity)) {
                startActivity(new Intent(this, MainActivity.class));
            }
            return true;
        }

        return onDrawerItemSelected(item);
    }

    // Setup FAB với logic Camera + QR Scanner
    protected void setupFAB() {
        if (binding.appBarMain.fab != null) {
            binding.appBarMain.fab.setOnClickListener(v -> {
                openCameraWithPermissionCheck();
            });
            binding.appBarMain.fab.setVisibility(View.VISIBLE);
            // Set icon camera
            binding.appBarMain.fab.setImageResource(android.R.drawable.ic_menu_camera);
        }
    }

    // Logic Camera chung
    protected void openCameraWithPermissionCheck() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.CAMERA},
                    REQUEST_CAMERA_PERMISSION);
        } else {
            openQRScanner();
        }
    }

    protected void openQRScanner() {
        Intent intent = new Intent(this, QRScannerActivity.class);
        startActivityForResult(intent, REQUEST_QR_SCAN);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_QR_SCAN && resultCode == RESULT_OK) {
            if (data != null) {
                String qrContent = data.getStringExtra("QR_CONTENT");
                if (qrContent != null) {
                    onQRCodeScanned(qrContent);
                }
            }
        }
    }

    // Phương thức xử lý QR đã quét
    protected void onQRCodeScanned(String qrContent) {
        // Kiểm tra xem QR có phải là MAC address không
        if (isValidMacAddress(qrContent)) {
            String normalizedMac = normalizeMacAddress(qrContent);
            // Hiển thị dialog xác nhận kết nối
            showBluetoothConnectionDialog(normalizedMac);
        } else {
            // Hiển thị dialog QR thông thường
            showQRContentDialog(qrContent);
        }
        
        onQRContentReceived(qrContent);
    }

    // Kiểm tra MAC address hợp lệ và chuẩn hóa
    private boolean isValidMacAddress(String macAddress) {
        if (macAddress == null || macAddress.trim().isEmpty()) {
            return false;
        }
        
        String cleanMac = macAddress.trim().toUpperCase();
        
        // Pattern cho MAC address với dấu : hoặc -
        String macPattern = "^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$";
        
        // Pattern cho MAC address không có dấu phân cách
        String macPatternNoSeparator = "^[0-9A-F]{12}$";
        
        return cleanMac.matches(macPattern) || cleanMac.matches(macPatternNoSeparator);
    }

    // Chuẩn hóa MAC address về định dạng XX:XX:XX:XX:XX:XX
    private String normalizeMacAddress(String macAddress) {
        if (macAddress == null) return null;
        
        String cleanMac = macAddress.trim().toUpperCase().replaceAll("[:-]", "");
        
        if (cleanMac.length() == 12) {
            // Thêm dấu : vào đúng vị trí
            StringBuilder formatted = new StringBuilder();
            for (int i = 0; i < cleanMac.length(); i += 2) {
                if (i > 0) formatted.append(":");
                formatted.append(cleanMac.substring(i, i + 2));
            }
            return formatted.toString();
        }
        
        return macAddress; // Trả về nguyên gốc nếu không chuẩn hóa được
    }

    // Dialog xác nhận kết nối Bluetooth
    protected void showBluetoothConnectionDialog(String macAddress) {
        new androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("🔗 Kết nối Bluetooth")
                .setMessage("Đã quét được MAC address:\n\n" + macAddress + "\n\nBạn có muốn kết nối với thiết bị này không?")
                .setPositiveButton("Kết nối", (dialog, which) -> {
                    dialog.dismiss();
                    connectToBluetoothDevice(macAddress);
                })
                .setNegativeButton("Hủy", (dialog, which) -> dialog.dismiss())
                .setNeutralButton("Quét lại", (dialog, which) -> {
                    dialog.dismiss();
                    openQRScanner();
                })
                .show();
    }

    // Kết nối đến thiết bị Bluetooth cụ thể
    protected void connectToBluetoothDevice(String macAddress) {
        // Ngắt kết nối hiện tại nếu có
        if (bluetoothManager != null && bluetoothManager.isConnected()) {
            showBluetoothToast("🔄 Ngắt kết nối cũ...", null);
            bluetoothManager.disconnect();
            
            // Delay ngắn trước khi kết nối mới
            new android.os.Handler().postDelayed(() -> {
                startNewBluetoothConnection(macAddress);
            }, 1000);
        } else {
            startNewBluetoothConnection(macAddress);
        }
    }

    private void startNewBluetoothConnection(String macAddress) {
        // Kiểm tra permission trước khi kết nối
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{
                                Manifest.permission.BLUETOOTH_CONNECT,
                                Manifest.permission.BLUETOOTH_SCAN
                        },
                        REQUEST_BLUETOOTH_PERMISSIONS);
                // Lưu MAC address để kết nối sau khi có permission
                pendingMacAddress = macAddress;
                return;
            }
        }

        if (bluetoothManager == null) {
            showBluetoothToast("❌ Bluetooth Manager chưa sẵn sàng", false);
            return;
        }

        if (!bluetoothManager.isBluetoothSupported()) {
            showBluetoothToast("❌ Thiết bị không hỗ trợ Bluetooth", false);
            return;
        }

        if (!bluetoothManager.isBluetoothEnabled()) {
            showBluetoothToast("❌ Bluetooth chưa được bật", false);
            return;
        }

        // Bắt đầu kết nối với MAC address mới
        showBluetoothToast("🔄 Đang kết nối đến " + macAddress + "...", null);
        bluetoothManager.connectToDevice(macAddress);
    }

    // Biến lưu MAC address khi đang chờ permission
    private String pendingMacAddress = null;

    // Phương thức xử lý ảnh thông thường
    protected void onImageCaptured(Bitmap bitmap) {
        android.widget.Toast.makeText(this, "Ảnh đã được chụp thành công!", android.widget.Toast.LENGTH_SHORT).show();
        // Activity con có thể override để xử lý bitmap
    }

    // Hiển thị dialog với nội dung QR
    protected void showQRContentDialog(String content) {
        new androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Đã quét được mã QR")
                .setMessage("Nội dung:\n\n" + content)
                .setPositiveButton("OK", (dialog, which) -> dialog.dismiss())
                .setNegativeButton("Quét lại", (dialog, which) -> {
                    dialog.dismiss();
                    openQRScanner(); // Sửa từ openCamera() thành openQRScanner()
                })
                .show();
    }

    // Thêm phương thức openCamera() thiếu (tùy chọn - nếu cần chụp ảnh thông thường)
    protected void openCamera() {
        Intent takePictureIntent = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);

        if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
            try {
                startActivityForResult(takePictureIntent, REQUEST_QR_SCAN);
            } catch (Exception e) {
                android.util.Log.e("BaseDrawerActivity", "Error starting camera", e);
                android.widget.Toast.makeText(this, "Không thể mở camera: " + e.getMessage(), android.widget.Toast.LENGTH_SHORT).show();
            }
        } else {
            android.widget.Toast.makeText(this, "Thiết bị không hỗ trợ camera", android.widget.Toast.LENGTH_SHORT).show();
        }
    }

    // Phương thức để Activity con xử lý nội dung QR
    protected void onQRContentReceived(String qrContent) {
        android.util.Log.d("BaseDrawerActivity", "QR Content: " + qrContent);
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (drawerHelper != null && drawerHelper.handleOptions(item)) return true;
        return super.onOptionsItemSelected(item);
    }

    protected void inflateContent(int layoutRes) {
        getLayoutInflater().inflate(layoutRes, binding.appBarMain.contentContainer, true);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (scanner != null) {
            scanner.close();
        }
        if (bluetoothManager != null) {
            bluetoothManager.disconnect();
        }
    }

    // Abstract methods
    protected abstract void loadAndRenderShelves();
    protected abstract boolean onDrawerItemSelected(MenuItem item);

    // Utility methods
    protected void showFAB(boolean show) {
        if (binding.appBarMain.fab != null) {
            binding.appBarMain.fab.setVisibility(show ? View.VISIBLE : View.GONE);
        }
    }

    protected void setFABIcon(int iconRes) {
        if (binding.appBarMain.fab != null) {
            binding.appBarMain.fab.setImageResource(iconRes);
        }
    }
}
