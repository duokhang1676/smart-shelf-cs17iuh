package com.example.iot_employee_android.model;

public class Product {
    private String _id;
    private String product_id;
    private String product_name;
    private int price;
    private String user_id;
    private String img_url;
    private int stock;
    private int weight;
    private String createdAt;
    private String updatedAt;
    private int max_quantity;
    private int discount;

    // Getters and setters
    public String get_id() { return _id; }
    public void set_id(String _id) { this._id = _id; }

    public String getProduct_id() { return product_id; }
    public void setProduct_id(String product_id) { this.product_id = product_id; }

    public String getProduct_name() { return product_name; }
    public void setProduct_name(String product_name) { this.product_name = product_name; }

    public int getPrice() { return price; }
    public void setPrice(int price) { this.price = price; }

    public String getUser_id() { return user_id; }
    public void setUser_id(String user_id) { this.user_id = user_id; }

    public String getImg_url() {
        if (img_url == null) return null;
        String trimmed = img_url.trim();
        if (trimmed.isEmpty()) return trimmed;
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        // đảm bảo chỉ nối một dấu '/' giữa domain và path
        String prefix = "http://ducdatphat.id.vn:3000";
        if (trimmed.startsWith("/")) {
            return prefix + trimmed;
        } else {
            return prefix + "/" + trimmed;
        }
    }

    public void setImg_url(String img_url) { this.img_url = img_url; }

    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }

    public int getWeight() { return weight; }
    public void setWeight(int weight) { this.weight = weight; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    public int getMax_quantity() { return max_quantity; }
    public void setMax_quantity(int max_quantity) { this.max_quantity = max_quantity; }

    public int getDiscount() { return discount; }
    public void setDiscount(int discount) { this.discount = discount; }
}
