// NotificationRouterActivity.java
package com.example.iot_employee_android;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

public class NotificationRouterActivity extends AppCompatActivity {
    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String type = getIntent().getStringExtra("type");
        Intent next;
        if ("warning".equals(type)) {
            next = new Intent(this, ShelfHistoryActivity.class); // ví dụ
            next.putExtra("shelf_id", getIntent().getStringExtra("shelf_id"));
        } else {
            next = new Intent(this, MainActivity.class);
        }
        startActivity(next);
        finish();
    }
}
