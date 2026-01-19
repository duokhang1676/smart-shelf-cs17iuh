package com.example.iot_employee_android;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class BluetoothTester {
    public interface Listener {
        void onLog(String line);
        void onConnected();
        void onDisconnected(Exception e);
        void onReceive(byte[] buf, int len);
    }

    private static final String TAG = "BT-SPP-TEST";
    private static final UUID SPP_UUID =
            UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");

    private final BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
    private final Listener cb;
    private final ExecutorService ioPool = Executors.newSingleThreadExecutor();
    private final Context context;

    private BluetoothSocket socket;
    private InputStream in;
    private OutputStream out;
    private volatile boolean running = false;

    public BluetoothTester(Context context, Listener listener) {
        this.context = context;
        this.cb = listener;
    }

    public void connect(String mac) {
        ioPool.execute(() -> {
            try {
                if (adapter == null) {
                    emit("BluetoothAdapter null"); return;
                }
                BluetoothDevice dev = adapter.getRemoteDevice(mac);
                // Thử socket an toàn trước
                try {
                    if (ActivityCompat.checkSelfPermission(context, android.Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                        // TODO: Consider calling
                        //    ActivityCompat#requestPermissions
                        // here to request the missing permissions, and then overriding
                        //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
                        //                                          int[] grantResults)
                        // to handle the case where the user grants the permission. See the documentation
                        // for ActivityCompat#requestPermissions for more details.
                        return;
                    }
                    socket = dev.createRfcommSocketToServiceRecord(SPP_UUID);
                    emit("createRfcommSocketToServiceRecord()");
                } catch (Exception e) {
                    emit("Secure socket failed: " + e);
                }
                // Fallback sang insecure hoặc reflection nếu cần
                if (socket == null) {
                    try {
                        Method m = dev.getClass()
                                .getMethod("createInsecureRfcommSocket", int.class);
                        socket = (BluetoothSocket) m.invoke(dev, 1);
                        emit("Reflection insecure rfcomm on ch1");
                    } catch (Exception e) {
                        emit("Insecure reflection failed: " + e);
                    }
                }
                if (socket == null) {
                    emit("Không tạo được socket"); return;
                }

                adapter.cancelDiscovery();
                socket.connect();
                in = socket.getInputStream();
                out = socket.getOutputStream();
                running = true;
                emit("Connected");
                if (cb != null) cb.onConnected();

                // Vòng đọc
                byte[] buf = new byte[1024];
                while (running) {
                    int n = in.read(buf);
                    if (n < 0) break;
                    if (cb != null) cb.onReceive(buf, n);
                }
                close(null);
            } catch (Exception e) {
                close(e);
            }
        });
    }

    public void send(byte[] data) {
        ioPool.execute(() -> {
            try {
                if (out == null) { emit("Chưa kết nối"); return; }
                out.write(data);
                out.flush();
                emit("TX " + data.length + " bytes");
            } catch (Exception e) {
                emit("Send error: " + e);
                close(e);
            }
        });
    }

    public void close(Exception cause) {
        running = false;
        try { if (in != null) in.close(); } catch (Exception ignored) {}
        try { if (out != null) out.close(); } catch (Exception ignored) {}
        try { if (socket != null) socket.close(); } catch (Exception ignored) {}
        if (cb != null) cb.onDisconnected(cause);
        emit("Closed");
    }

    private void emit(String s) {
        Log.d(TAG, s);
        if (cb != null) cb.onLog(s);
    }
}
