package com.example.iot_employee_android.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.example.iot_employee_android.R;
import com.example.iot_employee_android.model.Product;
import com.example.iot_employee_android.ui.dialog.ProductDetailDialog;

import java.util.ArrayList;
import java.util.List;

public class ProductAdapter extends RecyclerView.Adapter<ProductAdapter.ProductViewHolder> {
    private List<Product> productList;
    private final List<Product> items = new ArrayList<>();

    public ProductAdapter(List<Product> productList) {
        this.productList = productList;
    }

    public void setProducts(List<Product> products) {
        this.productList = products;
        notifyDataSetChanged();
    }

    public static class ProductViewHolder extends RecyclerView.ViewHolder {
        ImageView imageProduct;
        TextView textProductName, textProductPrice, textProductQuantity;

        public ProductViewHolder(@NonNull View itemView) {
            super(itemView);
            imageProduct = itemView.findViewById(R.id.imageProduct);
            textProductName = itemView.findViewById(R.id.textProductName);
            textProductPrice = itemView.findViewById(R.id.textProductPrice);
            textProductQuantity = itemView.findViewById(R.id.textProductQuantity);
        }
    }

    @NonNull
    @Override
    public ProductViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_product, parent, false); // Đảm bảo đúng layout
        return new ProductViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ProductViewHolder holder, int position) {
        Product product = productList.get(position);

        holder.textProductName.setText(product.getProduct_name());
        if (holder.textProductPrice != null) {
            holder.textProductPrice.setText(product.getPrice() + "đ");
        }
        if (holder.textProductQuantity != null) {
//            holder.textProductQuantity.setText("SL: " + product.quantity);
        }

        // Load ảnh nếu có
        if (product.getImg_url() != null && !product.getImg_url().isEmpty()) {
            // Sử dụng Glide hoặc Picasso để load ảnh
            Glide.with(holder.imageProduct.getContext())
                    .load(product.getImg_url())
                    .placeholder(R.drawable.ic_menu_gallery)
                    .into(holder.imageProduct);
        } else {
            holder.imageProduct.setImageResource(R.drawable.ic_launcher_background);
        }

        holder.itemView.setOnClickListener(v -> {
            new ProductDetailDialog(v.getContext(), productList.get(holder.getAdapterPosition())).show();
        });
    }

    public void setItems(List<Product> data) {
        items.clear();
        if (data != null)
            items.addAll(data);
        notifyDataSetChanged();
    }

    public Product getItem(int position) {
        return items.get(position);
    }

    @Override
    public int getItemCount() {
        return productList != null ? productList.size() : 0;
    }
}
