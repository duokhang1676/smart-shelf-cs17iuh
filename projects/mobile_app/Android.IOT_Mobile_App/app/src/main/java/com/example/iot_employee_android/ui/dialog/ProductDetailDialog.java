package com.example.iot_employee_android.ui.dialog;

import android.app.Dialog;
import android.content.Context;
import android.os.Bundle;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import com.bumptech.glide.Glide;
import com.example.iot_employee_android.R;
import com.example.iot_employee_android.model.Product;
import java.text.DecimalFormat;

public class ProductDetailDialog extends Dialog {
    private final Product product;
    private final int preQty;
    private final int postQty;

    public ProductDetailDialog(@NonNull Context context, Product product, int preQty, int postQty) {
        super(context);
        this.product = product;
        this.preQty = preQty;
        this.postQty = postQty;
    }

    public ProductDetailDialog(@NonNull Context context, Product product) {
        this(context, product, 0, 0);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.dialog_product_detail);
        setCancelable(true);

        ImageView imgProduct = findViewById(R.id.imgProduct);
        TextView txtProductName = findViewById(R.id.txtProductName);
        TextView txtPrice = findViewById(R.id.txtPrice);
        TextView txtWeight = findViewById(R.id.txtWeight);
        TextView txtQuantity = findViewById(R.id.txtQuantity);

        if (product != null) {
            txtProductName.setText(product.getProduct_name() != null ? product.getProduct_name() : "Không có tên");
            // Format price
            DecimalFormat df = new DecimalFormat("#,###");
            txtPrice.setText(product.getPrice() != 0 ? df.format(product.getPrice()) + " đ" : "Giá: -");
            txtWeight.setText(product.getWeight() != 0 ? product.getWeight() + " g" : "Cân nặng: -");

            // Số lượng: trước / sau / delta
            int delta = postQty - preQty;
            String qtyText = "Trước: " + preQty + "    Sau: " + postQty + "    Δ: " + delta;
            txtQuantity.setText(qtyText);

            // Load ảnh (Glide). Nếu không dùng Glide, thay bằng phương pháp khác.
            if (product.getImg_url() != null && !product.getImg_url().isEmpty()) {
                Glide.with(getContext())
                        .load(product.getImg_url())
                        .into(imgProduct);
            }
        }
    }
}