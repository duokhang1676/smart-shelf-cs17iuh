package com.example.iot_employee_android.model;

public class ProductChange {
    public Product product;
    public int preQuantity;
    public int postQuantity;

    public ProductChange(Product product, int preQuantity, int postQuantity) {
        this.product = product;
        this.preQuantity = preQuantity;
        this.postQuantity = postQuantity;
    }
}