package com.example.iot_employee_android.model;

public class ShelfHistory {
    public String _id;
    public String productId;
    public String productName;
    public String productImageUrl;
    public String shelfId;
    public String shelfName;
    public int quantityAdded;
    public String dateTime;
    public String action; // "ADD", "REMOVE", "UPDATE"
    public String employeeName;

    public ShelfHistory() {}

    public ShelfHistory(String productName, String shelfName, int quantityAdded, String dateTime, String employeeName) {
        this.productName = productName;
        this.shelfName = shelfName;
        this.quantityAdded = quantityAdded;
        this.dateTime = dateTime;
        this.employeeName = employeeName;
        this.action = quantityAdded > 0 ? "ADD" : "REMOVE";
    }
}
