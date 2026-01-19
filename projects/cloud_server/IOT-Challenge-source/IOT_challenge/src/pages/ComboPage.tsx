import React, { useEffect, useState } from "react";
import {
   Box,
   Container,
   Grid,
   Card,
   CardMedia,
   CardContent,
   Typography,
   CardActions,
   Button,
   Dialog,
   DialogTitle,
   DialogContent,
   DialogActions,
   Chip,
   Skeleton,
   TextField,
   Stack,
   Snackbar,
   Alert,
   IconButton,
 } from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import AddIcon from "@mui/icons-material/Add";
import * as comboService from "../service/combo.service";
import DeleteIcon from "@mui/icons-material/Delete";
import * as productService from "../service/product.service";
import EditIcon from "@mui/icons-material/Edit";
import type { Combo } from "../types/combo.type";
import type { Product } from "../types/selfTypes";

/**
 * Sample data adjusted to backend model (price, oldPrice)
 */
const sampleCombos: Partial<Combo>[] = [
];

export default function ComboPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [combos, setCombos] = useState<Combo[] | null>(null);
  const [selected, setSelected] = useState<Combo | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // create dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    oldPrice: "",
    productSkus: "",
    imageFile: null as File | null,
    validFrom: null as Date | null,
    validTo: null as Date | null,
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // edit dialog state
  const [editingComboId, setEditingComboId] = useState<string | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    oldPrice: "",
    validFrom: null as Date | null,
    validTo: null as Date | null,
    imageFile: null as File | null,
  });
  const [editSelectedProducts, setEditSelectedProducts] = useState<string[]>([]);

  const loadCombos = async () => {
    setLoading(true);
    try {
      const res = await comboService.fetchCombos({ page: 1, limit: 50 });
      const data = res?.data ?? [];
      setCombos(data.length ? data : (sampleCombos as Combo[]));
    } catch (err) {
      console.warn("Không lấy được combos từ API, dùng mẫu", err);
      setCombos(sampleCombos as Combo[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCombos();
    // load products for selection
    (async () => {
      try {
        const prods = await productService.fetchProducts();
        setAllProducts(prods);
      } catch (e) {
        console.warn("Không lấy được sản phẩm", e);
        setAllProducts([]);
      }
    })();
  }, []);

  const formatCurrency = (v?: number) =>
    (v ?? 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });

  const handleOpenCreate = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      oldPrice: "",
      productSkus: "",
      imageFile: null,
      validFrom: null,
      validTo: null,
    });
    setSelectedProducts([]);
    setOpenCreate(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    setForm((s) => ({ ...s, imageFile: f ?? null }));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.price) {
      setSnackbar({ open: true, message: "Vui lòng nhập tên và giá hiện tại", severity: "error" });
      return;
    }
    setCreating(true);
    try {
      // prepare FormData for multipart upload
      const formData = new FormData();
      formData.append("name", form.name);
      if (form.description) formData.append("description", form.description);
      formData.append("price", String(Number(form.price)));
      if (form.oldPrice) formData.append("oldPrice", String(Number(form.oldPrice)));
      // append selected product ids as products[] so backend parseProductsField handles it
      (selectedProducts.length ? selectedProducts : (form.productSkus ? form.productSkus.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean) : [])).forEach((pid) =>
        formData.append("products[]", pid)
      );
      if (form.validFrom) formData.append("validFrom", form.validFrom.toISOString());
      if (form.validTo) formData.append("validTo", form.validTo.toISOString());
      if (form.imageFile) {
        // backend expects field "image"
        formData.append("image", form.imageFile);
      }

      const created = await comboService.createCombo(formData);
      if (created) {
        setSnackbar({ open: true, message: "Tạo combo thành công", severity: "success" });
        // refresh list
        await loadCombos();
        setOpenCreate(false);
      } else {
        setSnackbar({ open: true, message: "Tạo combo thất bại", severity: "error" });
      }
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Lỗi khi tạo combo", severity: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (c: Combo) => {
    setEditingComboId(String(c._id));
    setEditForm({
      name: c.name || "",
      description: c.description || "",
      price: String(c.price ?? ""),
      oldPrice: c.oldPrice !== undefined ? String(c.oldPrice) : "",
      validFrom: c.validFrom ? new Date(String(c.validFrom)) : null,
      validTo: c.validTo ? new Date(String(c.validTo)) : null,
      imageFile: null,
    });
    setEditSelectedProducts(Array.isArray(c.products) ? c.products.map((p: any) => (typeof p === "string" ? p : p._id)) : []);
    setOpenEdit(true);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setEditForm((s) => ({ ...s, imageFile: f }));
    if (e.currentTarget) e.currentTarget.value = "";
  };

  const handleUpdate = async () => {
    if (!editingComboId) return;
    try {
      const fd = new FormData();
      fd.append("name", editForm.name);
      if (editForm.description) fd.append("description", editForm.description);
      fd.append("price", String(Number(editForm.price)));
      if (editForm.oldPrice) fd.append("oldPrice", String(Number(editForm.oldPrice)));
      if (editForm.validFrom) fd.append("validFrom", new Date(editForm.validFrom).toISOString());
      if (editForm.validTo) fd.append("validTo", new Date(editForm.validTo).toISOString());
      (editSelectedProducts || []).forEach((pid) => fd.append("products[]", pid));
      if (editForm.imageFile) fd.append("image", editForm.imageFile);

      await comboService.updateCombo(editingComboId, fd);
      setSnackbar({ open: true, message: "Cập nhật combo thành công", severity: "success" });
      await loadCombos();
      setOpenEdit(false);
      setEditingComboId(null);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Cập nhật thất bại", severity: "error" });
    }
  };

  // add delete handler
  const handleDeleteCombo = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa combo này?")) return;
    setDeleting(id);
    try {
      const ok = await comboService.deleteCombo(id);
      if (ok) {
        setSnackbar({ open: true, message: "Xóa combo thành công", severity: "success" });
        await loadCombos();
      } else {
        setSnackbar({ open: true, message: "Xóa combo thất bại", severity: "error" });
      }
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Lỗi khi xóa combo", severity: "error" });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">Combo sản phẩm</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Thêm combo
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography color="text.secondary">Danh sách các combo khuyến mãi. Nhấn vào "Xem" để xem chi tiết.</Typography>
      </Box>

      <Grid container spacing={3}>
        {loading && (!combos || combos.length === 0) ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Grid size={4} key={i}>
              <Card>
                <Skeleton variant="rectangular" height={160} />
                <CardContent>
                  <Skeleton width="60%" />
                  <Skeleton width="40%" />
                  <Skeleton width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (combos || []).length === 0 ? (
          <Grid size={12}>
            <Typography>Không có combo nào.</Typography>
          </Grid>
        ) : (
          combos!.map((c) => {
            // support both backend naming and older fields
            const currentPrice = Number((c as any).price ?? (c as any).price ?? 0);
            const originalPrice = (c as any).oldPrice ?? (c as any).oldPrice;
            const discount =
              originalPrice && originalPrice > 0 ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

            const productCount = (c as any).productSkus?.length ?? (c.products?.length ?? undefined);

            return (
              <Grid size={4} key={c._id ?? (c as any).externalId ?? c.name}>
                <Card>
                  {c.image ? <CardMedia component="img" height="160" image={c.image} alt={c.name} /> : <Box sx={{ height: 160, bgcolor: "grey.100" }} />}
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="h6">{c.name}</Typography>
                      {discount > 0 && <Chip label={`-${discount}%`} color="primary" size="small" />}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, minHeight: 42 }}>
                      {c.description}
                    </Typography>

                    <Box sx={{ display: "flex", gap: 1, alignItems: "baseline", mt: 2 }}>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(currentPrice)}
                      </Typography>
                      {originalPrice ? (
                        <Typography variant="body2" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                          {formatCurrency(originalPrice)}
                        </Typography>
                      ) : null}
                    </Box>

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      {productCount !== undefined ? `${productCount} sản phẩm` : "Số lượng sản phẩm không xác định"}
                    </Typography>

                    {/* ensure we only call Date constructor with string/number/Date */}
                    {((c as any).validFrom || (c as any).validTo) &&
                      (() => {
                        const vf = (c as any).validFrom ? new Date(String((c as any).validFrom)) : null;
                        const vt = (c as any).validTo ? new Date(String((c as any).validTo)) : null;
                        return (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {vf ? `Từ: ${vf.toLocaleDateString()}` : ""} {vt ? `Đến: ${vt.toLocaleDateString()}` : ""}
                          </Typography>
                        );
                      })()}
                  </CardContent>

                  <CardActions>
                    <IconButton
                      aria-label="sửa"
                      color="primary"
                      onClick={() => handleOpenEdit(c)}
                      title="Sửa combo"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      aria-label="xóa"
                      color="error"
                      onClick={() => handleDeleteCombo(String(c._id))}
                      disabled={deleting !== null}
                      title="Xóa combo"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* Create dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Tạo combo mới</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Tên combo" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} fullWidth />
            <TextField label="Mô tả" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} multiline rows={3} fullWidth />
            <TextField label="Giá hiện tại" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} type="number" fullWidth />
            <TextField label="Giá gốc (nếu có)" value={form.oldPrice} onChange={(e) => setForm((s) => ({ ...s, oldPrice: e.target.value }))} type="number" fullWidth />
            
            {/* product selector */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Chọn sản phẩm (có thể chọn nhiều)</Typography>
              <Box sx={{ maxHeight: 200, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
                {allProducts.length === 0 ? (
                  <Typography color="text.secondary">Không có sản phẩm</Typography>
                ) : (
                  allProducts.map((p) => {
                    const checked = selectedProducts.includes(String(p._id));
                    return (
                      <Box key={p._id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedProducts((s) => (e.target.checked ? [...s, String(p._id)] : s.filter((id) => id !== p._id)));
                          }}
                        />
                        <Box sx={{ ml: 1 }}>
                          <Typography variant="body2">{p.product_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.product_id}</Typography>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
              <Box sx={{ mt: 1 }}>
                {selectedProducts.map((id) => {
                  const p = allProducts.find((x) => x._id === id);
                  return p ? <Chip key={id} label={p.product_name} size="small" sx={{ mr: 0.5 }} /> : null;
                })}
              </Box>
            </Box>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <DatePicker
                  label="Ngày bắt đầu (từ)"
                  value={form.validFrom}
                  onChange={(d: Date | null) => setForm((s) => ({ ...s, validFrom: d }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
                <DatePicker
                  label="Ngày kết thúc (đến)"
                  value={form.validTo}
                  onChange={(d: Date | null) => setForm((s) => ({ ...s, validTo: d }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
            </LocalizationProvider>
            <Box>
              <input id="combo-image" type="file" accept="image/*" onChange={handleFileChange} />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)} disabled={creating}>
            Hủy
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? "Đang tạo..." : "Tạo"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Chi tiết Combo</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box>
              {selected.image && <Box component="img" src={selected.image} alt={selected.name} sx={{ width: "100%", borderRadius: 1, mb: 2 }} />}

              <Typography variant="h6">{selected.name}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {selected.description}
              </Typography>

              <Box sx={{ display: "flex", gap: 2, mt: 2, alignItems: "center" }}>
                <Typography variant="h6" color="primary">
                  {formatCurrency(Number((selected as any).price ?? (selected as any).price ?? 0))}
                </Typography>
                {(selected as any).oldPrice ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                    {formatCurrency(Number((selected as any).oldPrice))}
                  </Typography>
                ) : null}
                {(selected as any).oldPrice && (
                  <Chip
                    label={`-${Math.round(((Number((selected as any).oldPrice) - Number((selected as any).price ?? 0)) / Number((selected as any).oldPrice)) * 100)}%`}
                    color="primary"
                    size="small"
                  />
                )}
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Sản phẩm:</Typography>

                {((selected as any).productSkus && (selected as any).productSkus.length > 0) ? (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                    {(selected as any).productSkus.map((sku: string) => (
                      <Chip key={sku} label={sku} />
                    ))}
                  </Box>
                ) : (selected.products && selected.products.length > 0) ? (
                  <Box sx={{ mt: 1 }}>
                    {selected.products.map((p: any, i: number) => (
                      <Typography key={i} variant="body2">
                        {p.name ?? p.sku ?? String(p)}
                      </Typography>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Không có thông tin sản phẩm chi tiết
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2 }}>
          <Button onClick={() => setSelected(null)}>Đóng</Button>
        </Box>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
        <DialogTitle>Chỉnh sửa combo</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Tên combo" value={editForm.name} onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} fullWidth />
            <TextField label="Mô tả" value={editForm.description} onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))} multiline rows={3} fullWidth />
            <TextField label="Giá hiện tại" value={editForm.price} onChange={(e) => setEditForm((s) => ({ ...s, price: e.target.value }))} type="number" fullWidth />
            <TextField label="Giá gốc" value={editForm.oldPrice} onChange={(e) => setEditForm((s) => ({ ...s, oldPrice: e.target.value }))} type="number" fullWidth />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <DatePicker
                  label="Ngày bắt đầu"
                  value={editForm.validFrom}
                  onChange={(d: Date | null) => setEditForm((s) => ({ ...s, validFrom: d }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
                <DatePicker
                  label="Ngày kết thúc"
                  value={editForm.validTo}
                  onChange={(d: Date | null) => setEditForm((s) => ({ ...s, validTo: d }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
            </LocalizationProvider>

            {/* product selector (reuse allProducts) */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Chọn sản phẩm</Typography>
              <Box sx={{ maxHeight: 200, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
                {allProducts.map((p) => {
                  const checked = editSelectedProducts.includes(String(p._id));
                  return (
                    <Box key={p._id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setEditSelectedProducts((s) => (e.target.checked ? [...s, String(p._id  )] : s.filter((id) => id !== p._id)));
                        }}
                      />
                      <Box sx={{ ml: 1 }}>
                        <Typography variant="body2">{p.product_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.product_id}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box>
              <input id="edit-combo-image" type="file" accept="image/*" onChange={handleEditFileChange} />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleUpdate}>Lưu</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}