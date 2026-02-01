import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { getSepayConfig, SepayConfig, upsertSepayConfig } from "../service/sepayConfig.service";

const defaultConfig: SepayConfig = {
  vietqrAccountNo: "",
  vietqrAccountName: "",
  vietqrAcqId: "",
  sepayAuthToken: "",
  sepayBankAccountId: "",
};

const ConfigPage: React.FC = () => {
  // Default shelfId - có thể lấy từ localStorage, route params, hoặc user selection
  const [shelfId] = useState(() => {
    return localStorage.getItem("selectedShelfId") || "685aafc545619025a0bb9f27";
  });
  const [form, setForm] = useState<SepayConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const config = await getSepayConfig(shelfId, controller.signal);
        setForm(config || defaultConfig);
      } catch (err: any) {
        console.error("Failed to load Sepay config", err);
        setSnackbar({ open: true, message: "Không tải được cấu hình", severity: "error" });
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [shelfId]);

  const handleChange = (field: keyof SepayConfig) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        vietqrAccountNo: form.vietqrAccountNo,
        vietqrAccountName: form.vietqrAccountName,
        vietqrAcqId: form.vietqrAcqId,
        sepayAuthToken: form.sepayAuthToken,
        sepayBankAccountId: form.sepayBankAccountId,
      };
      const saved = await upsertSepayConfig(shelfId, payload);
      setForm(saved);
      setSnackbar({ open: true, message: "Đã lưu cấu hình Sepay", severity: "success" });
    } catch (err: any) {
      console.error("Failed to save Sepay config", err);
      const message = err?.response?.data?.error || "Lưu thất bại";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = useMemo(() => {
    return !form.vietqrAccountNo?.trim() || !form.vietqrAccountName?.trim() || !form.vietqrAcqId?.trim() || !form.sepayAuthToken?.trim() || !form.sepayBankAccountId?.trim();
  }, [form.vietqrAccountNo, form.vietqrAccountName, form.vietqrAcqId, form.sepayAuthToken, form.sepayBankAccountId]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <SettingsIcon />
          <Typography variant="h6">Cấu hình tài khoản Sepay</Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ md: 6 , sm: 12 }}>
            <TextField
              label="Số tài khoản"
              fullWidth
              required
              value={form.vietqrAccountNo}
              onChange={handleChange("vietqrAccountNo")}
            />
          </Grid>
          <Grid size={{ md: 6 , sm: 12 }}>
            <TextField
              label="Tên chủ tài khoản"
              fullWidth
              required
              value={form.vietqrAccountName}
              onChange={handleChange("vietqrAccountName")}
            />
          </Grid>
          <Grid size={{ md: 6 , sm: 12 }}>
            <TextField
              label="Đầu số thẻ của ngân hàng"
              fullWidth
              required
              value={form.vietqrAcqId}
              onChange={handleChange("vietqrAcqId")}
            />
          </Grid>
          <Grid size={{ md: 6 , sm: 12 }}>
            <TextField
              label="API Token"
              fullWidth
              required
              value={form.sepayAuthToken}
              onChange={handleChange("sepayAuthToken")}
            />
          </Grid>
          <Grid size={{ md: 12 }}>
            <TextField
              label="ID Token"
              fullWidth
              required
              value={form.sepayBankAccountId}
              onChange={handleChange("sepayBankAccountId")}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={handleSubmit}
            disabled={saving || isDisabled}
          >
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ConfigPage;
