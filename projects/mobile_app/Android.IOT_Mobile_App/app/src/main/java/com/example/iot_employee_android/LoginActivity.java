package com.example.iot_employee_android;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.example.iot_employee_android.api.AuthApi;
import com.example.iot_employee_android.model.LoginRequest;
import com.example.iot_employee_android.model.LoginResponse;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class LoginActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Kiểm tra đã đăng nhập chưa
        SharedPreferences prefs = getSharedPreferences("auth", MODE_PRIVATE);
        String existingToken = prefs.getString("token", null);
        if (existingToken != null && !existingToken.isEmpty()) {
            // Đã đăng nhập, chuyển vào MainActivity
            Intent intent = new Intent(LoginActivity.this, MainActivity.class);
            startActivity(intent);
            finish();
            return;
        }
        
        setContentView(R.layout.activity_login);

        EditText editTextUsername = findViewById(R.id.editTextUsername);
        EditText editTextPassword = findViewById(R.id.editTextPassword);
        Button buttonLogin = findViewById(R.id.buttonLogin);

        buttonLogin.setOnClickListener(v -> {
            String username = editTextUsername.getText().toString().trim();
            String password = editTextPassword.getText().toString().trim();
            if (username.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Vui lòng nhập đầy đủ thông tin!", Toast.LENGTH_SHORT).show();
                return;
            }
            
            // Disable button để tránh click nhiều lần
            buttonLogin.setEnabled(false);
            
            // Gọi API đăng nhập
            String baseUrl = getString(R.string.api_base_url);
            Retrofit retrofit = new Retrofit.Builder()
                    .baseUrl(baseUrl)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build();
            AuthApi authApi = retrofit.create(AuthApi.class);
            LoginRequest request = new LoginRequest(username, password);
            authApi.login(request).enqueue(new Callback<LoginResponse>() {
                @Override
                public void onResponse(Call<LoginResponse> call, Response<LoginResponse> response) {
                    buttonLogin.setEnabled(true);
                    if (response.isSuccessful() && response.body() != null) {
                        // Lưu token vào SharedPreferences
                        SharedPreferences prefs = getSharedPreferences("auth", MODE_PRIVATE);
                        prefs.edit().putString("token", response.body().token).apply();
                        
                        Toast.makeText(LoginActivity.this, "Đăng nhập thành công!", Toast.LENGTH_SHORT).show();
                        
                        // Chuyển vào MainActivity
                        Intent intent = new Intent(LoginActivity.this, MainActivity.class);
                        startActivity(intent);
                        finish();
                    } else {
                        Toast.makeText(LoginActivity.this, "Đăng nhập thất bại!", Toast.LENGTH_SHORT).show();
                        Log.e("LOGIN", "Response: " + response.code());
                    }
                }
                @Override
                public void onFailure(Call<LoginResponse> call, Throwable t) {
                    buttonLogin.setEnabled(true);
                    Toast.makeText(LoginActivity.this, "Lỗi kết nối!", Toast.LENGTH_SHORT).show();
                    Log.e("LOGIN", "Error: " + t.getMessage());
                }
            });
        });
    }
}
