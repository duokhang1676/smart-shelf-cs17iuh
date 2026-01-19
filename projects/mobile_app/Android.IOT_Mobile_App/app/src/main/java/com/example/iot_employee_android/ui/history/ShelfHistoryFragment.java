package com.example.iot_employee_android.ui.history;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.iot_employee_android.R;
import com.example.iot_employee_android.adapter.ShelfHistoryAdapter;
import com.example.iot_employee_android.model.ShelfHistoryRecord;
import com.example.iot_employee_android.ui.dialog.ShelfHistoryDetailDialog;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

public class ShelfHistoryFragment extends Fragment {
    private RecyclerView recyclerView;
    private ShelfHistoryAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View root = inflater.inflate(R.layout.content_shelf_history, container, false);

        setupRecyclerView(root);

        // Example: nếu bạn có JSON response (ví dụ paste stringResponse) -> parse và update
        String stringResponse = null; // <-- TODO: gán JSON response ở đây (hoặc gọi API và khi nhận được, gọi parseAndShow(json))
        if (stringResponse != null) parseAndShow(stringResponse);
        // nếu không có JSON hiện tại, adapter giữ empty list

        return root;
    }

    private void setupRecyclerView(View root) {
        recyclerView = root.findViewById(R.id.recyclerViewHistory);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new ShelfHistoryAdapter(new ArrayList<>(), record -> {
            new ShelfHistoryDetailDialog(getContext(), record).show();
        });
        recyclerView.setAdapter(adapter);
    }

    // Parse API response (the JSON you pasted) and update adapter
    private void parseAndShow(String jsonResponse) {
        try {
            // use parser compatible with older Gson versions
            JsonObject root = new JsonParser().parse(jsonResponse).getAsJsonObject();
            if (root.has("data")) {
                Gson gson = new Gson();
                Type listType = new TypeToken<List<ShelfHistoryRecord>>() {}.getType();
                List<ShelfHistoryRecord> list = gson.fromJson(root.getAsJsonArray("data"), listType);
                adapter.updateData(list);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}