package com.example.iot_employee_android.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.example.iot_employee_android.R;
import com.example.iot_employee_android.model.Shelf;
import java.util.ArrayList;
import java.util.List;

public class ShelfAdapter extends RecyclerView.Adapter<ShelfAdapter.Holder> {

    public interface OnShelfClickListener {
        void onShelfClick(Shelf shelf);
    }

    private final List<Shelf> items = new ArrayList<>();
    private final OnShelfClickListener listener;

    public ShelfAdapter(List<Shelf> initial, OnShelfClickListener listener) {
        if (initial != null) items.addAll(initial);
        this.listener = listener;
    }

    @NonNull
    @Override
    public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_shelf, parent, false);
        return new Holder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull Holder holder, int position) {
        Shelf s = items.get(position);
        holder.bind(s);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    public void updateData(List<Shelf> newData) {
        items.clear();
        if (newData != null) items.addAll(newData);
        notifyDataSetChanged();
    }

    class Holder extends RecyclerView.ViewHolder {
        TextView txtShelfName, txtShelfMeta;

        Holder(@NonNull View itemView) {
            super(itemView);
            txtShelfName = itemView.findViewById(R.id.txtShelfName);
            txtShelfMeta = itemView.findViewById(R.id.txtShelfMeta);
        }

        void bind(final Shelf shelf) {
            txtShelfName.setText(shelf != null && shelf.getShelf_name() != null ? shelf.getShelf_name() : "Kệ không tên");
            // tùy model: hiển thị mô tả/ngày/ID nếu có
            String meta = "";
            if (shelf != null) {
                if (shelf._id != "") meta += "ID: " + shelf.getShelf_id() + "  ";
            }
            txtShelfMeta.setText(meta);
            itemView.setOnClickListener(v -> {
                if (listener != null) listener.onShelfClick(shelf);
            });
        }
    }
}