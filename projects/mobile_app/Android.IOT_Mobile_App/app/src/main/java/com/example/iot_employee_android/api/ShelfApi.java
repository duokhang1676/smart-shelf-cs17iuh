package com.example.iot_employee_android.api;

import com.example.iot_employee_android.model.Shelf;
import com.example.iot_employee_android.model.ShelfHistoryEntry;
import com.example.iot_employee_android.model.ShelfProductsResponse;
import java.util.List;
import retrofit2.Call;
import retrofit2.http.GET;
import retrofit2.http.Path;

public interface ShelfApi {
    @GET("shelves")
    Call<List<Shelf>> getShelves();
    
    @GET("histories")
    Call<ApiResponse<ShelfHistoryEntry>> getShelfHistory();
    
    @GET("shelves/get-products/{id}")
    Call<ShelfProductsResponse> getProductsByShelf(@Path("id") String shelfId);
}
