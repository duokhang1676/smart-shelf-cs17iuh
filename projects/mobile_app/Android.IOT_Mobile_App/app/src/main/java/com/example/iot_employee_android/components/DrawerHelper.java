package com.example.iot_employee_android.components;

import android.app.Activity;
import android.view.MenuItem;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.drawerlayout.widget.DrawerLayout;

import com.example.iot_employee_android.R;
import com.google.android.material.navigation.NavigationView;

public class DrawerHelper {
    public interface DrawerListener {
        boolean onDrawerMenuSelected(MenuItem item);
    }

    private final AppCompatActivity activity;
    private final DrawerLayout drawerLayout;
    private final Toolbar toolbar;
    private final NavigationView navigationView;
    private DrawerListener drawerListener;

    public DrawerHelper(AppCompatActivity activity, DrawerLayout drawerLayout, Toolbar toolbar, NavigationView navigationView) {
        this.activity = activity;
        this.drawerLayout = drawerLayout;
        this.toolbar = toolbar;
        this.navigationView = navigationView;
    }

    public void setup(DrawerListener listener) {
        this.drawerListener = listener;
        activity.setSupportActionBar(toolbar);

        androidx.appcompat.app.ActionBarDrawerToggle toggle = new androidx.appcompat.app.ActionBarDrawerToggle(
                activity, drawerLayout, toolbar,
                R.string.navigation_drawer_open, R.string.navigation_drawer_close);
        drawerLayout.addDrawerListener(toggle);
        toggle.syncState();

        navigationView.setNavigationItemSelectedListener(item -> {
            if (drawerListener != null && drawerListener.onDrawerMenuSelected(item)) {
                drawerLayout.closeDrawers();
                return true;
            }
            drawerLayout.closeDrawers();
            return false;
        });
    }

    // Xử lý menu options (ActionBar)
    public boolean handleOptions(MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.action_settings) {
            // Xử lý Settings
            return true;
        } else if (id == R.id.action_test_bluetooth) {
            // Xử lý Bluetooth
            // BluetoothHelper.testBluetooth(activity);
            return true;
        }
        return false;
    }
}