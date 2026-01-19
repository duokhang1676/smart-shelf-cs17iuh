package com.example.iot_employee_android.bluetooth;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.UUID;

public class BluetoothManager {
    private static final String TAG = "BluetoothManager";
    private static final UUID MY_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    
    private Context context;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket bluetoothSocket;
    private BluetoothDevice bluetoothDevice;
    private InputStream inputStream;
    private OutputStream outputStream;
    private Handler mainHandler;
    
    private BluetoothConnectionListener listener;
    private boolean isConnected = false;

    public interface BluetoothConnectionListener {
        void onConnected();
        void onDisconnected();
        void onDataReceived(String data);
        void onError(String error);
        void onStatusUpdate(String status); // Thêm method mới
    }

    public BluetoothManager(Context context) {
        this.context = context;
        this.bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    public void setConnectionListener(BluetoothConnectionListener listener) {
        this.listener = listener;
    }

    public boolean isBluetoothSupported() {
        return bluetoothAdapter != null;
    }

    public boolean isBluetoothEnabled() {
        return bluetoothAdapter != null && bluetoothAdapter.isEnabled();
    }

    public void connectToDevice(String macAddress) {
        if (!isBluetoothSupported()) {
            notifyError("Bluetooth không được hỗ trợ");
            return;
        }

        if (!isBluetoothEnabled()) {
            notifyError("Bluetooth chưa được bật");
            return;
        }

        // Hiển thị trạng thái đang kết nối
        notifyStatus("Đang kết nối Bluetooth...");

        new Thread(() -> {
            try {
                // Lấy device theo MAC address
                bluetoothDevice = bluetoothAdapter.getRemoteDevice(macAddress);
                
                Log.d(TAG, "Connecting to device: " + bluetoothDevice.getName() + " (" + macAddress + ")");

                // Tạo socket kết nối
                bluetoothSocket = bluetoothDevice.createRfcommSocketToServiceRecord(MY_UUID);
                
                // Dừng discovery để tăng tốc độ kết nối
                bluetoothAdapter.cancelDiscovery();

                // Kết nối
                bluetoothSocket.connect();

                // Lấy input/output streams
                inputStream = bluetoothSocket.getInputStream();
                outputStream = bluetoothSocket.getOutputStream();

                isConnected = true;
                notifyConnected();
                
                // Gửi handshake ngay sau khi kết nối thành công
                sendHandshakeMessage();
                
                // Bắt đầu lắng nghe dữ liệu
                startListening();

            } catch (IOException e) {
                Log.e(TAG, "Connection failed", e);
                notifyError("Kết nối thất bại: " + e.getMessage());
                disconnect();
            }
        }).start();
    }

    // Phương thức gửi handshake
    private void sendHandshakeMessage() {
        new Thread(() -> {
            try {
                // Delay ngắn để đảm bảo kết nối ổn định
                Thread.sleep(500);
                
                if (outputStream != null && isConnected) {
                    String handshakeMsg = "Handshake\n";
                    outputStream.write(handshakeMsg.getBytes());
                    outputStream.flush();
                    Log.d(TAG, "Handshake sent: " + handshakeMsg.trim());
                    
                    // Thông báo handshake đã gửi
                    notifyStatus("Handshake đã gửi!");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error sending handshake", e);
                notifyError("Lỗi gửi handshake: " + e.getMessage());
            }
        }).start();
    }

    private void startListening() {
        new Thread(() -> {
            byte[] buffer = new byte[1024];
            int bytes;

            while (isConnected && bluetoothSocket != null) {
                try {
                    bytes = inputStream.read(buffer);
                    String receivedData = new String(buffer, 0, bytes);
                    
                    mainHandler.post(() -> {
                        if (listener != null) {
                            listener.onDataReceived(receivedData);
                        }
                    });
                    
                } catch (IOException e) {
                    Log.e(TAG, "Error reading data", e);
                    break;
                }
            }
        }).start();
    }

    public void sendData(String data) {
        if (!isConnected || outputStream == null) {
            notifyError("Chưa kết nối Bluetooth");
            return;
        }

        new Thread(() -> {
            try {
                outputStream.write(data.getBytes());
                outputStream.flush();
                Log.d(TAG, "Data sent: " + data);
            } catch (IOException e) {
                Log.e(TAG, "Error sending data", e);
                notifyError("Lỗi gửi dữ liệu: " + e.getMessage());
            }
        }).start();
    }

    public void disconnect() {
        isConnected = false;
        
        try {
            if (inputStream != null) {
                inputStream.close();
                inputStream = null;
            }
            
            if (outputStream != null) {
                outputStream.close();
                outputStream = null;
            }
            
            if (bluetoothSocket != null) {
                bluetoothSocket.close();
                bluetoothSocket = null;
            }
            
            notifyDisconnected();
            
        } catch (IOException e) {
            Log.e(TAG, "Error disconnecting", e);
        }
    }

    public boolean isConnected() {
        return isConnected && bluetoothSocket != null && bluetoothSocket.isConnected();
    }

    private void notifyConnected() {
        mainHandler.post(() -> {
            if (listener != null) {
                listener.onConnected();
            }
        });
    }

    private void notifyDisconnected() {
        mainHandler.post(() -> {
            if (listener != null) {
                listener.onDisconnected();
            }
        });
    }

    private void notifyError(String error) {
        mainHandler.post(() -> {
            if (listener != null) {
                listener.onError(error);
            }
        });
    }

    // Phương thức thông báo status
    private void notifyStatus(String status) {
        mainHandler.post(() -> {
            if (listener != null) {
                listener.onStatusUpdate(status);
            }
        });
    }
}