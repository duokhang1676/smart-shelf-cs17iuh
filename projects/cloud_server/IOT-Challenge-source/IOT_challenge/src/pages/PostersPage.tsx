import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
  CardActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import posterService from "../service/poster.service";
import { Poster } from "../types/posterTypes";

export default function PostersPage() {
  const [items, setItems] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Poster | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await posterService.getPosters({ page: 1, limit: 1000 });
      if (resp && resp.success) setItems(resp.data || []);
      else setItems((resp as any)?.data || []);
    } catch (err) {
      console.error("Failed to load posters", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreview(url);
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [file]);

  const openCreate = () => {
    setEditing(null);
    setImageUrl("");
    setFile(null);
    setPreview("");
    setDialogOpen(true);
  };

  const openEdit = (p: Poster) => {
    setEditing(p);
    setImageUrl(p.image_url || "");
    setFile(null);
    setPreview(p.image_url || "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setImageUrl("");
    setFile(null);
    setPreview("");
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    setFile(f ?? null);
    // if user selects file, we clear manual URL input (but keep it if they remove file)
    if (f) setImageUrl("");
  };

  const handleSave = async () => {
    if (!file && !imageUrl) return alert("Vui lòng chọn file ảnh hoặc nhập Image URL");
    try {
      setSaving(true);
      if (file) {
        const fd = new FormData();
        fd.append("image", file);
        // if editing, use PATCH with FormData
        if (editing) {
          await posterService.updatePoster(editing._id, fd);
        } else {
          await posterService.createPoster(fd);
        }
      } else {
        // no file — use JSON payload (create or update)
        if (editing) {
          await posterService.updatePoster(editing._id, { image_url: imageUrl });
        } else {
          await posterService.createPoster({ image_url: imageUrl });
        }
      }
      await load();
      closeDialog();
    } catch (err: any) {
      console.error("Save poster error", err);
      alert(err?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xác nhận xóa poster?")) return;
    try {
      await posterService.deletePoster(id);
      await load();
    } catch (err: any) {
      console.error("Delete poster error", err);
      alert(err?.message || "Xóa thất bại");
    }
  };

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Quản lý Poster</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Thêm Poster
        </Button>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {items.map((p) => (
            <Grid size={3} key={p._id}>
              <Card>
                <CardMedia component="img" height="160" image={p.image_url} alt="poster" />
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(p.createdAt || "").toLocaleString?.() ?? ""}
                  </Typography>
                </CardContent>
                <CardActions>
                  <IconButton size="small" onClick={() => openEdit(p)} title="Sửa">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(p._id)} title="Xóa">
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Sửa Poster" : "Thêm Poster"}</DialogTitle>
        <DialogContent>
          <Box mt={1} mb={2}>
            <TextField
              label="Image URL (hoặc chọn file bên dưới)"
              fullWidth
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={!!file}
            />
          </Box>

          <Box mb={2}>
            <input
              id="poster-file"
              type="file"
              accept="image/*"
              onChange={onFileChange}
              style={{ display: "block", marginBottom: 8 }}
            />
            {file && (
              <Typography variant="caption" color="text.secondary">
                Chọn file: {file.name}
              </Typography>
            )}
          </Box>

          {preview ? (
            <Paper variant="outlined" sx={{ p: 1, textAlign: "center" }}>
              <img src={preview} alt="preview" style={{ maxHeight: 320, maxWidth: "100%" }} />
            </Paper>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Hủy</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}