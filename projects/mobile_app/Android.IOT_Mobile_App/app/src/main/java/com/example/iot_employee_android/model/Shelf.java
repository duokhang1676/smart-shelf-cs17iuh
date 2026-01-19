package com.example.iot_employee_android.model;

public class Shelf {
    public String _id;
    public String shelf_id;
    public String shelf_name;
    public String location;
    
    // Getter methods
    public String get_id() { return _id; }
    public String getShelf_id() { return shelf_id; }
    public String getShelf_name() { return shelf_name; }
    public String getLocation() { return location; }
    
    // Setter methods
    public void set_id(String _id) { this._id = _id; }
    public void setShelf_id(String shelf_id) { this.shelf_id = shelf_id; }
    public void setShelf_name(String shelf_name) { this.shelf_name = shelf_name; }
    public void setLocation(String location) { this.location = location; }
}
