"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Snackbar,
  Alert,
  Divider,
  Tooltip,
  Fab,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Avatar,
  Switch,
  FormControlLabel,
  Badge,
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AdminPanelSettings as AdminIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getUsers, updateUser } from "../service/user.service";
import { Gender, Role, User } from "../types/userTypes";

// Role theo BE mới
const roles: Role[] = ["admin", "manager", "employee"];
const genders: Gender[] = ["male", "female", "other"];

// Helper function to translate gender
const getGenderLabel = (gender: Gender) => {
  switch (gender) {
    case "male":
      return "Nam";
    case "female":
      return "Nữ";
    case "other":
      return "Khác";
    default:
      return "Khác";
  }
};

// Helper function to translate role
const getRoleLabel = (role: Role) => {
  switch (role) {
    case "admin":
      return "Quản trị viên";
    case "manager":
      return "Quản lý";
    case "employee":
      return "Nhân viên";
    default:
      return "Nhân viên";
  }
};

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [activeFilter, setActiveFilter] = useState<"" | "active" | "inactive">(
    ""
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state khớp BE
  const [formData, setFormData] = useState({
    _id: "",
    username: "",
    rfid: "",
    email: "",
    password: "", // required khi tạo mới
    fullName: "",
    phone: "",
    avatar: "",
    address: "",
    dateOfBirth: "", // "YYYY-MM-DD"
    gender: "other" as Gender,
    role: "employee" as Role,
    isActive: true,
    emailVerified: false,
  });

  // Lấy dữ liệu user từ API khi mount
  useEffect(() => {
    getUsers()
      .then((data) => {
        // Map về kiểu User chuẩn FE: giả định service trả theo BE (có _id/createdAt,...)
        const userList: User[] = data.map((u: any) => ({
          _id: u._id ?? u._id,
          username: u.username ?? "",
          rfid: u.rfid ?? "",
          email: u.email ?? "",
          fullName: u.fullName ?? "",
          phone: u.phone ?? "",
          avatar: u.avatar ?? "",
          address: u.address ?? "",
          dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString() : undefined,
          gender: (u.gender as Gender) ?? "other",
          role: (u.role as Role) ?? "employee",
          isActive: typeof u.isActive === "boolean" ? u.isActive : true,
          emailVerified: !!u.emailVerified,
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
          updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : undefined,
          lastLogin: u.lastLogin ? new Date(u.lastLogin).toISOString() : undefined,
        }));
        setUsers(userList);
      })
      .catch(() => {
        setSnackbar({
          open: true,
          message: "Không thể tải danh sách người dùng",
          severity: "error",
        });
      });
  }, []);

  // Lọc & tìm kiếm
  useEffect(() => {
    let result = [...users];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          (u.fullName ?? "").toLowerCase().includes(q) ||
          (u.username ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.phone ?? "").toLowerCase().includes(q) ||
          (u.rfid ?? "").toLowerCase().includes(q)
      );
    }

    if (roleFilter) result = result.filter((u) => u.role === roleFilter);

    if (activeFilter) {
      result = result.filter((u) =>
        activeFilter === "active" ? u.isActive : !u.isActive
      );
    }

    setFilteredUsers(result);
  }, [users, searchTerm, roleFilter, activeFilter]);

  console.log(formData);

  // Helpers
  const getRoleIcon = (role: Role) => {
    switch (role) {
      case "admin":
        return <AdminIcon />;
      case "manager":
        return <WorkIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const initials = (name: string | undefined, fallback: string) => {
    if (name?.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";
      return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
    }
    return (fallback[0] ?? "U").toUpperCase();
  };

  // CRUD (demo local state; khi nối API thì thay bằng gọi service create/update/delete)
  const handleAddUser = () => {
    setCurrentUser(null);
    setFormData({
      _id: "",
      username: "",
      rfid: "",
      email: "",
      password: "",
      fullName: "",
      phone: "",
      avatar: "",
      address: "",
      dateOfBirth: "",
      gender: "other",
      role: "employee",
      isActive: true,
      emailVerified: false,
    });
    setDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setFormData({
      _id: user._id,
      username: user.username ?? "",
      rfid: user.rfid ?? "",
      email: user.email ?? "",
      password: "",
      fullName: user.fullName ?? "",
      phone: user.phone ?? "",
      avatar: user.avatar ?? "",
      address: user.address ?? "",
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().slice(0, 10)
        : "",
      gender: (user.gender as Gender) ?? "other",
      role: (user.role as Role) ?? "employee",
      isActive: !!user.isActive,
      emailVerified: !!user.emailVerified,
    });
    setDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setCurrentUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (currentUser) {
      setUsers((prev) => prev.filter((u) => u._id !== currentUser._id));
      setSnackbar({
        open: true,
        message: `Đã xóa ${currentUser.fullName || currentUser.username}`,
        severity: "success",
      });
      setDeleteDialogOpen(false);
    }
  };

  const handleSaveUser = async () => {
    if (!formData.username || !formData.rfid || !formData.email) {
      setSnackbar({
        open: true,
        message: "Vui lòng nhập Username, RFID và Email",
        severity: "error",
      });
      return;
    }

    try {
      if (currentUser) {
        // Gọi API update
        const updated = await updateUser(currentUser._id, {
          username: formData.username,
          rfid: formData.rfid,
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone,
          avatar: formData.avatar,
          address: formData.address,
          dateOfBirth: formData.dateOfBirth
            ? new Date(formData.dateOfBirth).toISOString()
            : undefined,
          gender: formData.gender,
          role: formData.role,
          isActive: formData.isActive,
          emailVerified: formData.emailVerified,
        });

        // Cập nhật state local
        setUsers((prev) =>
          prev.map((u) => (u._id === currentUser._id ? updated : u))
        );

        setSnackbar({
          open: true,
          message: `Đã cập nhật ${updated.fullName || updated.username}`,
          severity: "success",
        });
      } else {
        // TODO: viết thêm createUser API call tương tự
      }

      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Lỗi khi cập nhật user",
        severity: "error",
      });
    }
  };

  const handleToggleUserActive = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, isActive: !u.isActive } : u))
    );
  };

  // Avatar upload demo
  const handleAvatarUpload = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Ở production nên upload lên server/CDN, ở đây tạm fake url
      const url = `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(
        file.name
      )}`;
      setFormData((prev) => ({ ...prev, avatar: url }));
    }
  };

  // Paging handlers
  const handleChangePage = (_e: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // Clear filter
  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("");
    setActiveFilter("");
  };

  // ======== UI ========
  return (
    <Container sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={handleAddUser}
        >
          Thêm người dùng
        </Button>
      </Box>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4, flexGrow: 1 }}>
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      Tổng người dùng
                    </Typography>
                    <Typography variant="h4">{users.length}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "primary.main" }}>
                    <PersonIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      Người dùng hoạt động
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {users.filter((u) => u.isActive).length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "success.main" }}>
                    <CheckCircleIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      Quản trị viên
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {users.filter((u) => u.role === "admin").length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "warning.main" }}>
                    <AdminIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="overline">
                      Email đã xác thực
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      {users.filter((u) => u.emailVerified).length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "info.main" }}>
                    <EmailIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                placeholder="Tìm kiếm theo tên, tên đăng nhập, email, điện thoại, RFID..."
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
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Vai trò</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as Role | "")}
                  label="Vai trò"
                  displayEmpty
                >
                  <MenuItem value="">Tất cả vai trò</MenuItem>
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={activeFilter}
                  onChange={(e) =>
                    setActiveFilter(e.target.value as "" | "active" | "inactive")
                  }
                  label="Trạng thái"
                  displayEmpty
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="active">Hoạt động</MenuItem>
                  <MenuItem value="inactive">Không hoạt động</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                disabled={!searchTerm && !roleFilter && !activeFilter}
              >
                Xóa bộ lọc
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 0.5 as any }}>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Tooltip title={viewMode === "grid" ? "Xem dạng danh sách" : "Xem dạng lưới"}>
                  <IconButton
                    onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                  >
                    {viewMode === "grid" ? <ViewListIcon /> : <ViewModuleIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Users Display */}
        {filteredUsers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
              Không tìm thấy người dùng
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Thử điều chỉnh tìm kiếm hoặc bộ lọc của bạn
            </Typography>
          </Paper>
        ) : viewMode === "grid" ? (
          <Grid container spacing={3}>
            {filteredUsers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((user) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={user._id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      transition: "transform 0.2s",
                      "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, textAlign: "center" }}>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        badgeContent={
                          user.isActive ? (
                            <CheckCircleIcon fontSize="small" />
                          ) : undefined
                        }
                        color={user.isActive ? "success" : "default"}
                      >
                        <Avatar
                          src={user.avatar}
                          sx={{ width: 80, height: 80, mx: "auto", mb: 2 }}
                          alt={user.fullName || user.username}
                        >
                          {initials(user.fullName, user.username)}
                        </Avatar>
                      </Badge>

                      <Typography variant="h6" gutterBottom noWrap>
                        {user.fullName || user.username}
                      </Typography>

                      <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                        {getRoleIcon(user.role)}
                        <Chip label={getRoleLabel(user.role)} size="small" sx={{ ml: 1 }} />
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <EmailIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: "middle" }} />
                        {user.email}
                      </Typography>

                      {user.phone && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          <PhoneIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: "middle" }} />
                          {user.phone}
                        </Typography>
                      )}

                      {user.rfid && (
                        <Chip label={`RFID: ${user.rfid}`} variant="outlined" size="small" sx={{ mb: 1 }} />
                      )}

                      <Typography variant="caption" color="text.secondary" display="block">
                        Tạo: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                      </Typography>
                      {user.lastLogin && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Đăng nhập cuối: {new Date(user.lastLogin).toLocaleDateString()}
                        </Typography>
                      )}
                    </CardContent>

                    <Divider />
                    <CardActions sx={{ justifyContent: "space-between", px: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={!!user.isActive}
                            onChange={() => handleToggleUserActive(user._id)}
                            size="small"
                          />
                        }
                        label={user.isActive ? "Hoạt động" : "Không hoạt động"}
                        sx={{ m: 0 }}
                      />
                      <Box>
                        <IconButton size="small" color="primary" onClick={() => handleEditUser(user)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteUser(user)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
          </Grid>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Người dùng</TableCell>
                  <TableCell>Vai trò</TableCell>
                  <TableCell>RFID</TableCell>
                  <TableCell>Hoạt động</TableCell>
                  <TableCell>Email đã xác thực</TableCell>
                  <TableCell>Tạo</TableCell>
                  <TableCell>Đăng nhập cuối</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar src={user.avatar} sx={{ mr: 2 }}>
                            {initials(user.fullName, user.username)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium" noWrap>
                              {user.fullName || user.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {getRoleIcon(user.role)}
                          <Typography sx={{ ml: 1 }}>{getRoleLabel(user.role)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.rfid || "-"}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? "Hoạt động" : "Không hoạt động"}
                          color={user.isActive ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.emailVerified ? "Đã xác thực" : "Chưa xác thực"}
                          color={user.emailVerified ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Chưa bao giờ"}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <IconButton size="small" color="primary" onClick={() => handleEditUser(user)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteUser(user)}>
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
              count={filteredUsers.length}
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
              count={filteredUsers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Box>
        )}
      </Container>

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{currentUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <Avatar
                  src={formData.avatar}
                  sx={{ width: 120, height: 120, mb: 2, cursor: "pointer" }}
                  onClick={handleAvatarUpload}
                >
                  {initials(formData.fullName, formData.username)}
                </Avatar>
                <Button variant="outlined" startIcon={<PersonIcon />} onClick={handleAvatarUpload}>
                  Tải lên ảnh đại diện
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {currentUser && (
                  <Chip
                    sx={{ mt: 2 }}
                    label={formData.emailVerified ? "Email đã xác thực" : "Email chưa xác thực"}
                    color={formData.emailVerified ? "success" : "default"}
                    size="small"
                  />
                )}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Tên đăng nhập"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="RFID"
                    value={formData.rfid}
                    onChange={(e) => setFormData({ ...formData, rfid: e.target.value })}
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Mật khẩu"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={currentUser ? "Để trống nếu không đổi" : ""}
                    required={!currentUser}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Họ và tên"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Số điện thoại"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Địa chỉ"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Ngày sinh"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Giới tính</InputLabel>
                    <Select
                      value={formData.gender}
                      label="Giới tính"
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value as Gender })
                      }
                    >
                      {genders.map((g) => (
                        <MenuItem key={g} value={g}>
                          {g}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Vai trò</InputLabel>
                    <Select
                      value={formData.role}
                      label="Vai trò"
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    >
                      {roles.map((r) => (
                        <MenuItem key={r} value={r}>
                          {r}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({ ...formData, isActive: e.target.checked })
                        }
                      />
                    }
                    label={formData.isActive ? "Hoạt động" : "Không hoạt động"}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveUser} startIcon={<SaveIcon />}>
            {currentUser ? "Cập nhật người dùng" : "Thêm người dùng"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa{" "}
            <strong>{currentUser?.fullName || currentUser?.username}</strong>? Hành động này
            không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" color="error" onClick={confirmDeleteUser}>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

      {/* FAB (mobile) */}
      <Box
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          display: { xs: "block", md: "none" },
        }}
      >
        <Fab color="primary" onClick={handleAddUser}>
          <AddIcon />
        </Fab>
      </Box>
    </Container>
  );
}
