import React, { JSX, useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Chip,
  CircularProgress,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";

import historyService from "../service/history.service";

type HistoryItem = any;

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = async (p = page, l = limit) => {
    setLoading(true);
    try {
      const resp = await historyService.getHistories({ page: p + 1, limit: l });
      if (resp && resp.success) {
        setItems(resp.data || []);
        setTotal(resp.meta?.total ?? resp.data?.length ?? 0);
      } else if (Array.isArray((resp as any).data)) {
        // defensive fallback
        setItems((resp as any).data || []);
        setTotal((resp as any).meta?.total ?? (resp as any).data?.length ?? 0);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("Failed to load histories", err);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage);
    load(newPage, limit);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    setLimit(newLimit);
    setPage(0);
    load(0, newLimit);
  };

  const openDetail = (h: HistoryItem) => {
    setSelected(h);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelected(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xác nhận xóa bản ghi lịch sử này?")) return;
    try {
      const resp = await historyService.deleteHistory(id);
      // historyService throws on non-OK, but still check structure
      if (resp && (resp as any).success !== false) {
        load(page, limit);
      } else {
        alert((resp as any).message || "Xóa thất bại");
      }
    } catch (err: any) {
      console.error("Delete history error", err);
      alert(err?.message || "Lỗi khi xóa");
    }
  };

  const formatDate = (d: string | Date | undefined) => (d ? new Date(d).toLocaleString() : "—");

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Lịch sử thay đổi</Typography>
      </Stack>

      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Thời gian</TableCell>
                    <TableCell>Mã kệ</TableCell>
                    <TableCell>Người</TableCell>
                    <TableCell>Sản phẩm (pre → post)</TableCell>
                    <TableCell>Ghi chú</TableCell>
                    <TableCell align="right">Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it: HistoryItem) => {
                    const shelves = Array.isArray(it.shelf) ? it.shelf : it.shelf ? [it.shelf] : [];
                    const users = Array.isArray(it.user) ? it.user : it.user ? [it.user] : [];
                    const pre = Array.isArray(it.pre_products) ? it.pre_products : [];
                    const post = Array.isArray(it.post_products) ? it.post_products : [];
                    const preQ = Array.isArray(it.pre_verified_quantity) ? it.pre_verified_quantity : [];
                    const postQ = Array.isArray(it.post_verified_quantity) ? it.post_verified_quantity : [];
                    return (
                      <TableRow key={it._id}>
                        <TableCell>{formatDate(it.createdAt)}</TableCell>
                        <TableCell>
                          {shelves.length
                            ? shelves.map((s: any) => s.shelf_id ?? s._id ?? "").join(", ")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {users.length ? users.map((u: any) => u.fullName ?? u.username ?? u._id).join(", ") : "—"}
                        </TableCell>
                        <TableCell>
                          {pre.length || post.length ? (
                            <>
                              <Stack direction="row" spacing={1}>
                                <Chip label={`pre:${pre.length}`} size="small" />
                                <Chip label={`post:${post.length}`} size="small" />
                              </Stack>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{it.notes ?? "—"}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openDetail(it)} title="Xem chi tiết">
                            <VisibilityIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(it._id)} title="Xóa">
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={limit}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        )}
      </Paper>

      <Dialog open={detailOpen} onClose={closeDetail} maxWidth="md" fullWidth>
        <DialogTitle>Chi tiết lịch sử</DialogTitle>
        <DialogContent dividers>
          {selected ? (
            <Box>
              <Stack spacing={1} mb={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Thời gian</Typography>
                  <Typography variant="body2">{formatDate(selected.createdAt)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Kệ</Typography>
                  <Typography variant="body2">
                    {(Array.isArray(selected.shelf) ? selected.shelf : [selected.shelf]).map((s: any) => s?.shelf_id ?? s?._id ?? "").join(", ")}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Người</Typography>
                  <Typography variant="body2">
                    {(Array.isArray(selected.user) ? selected.user : [selected.user]).map((u: any) => u?.fullName ?? u?.username ?? u?._id ?? "").join(", ")}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Ghi chú</Typography>
                  <Typography variant="body2">{selected.notes ?? "—"}</Typography>
                </Box>
              </Stack>

              <Typography variant="subtitle2">Các sản phẩm trước / sau</Typography>
              <Box mt={1}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Sản phẩm (pre)</TableCell>
                      <TableCell>SL pre</TableCell>
                      <TableCell>Sản phẩm (post)</TableCell>
                      <TableCell>SL post</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const pre = Array.isArray(selected.pre_products) ? selected.pre_products : [];
                      const post = Array.isArray(selected.post_products) ? selected.post_products : [];
                      const preQ = Array.isArray(selected.pre_verified_quantity) ? selected.pre_verified_quantity : [];
                      const postQ = Array.isArray(selected.post_verified_quantity) ? selected.post_verified_quantity : [];
                      const maxLen = Math.max(pre.length, post.length, preQ.length, postQ.length);
                      const rows: JSX.Element[] = [];
                      for (let i = 0; i < maxLen; i++) {
                        rows.push(
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>{pre[i] ? (pre[i].product_name ?? pre[i].product_id ?? pre[i]._id ?? JSON.stringify(pre[i])) : "—"}</TableCell>
                            <TableCell>{preQ[i] ?? "—"}</TableCell>
                            <TableCell>{post[i] ? (post[i].product_name ?? post[i].product_id ?? post[i]._id ?? JSON.stringify(post[i])) : "—"}</TableCell>
                            <TableCell>{postQ[i] ?? "—"}</TableCell>
                          </TableRow>
                        );
                      }
                      return rows;
                    })()}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}