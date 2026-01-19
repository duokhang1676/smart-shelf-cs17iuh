package com.example.iot_employee_android.model;

import java.util.List;

public class ShelfHistoryEntry {
    private String _id;
    private String notes;
    private Shelf shelf;
    private User user;
    private List<Product> pre_products;
    private List<Product> post_products;
    private List<Integer> pre_verified_quantity;
    private List<Integer> post_verified_quantity;
    private String createdAt;
    private String updatedAt;

    // Getters and setters
    public String get_id() { return _id; }
    public void set_id(String _id) { this._id = _id; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Shelf getShelf() { return shelf; }
    public void setShelf(Shelf shelf) { this.shelf = shelf; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public List<Product> getPre_products() { return pre_products; }
    public void setPre_products(List<Product> pre_products) { this.pre_products = pre_products; }

    public List<Product> getPost_products() { return post_products; }
    public void setPost_products(List<Product> post_products) { this.post_products = post_products; }

    public List<Integer> getPre_verified_quantity() { return pre_verified_quantity; }
    public void setPre_verified_quantity(List<Integer> pre_verified_quantity) { this.pre_verified_quantity = pre_verified_quantity; }

    public List<Integer> getPost_verified_quantity() { return post_verified_quantity; }
    public void setPost_verified_quantity(List<Integer> post_verified_quantity) { this.post_verified_quantity = post_verified_quantity; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}