package com.example.iot_employee_android.model;

import java.util.List;

public class ShelfProductsResponse {
    private boolean success;
    private List<Product> products;
    private List<Product> data;
    private String message;

    // Getters and setters
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public List<Product> getProducts() { return products; }
    public void setProducts(List<Product> products) { this.products = products; }

    public List<Product> getData() { return data; }
    public void setData(List<Product> data) { this.data = data; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
