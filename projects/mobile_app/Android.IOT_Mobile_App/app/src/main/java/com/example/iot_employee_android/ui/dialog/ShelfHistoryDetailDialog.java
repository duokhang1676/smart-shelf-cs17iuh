package com.example.iot_employee_android.ui.dialog;

import android.app.AlertDialog;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.example.iot_employee_android.R;
import com.example.iot_employee_android.model.Product;
import com.example.iot_employee_android.model.ShelfHistoryRecord;

import java.util.List;

public class ShelfHistoryDetailDialog {
    private final AlertDialog dialog;

    public ShelfHistoryDetailDialog(Context ctx, ShelfHistoryRecord record) {
        View v = LayoutInflater.from(ctx).inflate(R.layout.dialog_shelf_history_detail, null);
        TextView txtTitle = v.findViewById(R.id.txtDialogShelfTitle);
        TextView txtUser = v.findViewById(R.id.txtDialogUser);
        TextView txtNotes = v.findViewById(R.id.txtDialogNotes);
        TextView txtCounts = v.findViewById(R.id.txtDialogCounts);
        TextView txtPrePost = v.findViewById(R.id.txtDialogPrePost);
        LinearLayout llProducts = v.findViewById(R.id.llProducts);
        LinearLayout llNewProducts = v.findViewById(R.id.llNewProducts);

        String shelfName = (record.shelf != null&& record.shelf.shelf_name != null)
                ? record.shelf.shelf_name
                : "Kệ";
        String shelfId = (record.shelf != null && record.shelf.shelf_id != null)
                ? record.shelf.shelf_id
                : "";

        txtTitle.setText("Lịch sử - " + shelfName + " (" + shelfId + ")");
        txtUser.setText("Người thao tác: "
                + (record.user != null ? (record.user.fullName != null ? record.user.fullName : record.user.username)
                        : "Không rõ"));
        txtNotes.setText("Ghi chú: " + (record.notes != null && !record.notes.isEmpty() ? record.notes : "-"));
        txtCounts.setText("Số lượng (pre → post)");

        StringBuilder sb = new StringBuilder();
        List<Integer> pre = record.pre_verified_quantity;
        List<Integer> post = record.post_verified_quantity;
        int n = Math.max(pre == null ? 0 : pre.size(), post == null ? 0 : post.size());
        for (int i = 0; i < n; i++) {
            String ps = (pre != null && i < pre.size()) ? String.valueOf(pre.get(i)) : "-";
            String pt = (post != null && i < post.size()) ? String.valueOf(post.get(i)) : "-";
            sb.append(String.format("%d: %s → %s\n", i + 1, ps, pt));
        }
        txtPrePost.setText(sb.toString().trim());

        // products list: show product name + img url (text)
        llProducts.removeAllViews();
        if (record.pre_products != null && !record.pre_products.isEmpty()) {
            int index = 0;
            for (Product p : record.pre_products) {
                TextView t = new TextView(ctx);
                t.setText(index + ". PRE: " + (p.getProduct_name() != null ? p.getProduct_name() : p.get_id()));
                t.setPadding(0, 6, 0, 6);
                llProducts.addView(t);
            }
        }
        if (record.post_products != null && !record.post_products.isEmpty()) {
            int index = 0;
            for (Product p : record.post_products) {
                index++;
                TextView t = new TextView(ctx);
                t.setText(index + ". POST: " + (p.getProduct_name() != null ? p.getProduct_name() : p.get_id()));
                t.setPadding(0, 6, 0, 6);
                llNewProducts.addView(t);
            }
        }
        if ((record.pre_products == null || record.pre_products.isEmpty())
                && (record.post_products == null || record.post_products.isEmpty())) {
            TextView t = new TextView(ctx);
            t.setText("Không có sản phẩm");
            llProducts.addView(t);
        }

        dialog = new AlertDialog.Builder(ctx)
                .setView(v)
                .setPositiveButton("Đóng", (d, w) -> d.dismiss())
                .create();
    }

    public void show() {
        if (dialog != null)
            dialog.show();
    }
}