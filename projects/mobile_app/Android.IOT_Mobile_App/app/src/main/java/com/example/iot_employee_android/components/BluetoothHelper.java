package com.example.iot_employee_android.components;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.os.Build;
import android.util.Log;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.OutputStream;
import java.util.UUID;

public class BluetoothHelper {
    public static final String TAG = "BT-SPP-TEST";
    public static final String PI_NAME = "raspberrypi";
    public static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");

    public static void testBluetooth(Context context) {
        BluetoothAdapter bt = BluetoothAdapter.getDefaultAdapter();
        if (bt == null) {
            Log.e(TAG, "Thiết bị không hỗ trợ Bluetooth");
            Toast.makeText(context, "Thiết bị không hỗ trợ Bluetooth", Toast.LENGTH_SHORT).show();
            return;
        }
        if (!bt.isEnabled()) {
            Log.e(TAG, "Bluetooth chưa bật!");
            Toast.makeText(context, "Bluetooth chưa bật!", Toast.LENGTH_SHORT).show();
            return;
        }
        if (Build.VERSION.SDK_INT >= 31 &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT)
                        != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(context, "Thiếu quyền BLUETOOTH_CONNECT (Android 12+)", Toast.LENGTH_SHORT).show();
            return;
        }

        BluetoothDevice pi = null;
        for (BluetoothDevice d : bt.getBondedDevices()) {
            Log.d(TAG, "Found device: " + d.getName() + " - " + d.getAddress());
            if (d.getName() != null && d.getName().equalsIgnoreCase(PI_NAME)) {
                pi = d;
                Log.d(TAG, "Chọn Pi: " + d.getName() + " - " + d.getAddress());
                break;
            }
        }
        if (pi == null) {
            Log.e(TAG, "Không tìm thấy Raspberry Pi đã paired!");
            Toast.makeText(context, "Không tìm thấy Raspberry Pi đã paired!", Toast.LENGTH_SHORT).show();
            return;
        }

        connectAndSendToPi(context, pi, "hello from Android");
    }

    public static void connectAndSendToPi(Context context, BluetoothDevice pi, String message) {
        new Thread(() -> {
            BluetoothSocket sock = null;
            OutputStream out = null;
            try {
                if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT)
                        != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    return;
                }
                sock = pi.createRfcommSocketToServiceRecord(SPP_UUID);
                BluetoothAdapter.getDefaultAdapter().cancelDiscovery();
                sock.connect();

                out = sock.getOutputStream();
                out.write(message.getBytes());
                out.flush();
                android.os.Handler mainHandler = new android.os.Handler(context.getMainLooper());
                mainHandler.post(() -> Toast.makeText(context, "Đã gửi dữ liệu tới Pi!", Toast.LENGTH_SHORT).show());
            } catch (Exception e) {
                Log.e(TAG, "Lỗi gửi BT: " + e.getMessage(), e);
                android.os.Handler mainHandler = new android.os.Handler(context.getMainLooper());
                mainHandler.post(() -> Toast.makeText(context, "Lỗi BT: " + e.getMessage(), Toast.LENGTH_LONG).show());
            } finally {
                try { if (out != null) out.close(); } catch (Exception ignored) {}
                try { if (sock != null) sock.close(); } catch (Exception ignored) {}
            }
        }).start();
    }
}