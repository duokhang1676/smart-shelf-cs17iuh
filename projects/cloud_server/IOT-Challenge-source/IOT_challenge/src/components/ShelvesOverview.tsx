import React, { useState } from "react";
import { Paper, Typography, Grid, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { Shelf } from "../types/selfTypes";
import { deleteShelf } from "../service/shefl.service";

interface ShelvesOverviewProps {
  shelves: Shelf[];
  activeShelfId: string;
  setActiveShelfId: (id: string) => void;
  onDeleted?: (id: string) => void; // optional callback so parent can refresh
}

const ShelvesOverview: React.FC<ShelvesOverviewProps> = ({
  shelves,
  activeShelfId,
  setActiveShelfId,
  onDeleted,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, shelfId: string) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc muốn xóa kệ này? Hành động không thể hoàn tác."))
      return;
    try {
      setDeletingId(shelfId);
      const ok = await deleteShelf(shelfId);
      if (ok) {
        alert("Xóa kệ thành công!");
        if (onDeleted) {
          onDeleted(shelfId);
        } else {
          // reload page to refresh list if parent didn't handle it
          window.location.reload();
        }
      } else {
        alert("Xóa kệ thất bại!");
      }
    } catch (err) {
      console.error("Xóa kệ thất bại", err);
      alert("Lỗi khi xóa kệ!");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Paper sx={{ mt: 2, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Tất cả kệ hàng
      </Typography>
      <Grid container spacing={2}>
        {shelves.map((shelf) => (
          <Grid size={4} key={shelf._id}>
            <Paper
              sx={{
                p: 2,
                position: "relative",
                border: shelf._id === activeShelfId ? 2 : 1,
                borderColor:
                  shelf._id === activeShelfId ? "primary.main" : "grey.300",
                cursor: "pointer",
              }}
              onClick={() => setActiveShelfId(shelf._id)}
            >
              <IconButton
                size="small"
                aria-label="xóa kệ"
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  color: "error.main",
                }}
                onClick={(e) => handleDelete(e, shelf._id)}
                disabled={deletingId === shelf._id}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>

              <Typography variant="subtitle1" fontWeight="bold">
                {shelf.shelf_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ngày & giờ tạo:{" "}
                {shelf.createdAt
                  ? new Date(shelf.createdAt).toLocaleString()
                  : ""}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default ShelvesOverview;
