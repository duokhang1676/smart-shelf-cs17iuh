package com.example.iot_employee_android.api;

import java.util.List;

public class ApiResponse<T> {
    private boolean success;
    private List<T> data;
    private Meta meta;

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public List<T> getData() { return data; }
    public void setData(List<T> data) { this.data = data; }

    public Meta getMeta() { return meta; }
    public void setMeta(Meta meta) { this.meta = meta; }

    public static class Meta {
        private int page;
        private int limit;
        private int total;

        public int getPage() { return page; }
        public void setPage(int page) { this.page = page; }

        public int getLimit() { return limit; }
        public void setLimit(int limit) { this.limit = limit; }

        public int getTotal() { return total; }
        public void setTotal(int total) { this.total = total; }
    }
}