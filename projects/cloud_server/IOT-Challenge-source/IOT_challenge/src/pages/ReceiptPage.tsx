"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Grid,
} from "@mui/material";
import { Delete, Edit, RemoveRedEye, Search } from "@mui/icons-material";
import { fetchAllReceipts } from "../service/receipt.service";
import type {
  FetchAllOrderItem,
  OrderDetail,
  OrderDoc,
} from "../types/receiptTypes";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import DangerousIcon from '@mui/icons-material/Dangerous';

function getStatusColor(status: string): "success" | "warning" | "default" | "error" {
  const s = (status || "").toLowerCase();
  if (s === "paid" || s === "completed") return "success";
  if (s === "pending" || s === "processing") return "warning";
  if (s === "cancelled" || s === "refunded" || s === "unpaid") return "error";
  return "default";
}

function getStatusName(status: string): "Không xác định" | "Đã thanh toán" | "Không thanh toán" | "Đang chờ" | "Đã hủy" {
  const s = (status || "").toLowerCase();
  if (s === "paid" || s === "completed") return "Đã thanh toán";
  if (s === "pending" || s === "processing") return "Đang chờ";
  if (s === "unpaid" || s === "processing") return "Không thanh toán";
  if (s === "cancelled" || s === "refunded") return "Đã hủy";
  return "Không xác định";
}

function currency(n: number | string | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString(undefined, { minimumFractionDigits: 0 });
}

export default function ReceiptPage() {
  const [rows, setRows] = useState<FetchAllOrderItem[]>([]);
  const [filtered, setFiltered] = useState<FetchAllOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState(0); // 0 All, 1 Paid, 2 Pending, 3 Cancelled
  const [q, setQ] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [detailOpen, setDetailOpen] = useState(false);
  const [current, setCurrent] = useState<FetchAllOrderItem | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);

  // Fetch
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await fetchAllReceipts(controller.signal);
        const listRaw = resp?.success && Array.isArray(resp.data) ? resp.data : [];

        // Normalize API items into FetchAllOrderItem[] expected by the page
        const list: FetchAllOrderItem[] = listRaw.map((it: any) => {
          // already in {_doc, details} shape
          if (it._doc && Array.isArray(it.details)) return it as FetchAllOrderItem;

          // API returned { order, details } shape
          if (it.order) {
            return {
              _doc: it.order as OrderDoc,
              details: Array.isArray(it.details) ? it.details : [],
              // keep any extra metadata
              ...it,
            } as FetchAllOrderItem;
          }

          // fallback: try to coerce
          const doc = it.order ?? it._doc ?? it;
          return {
            _doc: doc as OrderDoc,
            details: Array.isArray(it.details) ? it.details : [],
          } as FetchAllOrderItem;
        });

        setRows(list);
        setFiltered(list);
      } catch (e: any) {
        setError(e?.message || "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  // Filter
  useEffect(() => {
    let result = rows.filter((it) => {
      const order: OrderDoc = it._doc;
      const details: OrderDetail[] = it.details ?? [];

      // Tab
      const st = (order.status || "").toLowerCase();
      if (tab === 1 && st !== "paid") return false;
      if (tab === 2 && st !== "unpaid") return false;
      if (tab === 3 && st !== "pending") return false;
      if (tab === 4 && !(st === "cancelled" || st === "refunded")) return false;

      // Search
      if (q) {
        const query = q.toLowerCase();
        const matchesOrder = String(order.order_code ?? order._id ?? "").toLowerCase().includes(query);
        const matchesProduct = details.some((d) => {
          const prod = d.product_id as any;
          const pname = typeof prod === "object" ? (prod?.product_name ?? prod?.name) : (d as any)?.product_name;
          return String(pname ?? "").toLowerCase().includes(query);
        });
        if (!(matchesOrder || matchesProduct)) return false;
      }

      return true;
    });

    setFiltered(result);
    setPage(0);
  }, [rows, tab, q]);

  const totalSales = useMemo(() => {
    return rows.reduce((sum, it) => {
      const o = it._doc;
      const amt = Number(o.total_bill ?? o.total ?? 0);
      const st = String(o.status || "").toLowerCase();
      return sum + (st === "cancelled" ? 0 : amt);
    }, 0);
  }, [rows]);

  const paidCount = useMemo(() => rows.filter((it) => (it._doc.status || "").toLowerCase() === "paid").length, [rows]);
  const unPaidCount = useMemo(() => rows.filter((it) => (it._doc.status || "").toLowerCase() === "unpaid").length, [rows]);
  const pendingCount = useMemo(() => rows.filter((it) => (it._doc.status || "").toLowerCase() === "pending").length, [rows]);

  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const openDetail = (item: FetchAllOrderItem) => {
    setCurrent(item);
    setDetailOpen(true);
  };

  const openDelete = (item: FetchAllOrderItem) => {
    setCurrent(item);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!current) return;
    const id = current._doc?._id;
    setRows((prev) => prev.filter((r) => r._doc?._id !== id));
    setDeleteOpen(false);
    setCurrent(null);
  };

  return (
    <Box p={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Quản lý hoá đơn</Typography>

        <Grid container spacing={2} sx={{ width: { xs: "100%", sm: "auto" } }}>
          <Grid size={4}>
            <Paper elevation={3} sx={{ display: "flex", alignItems: "center", gap: 2, p: 1.5, minWidth: 150 }}>
              <DangerousIcon sx={{ color: "error.main", fontSize: 30 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Không thanh toán</Typography>
                <Typography variant="h6" sx={{ mt: 0.3 }}>{unPaidCount}</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={4}>
            <Paper elevation={3} sx={{ display: "flex", alignItems: "center", gap: 2, p: 1.5, minWidth: 150 }}>
              <CheckCircleIcon sx={{ color: "success.main", fontSize: 30 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Đã thanh toán</Typography>
                <Typography variant="h6" sx={{ mt: 0.3 }}>{paidCount}</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={4}>
            <Paper elevation={3} sx={{ display: "flex", alignItems: "center", gap: 2, p: 1.5, minWidth: 150 }}>
              <HourglassTopIcon sx={{ color: "warning.main", fontSize: 30 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Đang chờ</Typography>
                <Typography variant="h6" sx={{ mt: 0.3 }}>{pendingCount}</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} mb={2}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flexShrink: 0 }}>
          <Tab label="Tất cả" />
          <Tab label="Đã thanh toán" />
          <Tab label="Không thanh toán" />
          <Tab label="Đang chờ" />
          <Tab label="Đã hủy" />
        </Tabs>
        <Box flex={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Tìm theo mã HĐ hoặc tên sản phẩm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Stack>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Mã HĐ</TableCell>
                <TableCell>Ngày</TableCell>
                <TableCell>Số mặt hàng</TableCell>
                <TableCell align="right">Tổng tiền</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6}>Đang tải…</TableCell>
                </TableRow>
              )}
              {error && !loading && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ color: "error.main" }}>{error}</TableCell>
                </TableRow>
              )}
              {!loading && !error && paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>Không có dữ liệu</TableCell>
                </TableRow>
              )}
              {paged.map((it) => {
                const o: OrderDoc = it._doc;
                const details: OrderDetail[] = it.details ?? [];
                const created = o.createdAt ? new Date(o.createdAt) : new Date();
                const total = Number(o.total_bill ?? o.total ?? details.reduce((s, d) => s + Number(d.total_price ?? (d.price ?? 0) * (d.quantity ?? 0)), 0));

                return (
                  <TableRow key={o._id} hover>
                    <TableCell>{o.order_code ?? o._id}</TableCell>
                    <TableCell>{created.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip size="small" label={`${details.length} mặt hàng`} />
                    </TableCell>
                    <TableCell align="right">{currency(total)} đ</TableCell>
                    <TableCell>
                      <Chip size="small" label={getStatusName(o.status)} color={getStatusColor(o.status)} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Xem">
                        <IconButton onClick={() => openDetail(it)}>
                          <RemoveRedEye fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* DETAIL DIALOG */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {current ? `Hóa đơn #${current._doc?.order_code ?? current._doc?._id}` : "Chi tiết hóa đơn"}
        </DialogTitle>
        <DialogContent dividers>
          {current && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Thông tin Order</Typography>

                    <Stack spacing={1}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">Mã HĐ</Typography>
                        <Typography variant="body2">{current._doc?.order_code ?? current._doc?._id}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">Order ID</Typography>
                        <Typography variant="body2">{current._doc?._id}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">Shelf ID</Typography>
                        <Typography variant="body2">{current._doc?.shelf_id ?? "—"}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">Tổng hoá đơn</Typography>
                        <Typography variant="body2">{currency(Number(current._doc?.total_bill ?? current._doc?.total ?? 0))} đ</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                        <Typography variant="body2">{getStatusName(current._doc?.status)}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
                        <Typography variant="body2">{current._doc?.createdAt ? new Date(current._doc.createdAt).toLocaleString() : "—"}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">Cập nhật</Typography>
                        <Typography variant="body2">{current._doc?.updatedAt ? new Date(current._doc.updatedAt).toLocaleString() : "—"}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid size={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Tóm tắt</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={`Tổng: ${currency(Number(current._doc?.total_bill ?? current._doc?.total ?? 0))} đ`} color="primary" size="small" />
                      <Chip label={`Mặt hàng: ${(current.details ?? []).length}`} size="small" />
                      <Chip label={getStatusName(current._doc?.status)} color={getStatusColor(current._doc?.status) as any} size="small" />
                    </Stack>

                    {/* Customer image (if provided) */}
                    <Box py={3}>
                      {current._doc?.customer_image && (
                        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                          <Box
                            component="img"
                            src={current._doc.customer_image}
                            alt="Customer"
                            sx={{
                              width: "100%",
                              maxWidth: 260,
                              maxHeight: 200,
                              objectFit: "contain",
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      )}
                    </Box>

                    {/* nếu cần: hiển thị thêm meta fields */}
                    <Box sx={{ mt: 2 }}>
                      {current._doc?.__v !== undefined && (
                        <Typography variant="caption" color="text.secondary">__v: {String(current._doc.__v)}</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              <Typography variant="subtitle1" sx={{ mb: 1 }}>Chi tiết mặt hàng</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sản phẩm</TableCell>
                      <TableCell align="right">Giá</TableCell>
                      <TableCell align="right">Số lượng</TableCell>
                      <TableCell align="right">Thành tiền</TableCell>
                      <TableCell>Ngày tạo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(current.details ?? []).map((d) => {
                      const prod = d.product_id as any;
                      const prodName = prod && typeof prod === "object" ? (prod.product_name ?? prod.name ?? prod._id) : (d as any).product_name ?? (d.product_id ?? "—");
                      const prodId = prod && typeof prod === "object" ? (prod._id ?? prod.product_id ?? "—") : (d.product_id ?? "—");
                      const price = Number(d.price ?? 0);
                      const qty = Number(d.quantity ?? 0);
                      const line = Number(d.total_price ?? price * qty);
                      return (
                        <TableRow key={d._id}>
                          <TableCell>{prodName}</TableCell>
                          <TableCell align="right">{currency(price)} đ</TableCell>
                          <TableCell align="right">{qty}</TableCell>
                          <TableCell align="right">{currency(line)} đ</TableCell>
                          <TableCell>{d.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Xoá hoá đơn</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn xoá hoá đơn {current?._doc?.order_code ?? current?._doc?._id}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Huỷ</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Xoá</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
