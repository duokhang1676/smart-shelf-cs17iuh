package com.example.iot_employee_android.api;

import retrofit2.Call;
import retrofit2.http.GET;

public interface HealthApi {
    @GET("health")
    Call<HealthResponse> getHealth();

    class HealthResponse {
        public String status;
    }
}
