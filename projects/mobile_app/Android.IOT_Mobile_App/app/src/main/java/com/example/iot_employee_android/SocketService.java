// SocketService.java
package com.example.iot_employee_android;

import android.app.*;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;
import java.net.URISyntaxException;
import java.util.Iterator;
import java.util.Arrays;

import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

public class SocketService extends Service {
    private static final String TAG = "SocketService";
    public static final String ACTION_SOCKET_STATUS = "com.example.iot_employee_android.ACTION_SOCKET_STATUS";
    public static final String EXTRA_SOCKET_CONNECTED = "connected";
    public static volatile boolean isConnected = false;

    private static final String FG_CH = "socket_channel";
    private Socket mSocket;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate - API level: " + Build.VERSION.SDK_INT);
        createFgChannel();
        
        // Khởi động foreground service với compatibility
        try {
            startCompatibleForegroundService();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground service: " + e.getMessage());
            // Không dừng service, vẫn tiếp tục chạy ở background
        }
        
        connectSocket();
    }

    private void startCompatibleForegroundService() {
        Notification notification = buildOngoing("Đang kết nối realtime...");
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // API 34+
            // Android 14+ cần permission FOREGROUND_SERVICE_DATA_SYNC
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // API 29+
            // Android 10-13
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            // Android 9 và thấp hơn
            startForeground(1, notification);
        }
    }

    private void updateOngoing(String text) {
        try {
            Notification notification = buildOngoing(text);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // API 34+
                startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // API 29+
                startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            } else {
                startForeground(1, notification);
            }
        } catch (SecurityException e) {
            Log.e(TAG, "updateOngoing failed (SecurityException): " + e.getMessage());
            // Fallback: chỉ log, không crash app
        } catch (Exception e) {
            Log.e(TAG, "updateOngoing failed: " + e.getMessage());
        }
    }

    private void connectSocket() {
        try {
            Log.d(TAG, "connectSocket() - creating options");
            IO.Options opts = new IO.Options();
            opts.forceNew = true;
            opts.reconnection = true;
            opts.reconnectionDelayMax = 10000;
            opts.transports = new String[]{"websocket", "polling"};

            String socketEndpoint = getString(R.string.socket_endpoint);
            Log.d(TAG, "Connecting to socket endpoint: " + socketEndpoint);
            mSocket = IO.socket(socketEndpoint, opts);

            // Log tất cả socket events để debug
            mSocket.on(Socket.EVENT_CONNECT, args -> {
                Log.d(TAG, "EVENT_CONNECT - Connected successfully!");
                Log.d(TAG, "EVENT_CONNECT args count: " + args.length);
                for (int i = 0; i < args.length; i++) {
                    Log.d(TAG, "EVENT_CONNECT arg[" + i + "]: " + args[i]);
                }
                isConnected = true;
                broadcastStatus(true);
                updateOngoing("Đã kết nối");
            });

            mSocket.on(Socket.EVENT_DISCONNECT, args -> {
                Log.w(TAG, "EVENT_DISCONNECT - Disconnected!");
                Log.w(TAG, "EVENT_DISCONNECT args count: " + args.length);
                for (int i = 0; i < args.length; i++) {
                    Log.w(TAG, "EVENT_DISCONNECT arg[" + i + "]: " + args[i]);
                }
                isConnected = false;
                broadcastStatus(false);
                updateOngoing("Mất kết nối, thử lại...");
            });

            mSocket.on(Socket.EVENT_CONNECT_ERROR, args -> {
                Log.e(TAG, "EVENT_CONNECT_ERROR - Connection failed!");
                Log.e(TAG, "EVENT_CONNECT_ERROR args count: " + args.length);
                for (int i = 0; i < args.length; i++) {
                    Log.e(TAG, "EVENT_CONNECT_ERROR arg[" + i + "]: " + args[i]);
                }
                isConnected = false;
                broadcastStatus(false);
                updateOngoing("Lỗi kết nối");
            });

            // Event listener cho "new-notification"
            mSocket.on("new-notification", onNewNotification);
            Log.d(TAG, "Registered listener for 'new-notification'");

            // Thêm listener cho các event names khác có thể có
            mSocket.on("notification", args -> {
                Log.d(TAG, "Received 'notification' event with " + args.length + " args");
                for (int i = 0; i < args.length; i++) {
                    Log.d(TAG, "notification arg[" + i + "]: " + args[i]);
                }
            });
            
            mSocket.on("message", args -> {
                Log.d(TAG, "Received 'message' event with " + args.length + " args");
                for (int i = 0; i < args.length; i++) {
                    Log.d(TAG, "message arg[" + i + "]: " + args[i]);
                }
            });
            
            mSocket.on("data", args -> {
                Log.d(TAG, "Received 'data' event with " + args.length + " args");
                for (int i = 0; i < args.length; i++) {
                    Log.d(TAG, "data arg[" + i + "]: " + args[i]);
                }
            });

            // Thêm listener cho event "shelf-history" nếu server emit với tên này
            mSocket.on("shelf-history", args -> {
                Log.d(TAG, "Received 'shelf-history' event with " + args.length + " args");
                for (int i = 0; i < args.length; i++) {
                    Log.d(TAG, "shelf-history arg[" + i + "]: " + args[i]);
                }
            });

            Log.d(TAG, "Calling mSocket.connect()...");
            mSocket.connect();
            Log.d(TAG, "mSocket.connect() called successfully");

        } catch (URISyntaxException e) {
            Log.e(TAG, "connectSocket URISyntaxException", e);
            updateOngoing("URL socket không hợp lệ");
        } catch (Exception e) {
            Log.e(TAG, "connectSocket Exception", e);
            updateOngoing("Lỗi khởi tạo socket");
        }
    }

    private void broadcastStatus(boolean connected) {
        Intent i = new Intent(ACTION_SOCKET_STATUS);
        i.putExtra(EXTRA_SOCKET_CONNECTED, connected);
        sendBroadcast(i);
        Log.d(TAG, "Broadcasting socket status: " + connected);
    }

    private final Emitter.Listener onNewNotification = args -> {
        Log.d(TAG, "===== onNewNotification CALLED =====");
        Log.d(TAG, "onNewNotification args count: " + args.length);
        
        if (args.length == 0) {
            Log.w(TAG, "onNewNotification: No arguments received!");
            return;
        }
        
        try {
            for (int i = 0; i < args.length; i++) {
                Object arg = args[i];
                Log.d(TAG, "onNewNotification arg[" + i + "] type: " + (arg != null ? arg.getClass().getSimpleName() : "null"));
                Log.d(TAG, "onNewNotification arg[" + i + "] value: " + arg);
            }

            Object firstArg = args[0];
            JSONObject obj;
            
            if (firstArg instanceof JSONObject) {
                obj = (JSONObject) firstArg;
                Log.d(TAG, "Argument is already JSONObject");
            } else if (firstArg instanceof String) {
                Log.d(TAG, "Argument is String, parsing to JSONObject");
                obj = new JSONObject((String) firstArg);
            } else {
                Log.d(TAG, "Argument type: " + firstArg.getClass().getSimpleName());
                obj = new JSONObject(firstArg.toString());
            }
            
            Log.d(TAG, "Parsed JSONObject: " + obj.toString());
            
            String type = obj.optString("type", "info");
            String shelf = obj.optString("shelf_id", "");
            String message = obj.optString("message", "Bạn có thông báo mới");
            
            Log.d(TAG, "Extracted - type: " + type + ", shelf_id: " + shelf + ", message: " + message);
            
            String title = shelf.isEmpty() ? type : (type + " | Shelf " + shelf);
            
            Log.d(TAG, "Creating notification with title: " + title + ", body: " + message);

            Intent tap = new Intent(this, NotificationRouterActivity.class);
            Iterator<String> it = obj.keys();
            while (it.hasNext()) {
                String k = it.next();
                String v = obj.optString(k, "");
                tap.putExtra(k, v);
                Log.d(TAG, "Added extra: " + k + " = " + v);
            }
            
            Log.d(TAG, "Calling NotificationHelper.show()...");
            NotificationHelper.show(this, title, message, tap);
            Log.d(TAG, "NotificationHelper.show() completed");
            
        } catch (Exception e) {
            Log.e(TAG, "onNewNotification parse error", e);
            e.printStackTrace();
        }
    };

    private void createFgChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    FG_CH, "Realtime Socket", NotificationManager.IMPORTANCE_MIN);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private Notification buildOngoing(String text) {
        int iconRes = R.drawable.ic_stat_notify;
        try {
            getResources().getDrawable(iconRes);
        } catch (Exception e) {
            iconRes = android.R.drawable.ic_dialog_info;
        }

        return new NotificationCompat.Builder(this, FG_CH)
                .setSmallIcon(iconRes)
                .setContentTitle("IOT Realtime")
                .setContentText(text)
                .setOngoing(true)
                .build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand");
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy");
        if (mSocket != null) {
            mSocket.off("new-notification", onNewNotification);
            mSocket.disconnect();
            mSocket.close();
        }
        isConnected = false;
        broadcastStatus(false);
        super.onDestroy();
    }

    public static boolean socketConnected() {
        return isConnected;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
