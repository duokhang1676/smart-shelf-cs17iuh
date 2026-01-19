import React, { useEffect, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import NotificationBell from "./NotificationBell";
import { logout } from "../store/user.actions";
import HomeIcon from '@mui/icons-material/Home';
import { Dashboard } from "@mui/icons-material";

const HeaderBar: React.FC = () => {
  const [editingShelf, setEditingShelf] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openNoAccess, setOpenNoAccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const user = useSelector((state: RootState) => state.user.user);
  const isLoggedIn = Boolean(user);

  const dispatch = useDispatch();

  useEffect(() => {
    // nếu chưa đăng nhập => vào /login
    if (!isLoggedIn) {
      if (location.pathname !== "/login") navigate("/login");
      return;
    }

    // nếu đã login nhưng không phải admin/manager => show snackbar (không redirect)
    const role = (user?.role || "").toString().toLowerCase();
    const allowed = role === "admin" || role === "manager";
    if (!allowed) {
      setOpenNoAccess(true);
    }
  }, [isLoggedIn, user?.role, navigate, location.pathname]);

  const handleCloseNoAccess = (_?: any, reason?: string) => {
    if (reason === "clickaway") return;
    setOpenNoAccess(false);
  };

  const handleMenuOpen = (e: React.MouseEvent, id: number) => {
    setEditingShelf(id);
  };

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
            <Button color="inherit" onClick={() => navigate("/")} sx={{ ml: 2 }}>
              <Dashboard />
            </Button>
            <Button color="inherit" onClick={() => navigate("/shelf")} sx={{ ml: 2 }}>
              Quản lý kệ
            </Button>
            <Button color="inherit" onClick={() => navigate("/products")} sx={{ ml: 2 }}>
              Sản phẩm
            </Button>
            <Button color="inherit" onClick={() => navigate("/combo")} sx={{ ml: 2 }}>
              Combo
            </Button>
            <Button color="inherit" onClick={() => navigate("/receipts")} sx={{ ml: 2 }}>
              Hóa đơn
            </Button>
            <Button color="inherit" onClick={() => navigate("/users")} sx={{ ml: 2 }}>
              Nhân sự
            </Button>
            <Button color="inherit" onClick={() => navigate("/history")} sx={{ ml: 2 }}>
              Lịch sử
            </Button>
            <Button color="inherit" onClick={() => navigate("/posters")} sx={{ ml: 2 }}>
              Posters
            </Button>

            <Box sx={{ ml: "auto" }}>
              {isLoggedIn ? (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <NotificationBell />
                  <Typography>{user?.fullName}</Typography>
                  <Button
                    color="inherit"
                    onClick={() => {
                      dispatch(logout() as any);
                      navigate("/login");
                    }}
                    sx={{ ml: 2 }}
                  >
                    Đăng xuất
                  </Button>
                </Box>
              ) : (
                <Button color="inherit" onClick={() => navigate("/login")} sx={{ ml: 2 }}>
                  Đăng nhập
                </Button>
              )}
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Snackbar
        open={openNoAccess}
        autoHideDuration={4000}
        onClose={handleCloseNoAccess}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseNoAccess} severity="error" sx={{ width: "100%" }}>
          Bạn không có quyền truy cập
        </Alert>
      </Snackbar>

      <Box sx={{ pt: "64px" }} />
    </>
  );
};

export default HeaderBar;
