// NotificationHelper.java
package com.example.iot_employee_android;

import android.annotation.SuppressLint;
import android.app.*;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.concurrent.atomic.AtomicInteger;

public class NotificationHelper {
    private static final String ALERT_CH = "alerts";
    private static final AtomicInteger ID = new AtomicInteger(1000);
    private static final String TAG = "NotificationHelper";

    @SuppressLint("MissingPermission")
    public static void show(Context ctx, String title, String message, Intent tapIntent) {
        Log.d(TAG, "show() title=" + title + " message=" + message);
        createChannel(ctx);

        // kiểm tra quyền trên Android 13+
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            if (ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "POST_NOTIFICATIONS not granted - skipping notify");
                return;
            }
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, tapIntent, flags);

        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        int icon = R.drawable.ic_stat_notify;
        // fallback nếu icon không tồn tại
        try {
            ctx.getResources().getDrawable(icon);
        } catch (Exception e) {
            icon = android.R.drawable.ic_dialog_info;
            Log.w(TAG, "ic_stat_notify not found, using fallback icon");
        }

        Notification n = new NotificationCompat.Builder(ctx, ALERT_CH)
                .setSmallIcon(icon)
                .setContentTitle(title != null ? title : "Thông báo")
                .setContentText(message != null ? message : "Bạn có thông báo mới")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setSound(sound)
                .setContentIntent(pi)
                .build();

        NotificationManagerCompat.from(ctx).notify(ID.getAndIncrement(), n);
        Log.d(TAG, "notify() posted id=" + ID.get());
    }

    private static void createChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    ALERT_CH, "Alerts", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Kênh cảnh báo realtime");
            ctx.getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
    }
}
