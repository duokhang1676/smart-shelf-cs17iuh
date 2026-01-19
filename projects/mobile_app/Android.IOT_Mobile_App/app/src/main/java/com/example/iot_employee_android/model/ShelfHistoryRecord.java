package com.example.iot_employee_android.model;

import java.util.List;

public class ShelfHistoryRecord {
    public String createdAt;
    public String updatedAt;
    
    public ShelfSummary shelf; // Đổi từ List thành single object
    public String notes;
    
    public List<Product> pre_products;
    public List<Product> post_products;
    public List<Integer> pre_verified_quantity;
    public List<Integer> post_verified_quantity;

    public static class ShelfSummary {
        public String _id;
        public String shelf_id;
        public String shelf_name;
        public String location;
        public String mac_ip;
        public String qr;
        public List<String> user_id;
    }
    
    // Thêm User class để parse user info
    public User user;
    
    public static class User {
        public String _id;
        public String username;
        public String fullName;
        public String email;
        public String role;
        public String phone;
        public String avatar;
        public String address;
        public String dateOfBirth;
        public String gender;
        public boolean isActive;
        public boolean emailVerified;
        public String rfid;
    }
}