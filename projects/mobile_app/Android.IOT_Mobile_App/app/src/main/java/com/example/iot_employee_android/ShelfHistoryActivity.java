package com.example.iot_employee_android;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.example.iot_employee_android.adapter.ShelfAdapter;
import com.example.iot_employee_android.adapter.ShelfHistoryAdapter;
import com.example.iot_employee_android.api.ShelfApi;
import com.example.iot_employee_android.components.DrawerHelper;
import com.example.iot_employee_android.model.Shelf;
import com.example.iot_employee_android.model.ShelfHistoryRecord;
import com.example.iot_employee_android.ui.dialog.ShelfHistoryDetailDialog;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.google.gson.JsonParser;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class ShelfHistoryActivity extends BaseDrawerActivity {
    private RecyclerView recyclerView;
    private ShelfHistoryAdapter adapter;
    private ShelfApi shelfApi;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        inflateContent(R.layout.content_shelf_history);
        
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Lịch sử các kệ hàng");
        }
        binding.navView.setCheckedItem(R.id.nav_shelf_history);

        setupRetrofit();
        setupRecyclerView();
        loadHistories();
    }
    
    // Gọi API lấy lịch sử (trong response có cấu trúc { success, data, meta })
    @SuppressWarnings({"unchecked", "rawtypes"})
    private void loadHistories() {
        // shelfApi.getShelfHistory() likely returns Call<ApiResponse<...>> but ApiResponse class missing,
        // cast the Call to Call<Object> and parse response body manually.
        Call<Object> call = (Call<Object>) (Call) shelfApi.getShelfHistory();
        call.enqueue(new Callback<Object>() {
            @Override
            public void onResponse(Call<Object> call, Response<Object> response) {
                if (response.isSuccessful() && response.body() != null) {
                    try {
                        Gson gson = new Gson();
                        JsonObject root = new JsonParser().parse(gson.toJson(response.body())).getAsJsonObject();
                        if (root.has("data") && root.get("data").isJsonArray()) {
                            Type listType = new TypeToken<List<ShelfHistoryRecord>>() {}.getType();
                            List<ShelfHistoryRecord> list = gson.fromJson(root.getAsJsonArray("data"), listType);
                            Log.d("ShelfHistoryActivity", "Loaded histories: " + list.size());
                            // Đổ dữ liệu lên RecyclerView
                            adapter.updateData(list);
                            // nếu muốn auto mở chi tiết đầu tiên, bỏ comment dòng dưới
                            // if (!list.isEmpty()) new ShelfHistoryDetailDialog(ShelfHistoryActivity.this, list.get(0)).show();
                        } else {
                            Log.e("ShelfHistoryActivity", "Response missing data array");
                        }
                    } catch (Exception e) {
                        Log.e("ShelfHistoryActivity", "Parse histories error", e);
                    }
                } else {
                    Log.e("ShelfHistoryActivity", "Failed to load histories");
                }
            }

            @Override
            public void onFailure(Call<Object> call, Throwable t) {
                Log.e("ShelfHistoryActivity", "API call failed: " + t.getMessage());
            }
        });
    }

    private void setupRetrofit() {
        String baseUrl = getString(R.string.api_base_url);
        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(baseUrl)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        shelfApi = retrofit.create(ShelfApi.class);
    }

    private void setupRecyclerView() {
        recyclerView = findViewById(R.id.recyclerViewHistory);
        if (recyclerView != null) {
            // Sử dụng LinearLayoutManager để hiển thị 1 dòng 1 cột
            recyclerView.setLayoutManager(new LinearLayoutManager(this, LinearLayoutManager.VERTICAL, false));
            // dùng adapter lịch sử và callback onHistoryClick
            adapter = new ShelfHistoryAdapter(new ArrayList<>(), this::onHistoryClick);
            recyclerView.setAdapter(adapter);
        }
    }

    private void onHistoryClick(ShelfHistoryRecord record) {
        // mở dialog chi tiết khi user bấm vào 1 bản ghi lịch sử
        ShelfHistoryDetailDialog dialog = new ShelfHistoryDetailDialog(this, record);
        dialog.show();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        // Sử dụng drawerHelper từ BaseDrawerActivity
        if (super.drawerHelper != null && super.drawerHelper.handleOptions(item)) return true;
        return super.onOptionsItemSelected(item);
    }

    @Override
    protected void loadAndRenderShelves() {
        startActivity(new Intent(this, MainActivity.class));
    }

    @Override
    protected boolean onDrawerItemSelected(MenuItem item) {
        return false;
    }
}
