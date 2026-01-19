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
import com.example.iot_employee_android.model.ShelfHistoryRecord;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public class ShelfHistoryAdapter extends RecyclerView.Adapter<ShelfHistoryAdapter.Holder> {

    public interface OnItemClick {
        void onClick(ShelfHistoryRecord record);
    }

    private List<ShelfHistoryRecord> items;
    private final OnItemClick callback;

    public ShelfHistoryAdapter(List<ShelfHistoryRecord> items, OnItemClick callback) {
        this.items = items;
        this.callback = callback;
    }

    public void updateData(List<ShelfHistoryRecord> data) {
        this.items = data;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_shelf, parent, false);
        return new Holder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull Holder holder, int position) {
        holder.bind(items.get(position));
    }

    @Override
    public int getItemCount() {
        return items == null ? 0 : items.size();
    }

    class Holder extends RecyclerView.ViewHolder {
        ImageView imgShelf;
        TextView txtShelfName, txtShelfId, txtShelfLocation, txtDetails;

        Holder(@NonNull View itemView) {
            super(itemView);
            imgShelf = itemView.findViewById(R.id.imgShelf);
            txtShelfName = itemView.findViewById(R.id.txtShelfName);
            txtShelfId = itemView.findViewById(R.id.txtShelfId);
            txtShelfLocation = itemView.findViewById(R.id.txtShelfLocation);
            txtDetails = itemView.findViewById(R.id.txtShelfLocation); // reuse a text view or add new id in layout if needed
        }

        void bind(final ShelfHistoryRecord r) {
            ShelfHistoryRecord.ShelfSummary s = (r.shelf != null) ? r.shelf : null;
            txtShelfName.setText(s != null && s.shelf_name != null ? s.shelf_name : "Kệ");
            txtShelfId.setText(s != null && s.shelf_id != null ? "ID: " + s.shelf_id : "");
            txtShelfLocation.setText(s != null && s.location != null ? "Vị trí: " + s.location : "");

            // format ngày giờ sang múi giờ Việt Nam
            String metaDate = "";
            String iso = r.createdAt != null ? r.createdAt : "";
            if (!iso.isEmpty()) {
                // example input: 2025-09-09T05:05:09.574Z
                SimpleDateFormat parser = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                parser.setTimeZone(TimeZone.getTimeZone("UTC"));
                SimpleDateFormat formatter = new SimpleDateFormat("dd/MM/yyyy HH:mm", new Locale("vi", "VN"));
                formatter.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
                try {
                    Date d = parser.parse(iso);
                    if (d != null) metaDate = formatter.format(d);
                } catch (ParseException e) {
                    // fallback: use raw ISO date (or substring)
                    metaDate = iso.length() >= 16 ? iso.substring(0, 16).replace('T', ' ') : iso;
                }
            }
            String meta = metaDate;
            // đặt meta xuống txtShelfLocation (hoặc add view mới)
            txtShelfLocation.setText(txtShelfLocation.getText() + "\n" + meta);

            // optional: show thumbnail từ product đầu tiên
            Product thumbnail = (r.post_products != null && !r.post_products.isEmpty())
                    ? r.post_products.get(0)
                    : (r.pre_products != null && !r.pre_products.isEmpty() ? r.pre_products.get(0) : null);
            if (thumbnail != null && thumbnail.getImg_url() != null && !thumbnail.getImg_url().isEmpty()) {
                Glide.with(itemView.getContext())
                        .load(thumbnail.getImg_url())
                        .placeholder(R.drawable.ic_menu_gallery)
                        .into(imgShelf);
            } else {
                imgShelf.setImageResource(R.drawable.ic_menu_gallery);
            }

            itemView.setOnClickListener(v -> {
                if (callback != null) callback.onClick(r);
            });
        }
    }
}
