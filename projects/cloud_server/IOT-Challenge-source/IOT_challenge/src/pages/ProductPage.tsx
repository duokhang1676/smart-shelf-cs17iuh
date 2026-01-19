// ProductPage.tsx
"use client";

import React from "react";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Snackbar,
  Alert,
  Fab,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  Sort as SortIcon,
} from "@mui/icons-material";
import { Product } from "../types/selfTypes";
import ProductItem from "../components/ProductItem";
import ProductDialog from "../components/ProductDialog";
import {
  fetchProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductById,
} from "../service/product.service";

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"product_name" | "price" | "createdAt">(
    "createdAt"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch dữ liệu 1 lần khi mount
  useEffect(() => {
    (async () => {
      try {
        const result = await fetchProducts();
        setProducts(result ?? []);
      } catch (e) {
        setProducts([]);
      }
    })();
  }, []);

  // Lọc + sắp xếp từ products (không tạo state phụ)
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Tìm kiếm
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((p) =>
        (p.product_name ?? "").toLowerCase().includes(q)
      );
    }

    // Sắp xếp
    result.sort((a, b) => {
      if (sortBy === "price") {
        const av = Number(a.price ?? 0);
        const bv = Number(b.price ?? 0);
        return sortDirection === "asc" ? av - bv : bv - av;
      } else if (sortBy === "createdAt") {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortDirection === "asc" ? ta - tb : tb - ta;
      } else {
        const va = String(a[sortBy] ?? "").toLowerCase();
        const vb = String(b[sortBy] ?? "").toLowerCase();
        return sortDirection === "asc"
          ? va.localeCompare(vb)
          : vb.localeCompare(va);
      }
    });

    return result;
  }, [products, searchTerm, sortBy, sortDirection]);

  // Mỗi khi bộ lọc thay đổi thì quay về trang 1
  useEffect(() => {
    setPage(0);
  }, [searchTerm, sortBy, sortDirection]);

  const handleAddProduct = () => {
    setCurrentProduct(null);
    setDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setCurrentProduct(product);
    setDialogOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setCurrentProduct(product);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!currentProduct) return;
    try {
      const id = currentProduct._id || currentProduct.product_id;
      await deleteProduct(id);
      setProducts((prev) =>
        prev.filter(
          (p) => (p._id ?? p.product_id) !== (currentProduct._id ?? currentProduct.product_id)
        )
      );
      setSnackbar({
        open: true,
        message: `${currentProduct.product_name} đã được xóa`,
        severity: "success",
      });
    } catch (err: any) {
      console.error("Delete product error", err);
      setSnackbar({
        open: true,
        message: err?.message || "Xóa sản phẩm thất bại",
        severity: "error",
      });
    } finally {
      setDeleteDialogOpen(false);
      setCurrentProduct(null);
    }
  };

  const handleSaveProduct = async (
    formData: Omit<Product, "createdAt" | "updatedAt">,
    file?: File
  ) => {
    // validate tối thiểu
    if (!formData.product_name || Number(formData.price) <= 0) {
      setSnackbar({
        open: true,
        message: "Vui lòng điền đầy đủ thông tin bắt buộc",
        severity: "error",
      });
      return;
    }

    try {
      if (currentProduct) {
        // --- UPDATE ---
        const id = currentProduct._id || currentProduct.product_id;
        const updated = await updateProduct(id, formData, file);

        setProducts(prev =>
          prev.map(p =>
            (p._id ?? p.product_id) === (updated._id ?? updated.product_id) ? updated : p
          )
        );

        setSnackbar({
          open: true,
          message: `${updated.product_name} đã được cập nhật`,
          severity: "success",
        });
      } else {
        // --- ADD ---
        // KHÔNG tự tạo product_id/img_url ở client. Gửi đúng dữ liệu người dùng nhập,
        // file (nếu có) sẽ gửi ở field "image" / "img_url" theo service.
        const toCreate: Product = {
          product_name: formData.product_name,
          price: Number(formData.price) || 0,
          stock: Number((formData as any).stock) || 0,
          weight: Number((formData as any).weight) || 0,
          max_quantity: Number((formData as any).max_quantity) || 0,
          discount: Number((formData as any).discount) || 0,
          // ĐỂ TRỐNG các field server sẽ sinh: _id / product_id / img_url...
        } as unknown as Product;

        // Tạo
        const created = await addProduct(toCreate, file);

        // LẤY LẠI BẢN CHUẨN HÓA CÓ PREFIX ẢNH (service getProductById đã xử lý IMG_PREFIX)
        const createdId = created?._id || created?.product_id;
        const normalized = createdId ? await getProductById(String(createdId)) : created;

        setProducts(prev => [...prev, (normalized ?? created)]);

        setSnackbar({
          open: true,
          message: `${(normalized ?? created)?.product_name || "Sản phẩm"} đã được thêm`,
          severity: "success",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: currentProduct ? "Cập nhật sản phẩm thất bại." : "Thêm sản phẩm thất bại.",
        severity: "error",
      });
    } finally {
      setDialogOpen(false);
    }
  };


  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSortChange = (column: "product_name" | "price" | "createdAt") => {
    if (sortBy === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box sx={{ py: 2, px: 3 }}>
        <Container maxWidth="xl">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h5" sx={{ ml: 2 }}>
              Quản lý sản phẩm
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddProduct}
              sx={{ fontWeight: "bold" }}
            >
              Thêm sản phẩm
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4, flexGrow: 1 }}>
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={6}>
              <TextField
                fullWidth
                placeholder="Tìm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm("")}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={4}>
              <FormControl fullWidth>
                <InputLabel>Sắp xếp</InputLabel>
                <Select
                  value={`${sortBy}-${sortDirection}`}
                  onChange={(e) => {
                    const [newSortBy, newSortDirection] = e.target.value.split(
                      "-"
                    ) as [
                        "product_name" | "price" | "createdAt",
                        "asc" | "desc"
                      ];
                    setSortBy(newSortBy);
                    setSortDirection(newSortDirection);
                  }}
                  label="Sắp xếp"
                >
                  <MenuItem value="product_name-asc">Tên (A-Z)</MenuItem>
                  <MenuItem value="product_name-desc">Tên (Z-A)</MenuItem>
                  <MenuItem value="price-asc">Giá (Tăng dần)</MenuItem>
                  <MenuItem value="price-desc">Giá (Giảm dần)</MenuItem>
                  <MenuItem value="createdAt-desc">Mới nhất</MenuItem>
                  <MenuItem value="createdAt-asc">Cũ nhất</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                disabled={!searchTerm}
              >
                Xóa
              </Button>
            </Grid>
            <Grid size={1}>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Tooltip
                  title={
                    viewMode === "grid"
                      ? "Chuyển sang danh sách"
                      : "Chuyển sang lưới"
                  }
                >
                  <IconButton
                    onClick={() =>
                      setViewMode(viewMode === "grid" ? "list" : "grid")
                    }
                  >
                    {viewMode === "grid" ? (
                      <ViewListIcon />
                    ) : (
                      <ViewModuleIcon />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Products Display */}
        {filteredProducts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
              Không tìm thấy sản phẩm
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
            </Typography>
          </Paper>
        ) : viewMode === "grid" ? (
          <Grid container spacing={3}>
            {filteredProducts
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((product) => (
                <Grid size={12} key={product._id ?? product.product_id}>
                  <ProductItem
                    product={product}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                  />
                </Grid>
              ))}
          </Grid>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Hình</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onClick={() => handleSortChange("product_name")}
                    >
                      Tên
                      {sortBy === "product_name" && (
                        <SortIcon
                          fontSize="small"
                          sx={{
                            ml: 0.5,
                            transform:
                              sortDirection === "desc"
                                ? "rotate(180deg)"
                                : "none",
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onClick={() => handleSortChange("price")}
                    >
                      Giá
                      {sortBy === "price" && (
                        <SortIcon
                          fontSize="small"
                          sx={{
                            ml: 0.5,
                            transform:
                              sortDirection === "desc"
                                ? "rotate(180deg)"
                                : "none",
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>Kho</TableCell>
                  <TableCell>Cân nặng</TableCell>
                  <TableCell>Số lượng tối đa</TableCell>
                  <TableCell>Khuyến mãi (%)</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((product) => (
                    <TableRow key={product._id ?? product.product_id}>
                      <TableCell>
                        <Box
                          component="img"
                          src={product.img_url}
                          alt={product.product_name}
                          sx={{ width: 60, height: 60, objectFit: "contain" }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {product.product_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {typeof product.price === "number"
                          ? `$${product.price.toFixed(2)}`
                          : product.price}
                      </TableCell>
                      <TableCell>{(product as any).stock ?? "-"}</TableCell>
                      <TableCell>{(product as any).weight ?? "-"}</TableCell>
                      <TableCell>
                        {(product as any).max_quantity ?? "-"}
                      </TableCell>
                      <TableCell>{(product as any).discount ?? "-"}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditProduct(product)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredProducts.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        )}

        {/* Pagination for Grid View */}
        {viewMode === "grid" && (
          <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
            <TablePagination
              rowsPerPageOptions={[8, 12, 24]}
              component="div"
              count={filteredProducts.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Box>
        )}
      </Container>

      {/* Add/Edit Product Dialog */}
      <ProductDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveProduct}
        product={currentProduct}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{currentProduct?.product_name}</strong>? This action cannot
            be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDeleteProduct}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Floating action button for mobile */}
      <Box
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          display: { xs: "block", md: "none" },
        }}
      >
        <Fab color="primary" onClick={handleAddProduct}>
          <AddIcon />
        </Fab>
      </Box>
    </Box>
  );
}
