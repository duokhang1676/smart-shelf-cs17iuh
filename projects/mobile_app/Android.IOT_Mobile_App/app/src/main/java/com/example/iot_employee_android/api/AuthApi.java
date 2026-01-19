package com.example.iot_employee_android.api;

import com.example.iot_employee_android.model.LoginRequest;
import com.example.iot_employee_android.model.LoginResponse;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

public interface AuthApi {
    @POST("users/login")
    Call<LoginResponse> login(@Body LoginRequest request);
}
