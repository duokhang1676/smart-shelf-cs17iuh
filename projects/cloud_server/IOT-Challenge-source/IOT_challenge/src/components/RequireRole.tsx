import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Snackbar, Alert } from "@mui/material";

const RequireRole: React.FC<React.PropsWithChildren<{ allowedRoles?: string[] }>> = ({
  children,
  allowedRoles = ["admin", "manager"],
}) => {
  // keep useLocation uncasted to avoid TS conversion issues
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state: any) => state.user && state.user.user);

  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [severity, setSeverity] = useState<"error" | "warning">("error");

  useEffect(() => {
    // not logged in -> show snackbar then redirect to /login, preserve attempted pathname
    if (!user) {
      setMsg("Vui lòng đăng nhập để truy cập");
      setSeverity("warning");
      setOpen(true);
      const t = setTimeout(() => {
        navigate("/login", { state: { from: { pathname: location.pathname } }, replace: true });
      }, 1200);
      return () => clearTimeout(t);
    }

    // logged in but not allowed -> show snackbar then redirect to /login
    const role = (user?.role || "").toString().toLowerCase();
    if (!allowedRoles.includes(role)) {
      setMsg("Bạn không có quyền truy cập");
      setSeverity("error");
      setOpen(true);
      const t = setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
      return () => clearTimeout(t);
    }
    // allowed => render children
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, allowedRoles, navigate, location.pathname]);

  const role = (user?.role || "").toString().toLowerCase();
  const allowed = Boolean(user && allowedRoles.includes(role));
  if (allowed) return <>{children}</>;

  return (
    <>
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setOpen(false)} severity={severity} sx={{ width: "100%" }}>
          {msg}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RequireRole;