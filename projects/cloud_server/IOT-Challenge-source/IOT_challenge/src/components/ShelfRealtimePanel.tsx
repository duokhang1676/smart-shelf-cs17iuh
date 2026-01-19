import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Stack,
  Button,
  Divider,
  IconButton,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

type SensorData = {
  humidity?: number | null;
  temperature?: number | null;
  light?: number | null;
  pressure?: number | null;
  [k: string]: any;
};

type StatusData = {
  shelf_status_lean?: boolean | null;
  shelf_status_shake?: boolean | null;
  date_time?: string | null;
  [k: string]: any;
};

interface ShelfRealtimePanelProps {
  sensor?: SensorData | null;
  status?: StatusData | null;
  // if true, component will try to read fallback keys from localStorage
  useLocalStorageFallback?: boolean;
  sx?: any;
}

export default function ShelfRealtimePanel({
  sensor = null,
  status = null,
  useLocalStorageFallback = true,
  sx,
}: ShelfRealtimePanelProps) {
  const [s, setS] = useState<SensorData | null>(sensor ?? null);
  const [st, setSt] = useState<StatusData | null>(status ?? null);

  const loadFromLocal = () => {
    try {
      if (useLocalStorageFallback) {
        const lsSensor = localStorage.getItem("last_sensor") || localStorage.getItem("sensor_environment") || null;
        if (lsSensor) {
          try { setS(JSON.parse(lsSensor)); } catch { setS(null); }
        }
        const lsStatus = localStorage.getItem("last_status") || localStorage.getItem("shelf_status_data") || null;
        if (lsStatus) {
          try { setSt(JSON.parse(lsStatus)); } catch { setSt(null); }
        }
      }
    } catch (err) {
      console.warn("loadFromLocal error", err);
    }
  };

  useEffect(() => {
    if (sensor !== undefined && sensor !== null) setS(sensor);
    else if (useLocalStorageFallback) {
      const ls = localStorage.getItem("last_sensor") || localStorage.getItem("sensor_environment");
      if (ls) {
        try { setS(JSON.parse(ls)); } catch { setS(null); }
      } else setS(null);
    } else setS(null);

    if (status !== undefined && status !== null) setSt(status);
    else if (useLocalStorageFallback) {
      const ls = localStorage.getItem("last_status") || localStorage.getItem("shelf_status_data");
      if (ls) {
        try { setSt(JSON.parse(ls)); } catch { setSt(null); }
      } else setSt(null);
    } else setSt(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensor, status, useLocalStorageFallback]);

  const handleRefresh = () => {
    loadFromLocal();
  };

  const handleCopy = (obj: any) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    } catch {
      // noop
    }
  };

  return (
    <Paper sx={{ p: 2, ...sx }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Dữ liệu kệ hàng</Typography>
        <Stack direction="row" spacing={1}>
          <IconButton size="small" onClick={handleRefresh} title="Làm mới">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={6}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle2">Cảm biến môi trường</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {s ? (
                    <>
                      Nhiệt độ: <strong>{s.temperature ?? "—"}°C</strong> · Độ ẩm: <strong>{s.humidity ?? "—"}%</strong>
                    </>
                  ) : (
                    "Chưa có dữ liệu"
                  )}
                </Typography>
              </Box>

              <Stack alignItems="flex-end" spacing={0.5}>
                <Chip label={`Ánh sáng: ${s?.light ?? "—"}`} size="small" />
                <Chip label={`Áp suất: ${s?.pressure ?? "—"}`} size="small" />
                <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => handleCopy(s)} sx={{ mt: 0.5 }}>
                  Copy
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={6}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle2">Trạng thái kệ</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {st ? (
                    <>
                      Đổ: <strong>{st.shelf_status_lean ? "Yes" : "No"}</strong> · Rung: <strong>{st.shelf_status_shake ? "Yes" : "No"}</strong>
                    </>
                  ) : (
                    "Chưa có dữ liệu"
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {st?.date_time ? `Thời gian: ${st.date_time}` : ""}
                </Typography>
              </Box>

              <Stack alignItems="flex-end">
                <Chip label={st?.shelf_status_lean ? "NGHIÊNG" : "BÌNH THƯỜNG"} color={st?.shelf_status_lean ? "error" : "default"} size="small" />
                <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => handleCopy(st)} sx={{ mt: 0.5 }}>
                  Copy
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
}