package com.example.iot_employee_android;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.iot_employee_android.adapter.ProductAdapter;
import com.example.iot_employee_android.api.ShelfApi;
import com.example.iot_employee_android.model.Product;
import com.example.iot_employee_android.model.Shelf;
import com.example.iot_employee_android.model.ShelfProductsResponse;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.navigation.NavigationView;
import com.google.android.material.snackbar.Snackbar;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class MainActivity extends BaseDrawerActivity {
    private final BroadcastReceiver socketStatusReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context ctx, Intent intent) {
            boolean connected = intent.getBooleanExtra(SocketService.EXTRA_SOCKET_CONNECTED, false);
            Log.d("MainActivity", "===== SOCKET STATUS BROADCAST RECEIVED =====");
            Log.d("MainActivity", "Socket status broadcast: connected=" + connected);
            Toast.makeText(MainActivity.this, "Realtime connected: " + connected, Toast.LENGTH_SHORT).show();
        }
    };

    // ====== UI ======
    private NavigationView navigationView;
    private DrawerLayout drawerLayout;
    private RecyclerView recyclerView;
    private ProductAdapter productAdapter;

    // ====== API ======
    private ShelfApi shelfApi;

    // ====== Const ======
    private static final int REQUEST_CAMERA_PERMISSION = 2001;
    private static final int REQUEST_CAMERA_CAPTURE = 1001;
    private static final int MENU_GROUP_SHELVES = 1001;

    private static final String TAG = "MainActivity";

    @SuppressLint("NewApi")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        if (!isLoggedIn()) {
            Intent loginIntent = new Intent(this, LoginActivity.class);
            startActivity(loginIntent);
            finish();
            return;
        }

        inflateContent(R.layout.content_main);
        setFABIcon(android.R.drawable.ic_menu_camera);

        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Danh sách kệ hàng");
        }
        binding.navView.setCheckedItem(R.id.nav_home);

        setupRetrofit();
        setupUI(); // chỉ start service 1 lần trong setupUI()
        loadAndRenderShelves();

        // register receiver to observe socket status
        IntentFilter f = new IntentFilter(SocketService.ACTION_SOCKET_STATUS);
        Log.d("MainActivity", "Registering socket status receiver with action: " + SocketService.ACTION_SOCKET_STATUS);
        registerReceiver(socketStatusReceiver, f, Context.RECEIVER_NOT_EXPORTED);

        // quick immediate check using static flag
        boolean now = SocketService.socketConnected();
        Log.d("MainActivity", "Immediate socketConnected() = " + now);
        Toast.makeText(this, "Realtime currently: " + now, Toast.LENGTH_SHORT).show();
    }

    private boolean isLoggedIn() {
        SharedPreferences prefs = getSharedPreferences("auth", MODE_PRIVATE);
        String token = prefs.getString("token", null);
        return token != null && !token.isEmpty();
    }

    private void setupRetrofit() {
        String baseUrl = getString(R.string.api_base_url);
        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(baseUrl)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        shelfApi = retrofit.create(ShelfApi.class);
    }

    // =========================================================
    // API: Tải danh sách kệ & render vào NavigationView
    // =========================================================
    @Override
    protected void loadAndRenderShelves() {
        // Gọi API lấy danh sách kệ
        shelfApi.getShelves().enqueue(new Callback<List<Shelf>>() {
            @Override
            public void onResponse(Call<List<Shelf>> call, Response<List<Shelf>> response) {
                Log.d(TAG, "getShelves() code=" + response.code());
                try {
                    if (response.isSuccessful() && response.body() != null) {
                        List<Shelf> shelves = response.body();
                        Log.d(TAG, "getShelves() body = " + new Gson().toJson(shelves));
                        renderShelvesToDrawer(shelves);
                    } else {
                        String err = response.errorBody() != null ? response.errorBody().string() : "null";
                        Log.e(TAG, "Failed to load shelves. errorBody=" + err);
                        snack("Không tải được kệ: lỗi server (" + response.code() + ")");
                        renderShelvesToDrawer(new ArrayList<>());
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Exception reading shelves response: " + e.getMessage());
                    snack("Lỗi khi đọc dữ liệu kệ.");
                    renderShelvesToDrawer(new ArrayList<>());
                }
            }

            @Override
            public void onFailure(Call<List<Shelf>> call, Throwable t) {
                Log.e(TAG, "API call failed: " + t.getMessage(), t);
                snack("Lỗi mạng khi tải kệ: " + t.getMessage());
                renderShelvesToDrawer(new ArrayList<>());
            }
        });
    }

    private void renderShelvesToDrawer(List<Shelf> shelves) {
        NavigationView navigationView = binding.navView;
        Menu menu = navigationView.getMenu();

        // Xóa nhóm kệ cũ nếu có
        menu.removeGroup(MENU_GROUP_SHELVES);

        if (shelves == null || shelves.isEmpty()) {
            // Hiện thông báo trong menu nếu không có kệ
            MenuItem item = menu.add(MENU_GROUP_SHELVES, Menu.NONE, Menu.NONE, "Không có kệ");
            item.setEnabled(false);
            Log.w(TAG, "No shelves to render");
            return;
        }

        // Thêm các shelf button vào menu
        for (int i = 0; i < shelves.size(); i++) {
            Shelf shelf = shelves.get(i);
            MenuItem item = menu.add(MENU_GROUP_SHELVES, Menu.NONE, i, shelf.shelf_name);
            item.setIcon(android.R.drawable.ic_menu_agenda);

            // Tạo Intent chứa thông tin shelf
            Intent shelfIntent = new Intent();
            shelfIntent.putExtra("shelf_id", shelf._id);
            shelfIntent.putExtra("shelf_name", shelf.shelf_name);
            item.setIntent(shelfIntent);

            // Mặc định chọn và hiển thị sản phẩm của shelf đầu tiên
            if (i == 0) {
                item.setCheckable(true);
                item.setChecked(true);

                // Cập nhật title
                if (getSupportActionBar() != null) {
                    getSupportActionBar().setTitle(shelf.shelf_name);
                }

                // Load sản phẩm của shelf đầu tiên
                loadProductsForShelf(shelf._id);
            }
        }
    }

    // =========================================================
    // API: Tải sản phẩm theo shelf_id & đổ lên RecyclerView
    // =========================================================
    private void loadProductsForShelf(String shelfId) {
        // Giả định có endpoint: GET /shelves/{id}/products -> ShelfProductsResponse
        shelfApi.getProductsByShelf(shelfId).enqueue(new Callback<ShelfProductsResponse>() {
            @Override
            public void onResponse(Call<ShelfProductsResponse> call, Response<ShelfProductsResponse> response) {
                if (!response.isSuccessful() || response.body() == null) {
                    snack("Không tải được sản phẩm của kệ.");
                    updateProductList(new ArrayList<>());
                    return;
                }

                List<Product> products = extractProducts(response.body());
                updateProductList(products);
            }

            @Override
            public void onFailure(Call<ShelfProductsResponse> call, Throwable t) {
                Log.e(TAG, "getShelfProducts() failed: " + t.getMessage());
                snack("Lỗi mạng khi tải sản phẩm kệ.");
                updateProductList(new ArrayList<>());
            }
        });
    }

    // Cố gắng bóc List<Product> từ mọi kiểu response thường gặp
    private List<Product> extractProducts(ShelfProductsResponse body) {
        try {
            Gson g = new Gson();
            JsonElement el = g.toJsonTree(body);

            Type listType = new TypeToken<List<Product>>() {
            }.getType();

            // Trường hợp API trả thẳng mảng
            if (el.isJsonArray()) {
                return g.fromJson(el, listType);
            }

            // Trường hợp là object có field "products" hoặc "data"
            if (el.isJsonObject()) {
                JsonObject obj = el.getAsJsonObject();
                if (obj.has("products") && obj.get("products").isJsonArray()) {
                    return g.fromJson(obj.get("products"), listType);
                }
                if (obj.has("data") && obj.get("data").isJsonArray()) {
                    return g.fromJson(obj.get("data"), listType);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "extractProducts error: " + e.getMessage());
        }
        return new ArrayList<>();
    }

    // Cập nhật RecyclerView (an toàn dù adapter không có setItems)
    private void updateProductList(List<Product> products) {
        if (recyclerView == null)
            return;
        productAdapter = new ProductAdapter(products != null ? products : new ArrayList<>());
        recyclerView.setAdapter(productAdapter);
    }

    // =========================================================
    // UI helper
    // =========================================================
    private void snack(String msg) {
        Snackbar.make(findViewById(android.R.id.content), msg, Snackbar.LENGTH_LONG).show();
    }

    // =========================================================
    // Setup UI components
    // =========================================================
    @SuppressLint("NewApi")
    private void setupUI() {
        // Di chuyển phần setup UI vào đây
        navigationView = findViewById(R.id.nav_view);
        drawerLayout = findViewById(R.id.drawer_layout);

        recyclerView = findViewById(R.id.recyclerViewShelf);
        if (recyclerView != null) {
            recyclerView.setLayoutManager(new GridLayoutManager(this, 5));
            productAdapter = new ProductAdapter(new ArrayList<>());
            recyclerView.setAdapter(productAdapter);
        }

        // Request permissions based on Android version
        requestCompatiblePermissions();

        // Start service with version compatibility - CHỈ 1 LẦN
        if (!SocketService.socketConnected()) {
            Log.d("MainActivity", "Starting SocketService...");
            startCompatibleSocketService();
        } else {
            Log.d("MainActivity", "SocketService already running and connected");
        }
    }

    private void requestCompatiblePermissions() {
        List<String> permissionsToRequest = new ArrayList<>();

        // Android 13+ (API 33): POST_NOTIFICATIONS
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
                != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }

        // Android 14+ (API 34): FOREGROUND_SERVICE_DATA_SYNC
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            if (ContextCompat.checkSelfPermission(this, "android.permission.FOREGROUND_SERVICE_DATA_SYNC") 
                != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add("android.permission.FOREGROUND_SERVICE_DATA_SYNC");
            }
        }

        // Request permissions if needed
        if (!permissionsToRequest.isEmpty()) {
            ActivityCompat.requestPermissions(this, 
                permissionsToRequest.toArray(new String[0]), 1001);
        }

        // Battery optimization (Android 6+)
        requestBatteryOptimizationExemption();
    }

    private void requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                } catch (Exception e) {
                    Log.w(TAG, "Cannot request battery optimization exemption: " + e.getMessage());
                }
            }
        }
    }

    private void startCompatibleSocketService() {
        Intent serviceIntent = new Intent(this, SocketService.class);
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Android 8+ requires foreground service
                startForegroundService(serviceIntent);
            } else {
                // Android 7.1 and below
                startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start SocketService: " + e.getMessage());
            Toast.makeText(this, "Không thể khởi động dịch vụ realtime", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == 1001) {
            for (int i = 0; i < permissions.length; i++) {
                if (permissions[i].equals(Manifest.permission.POST_NOTIFICATIONS)) {
                    if (grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                        Log.d(TAG, "POST_NOTIFICATIONS permission granted");
                    } else {
                        Log.w(TAG, "POST_NOTIFICATIONS permission denied");
                        Toast.makeText(this, "Cần cấp quyền thông báo để nhận tin realtime", Toast.LENGTH_LONG).show();
                    }
                }
            }
        }
    }

    @Override
    protected boolean onDrawerItemSelected(MenuItem item) {
        // Xử lý nhóm kệ động
        if (item.getGroupId() == MENU_GROUP_SHELVES) {
            Intent data = item.getIntent();
            if (data != null) {
                String shelfId = data.getStringExtra("_id");
                String shelfName = data.getStringExtra("shelf_name");

                item.setCheckable(true);
                item.setChecked(true);

                if (getSupportActionBar() != null) {
                    getSupportActionBar().setTitle(shelfName);
                }

                loadProductsForShelf(shelfId);
            }
            return true;
        }
        return false;
    }

    @Override
    protected void onImageCaptured(Bitmap bitmap) {
        super.onImageCaptured(bitmap);
        // Xử lý bitmap ở MainActivity
        android.widget.Toast.makeText(this, "Đang xử lý ảnh sản phẩm...", android.widget.Toast.LENGTH_SHORT).show();
        // TODO: Gửi bitmap lên API để nhận diện sản phẩm

        // Ví dụ: convert bitmap thành base64 để gửi API
        // String base64Image = convertBitmapToBase64(bitmap);
    }

    @Override
    protected void onDestroy() {
        try { unregisterReceiver(socketStatusReceiver); } catch (Exception ignored) {}
        super.onDestroy();
    }
}
