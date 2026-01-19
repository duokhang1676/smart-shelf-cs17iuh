package com.example.iot_employee_android.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.example.iot_employee_android.model.ProductChange;
import java.util.ArrayList;
import java.util.List;

public class ProductChangeAdapter extends RecyclerView.Adapter<ProductChangeAdapter.VH> {
    private final List<ProductChange> items = new ArrayList<>();

    public void updateData(List<ProductChange> data) {
        items.clear();
        if (data != null) items.addAll(data);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
                .inflate(android.R.layout.simple_list_item_2, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        ProductChange pc = items.get(position);
        String title = pc.product != null && pc.product.getProduct_name() != null
                ? pc.product.getProduct_name() : "Sản phẩm không rõ";
        int pre = pc.preQuantity;
        int post = pc.postQuantity;
        int delta = post - pre;
        holder.title.setText(title);
        holder.subtitle.setText("Trước: " + pre + "  Sau: " + post + "  Δ: " + delta);
    }

    @Override
    public int getItemCount() { return items.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView title, subtitle;
        VH(@NonNull View v) {
            super(v);
            title = v.findViewById(android.R.id.text1);
            subtitle = v.findViewById(android.R.id.text2);
        }
    }
}