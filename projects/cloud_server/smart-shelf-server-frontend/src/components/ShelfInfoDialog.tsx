import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { Shelf, LoadCell } from "../types/selfTypes";
import { getEmployees } from "../service/user.service";
import { User } from "../types/userTypes";
import { updateShelf } from "../service/shefl.service";

interface ShelfInfoDialogProps {
  open: boolean;
  onClose: () => void;
  shelf: Shelf | undefined;
  loadCells?: LoadCell[];
}

const ShelfInfoDialog: React.FC<ShelfInfoDialogProps> = ({
  open,
  onClose,
  shelf,
  loadCells = [],
}) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [shelfForm, setShelfForm] = useState({
    shelf_id: "",
    mac_ip: "",
    shelf_name: "",
    location: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      getEmployees().then((users) => {
        setEmployees(users);
      });
    }
  }, [open]);

  useEffect(() => {
    if (!shelf) {
      setSelectedUserIds([]);
      setShelfForm({ shelf_id: "", mac_ip: "", shelf_name: "", location: "" });
      return;
    }
    // shelf.user_id có thể là mảng object / mảng id / single object / single id
    // cập nhật form từ shelf (cho phép sửa)
    setShelfForm({
      shelf_id: shelf.shelf_id ?? "",
      mac_ip: shelf.mac_ip ?? "",
      shelf_name: shelf.shelf_name ?? "",
      location: shelf.location ?? "",
    });
    const u = shelf.user_id;
    if (!u) {
      setSelectedUserIds([]);
    } else if (Array.isArray(u)) {
      const ids = u.map((it: any) =>
        typeof it === "string" ? it : it?._id ?? String(it)
      );
      setSelectedUserIds(ids);
    } else {
      // single
      const id = typeof u === "string" ? u : u._id ?? String(u);
      setSelectedUserIds([id]);
    }
  }, [shelf]);

  const handleUserChange = (e: any) => {
    const value = e.target.value;
    // value may be string (comma) or array
    const ids = typeof value === "string" ? value.split(",") : value;
    setSelectedUserIds(ids);
  };

  const handUpdateShelf = async (shelf_id: string) => {
    try {
      // build payload with edited fields
      const payload: any = {
        shelf_id: shelfForm.shelf_id,
        mac_ip: shelfForm.mac_ip,
        shelf_name: shelfForm.shelf_name,
        location: shelfForm.location,
        user_id: selectedUserIds,
      };

      setSaving(true);
      await updateShelf(shelf_id, payload as any);
      alert("Cập nhật kệ thành công!");
      onClose();
    } catch (error) {
      console.error("Cập nhật kệ thất bại", error);
      alert("Cập nhật kệ thất bại!");
    } finally {
      setSaving(false);
    }
  };

  if (!shelf) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Thông tin kệ hàng</DialogTitle>
      <DialogContent dividers>
        <Box mb={2} component="form">
          <TextField
            label="Mã kệ"
            value={shelfForm.shelf_id}
            onChange={(e) =>
              setShelfForm((s) => ({ ...s, shelf_id: e.target.value }))
            }
            fullWidth
            margin="normal"
          />
          <TextField
            label="Địa chỉ MAC"
            value={shelfForm.mac_ip}
            onChange={(e) =>
              setShelfForm((s) => ({ ...s, mac_ip: e.target.value }))
            }
            fullWidth
            margin="normal"
          />
          <TextField
            label="Tên kệ"
            value={shelfForm.shelf_name}
            onChange={(e) =>
              setShelfForm((s) => ({ ...s, shelf_name: e.target.value }))
            }
            fullWidth
            margin="normal"
          />
          <TextField
            label="Vị trí"
            value={shelfForm.location}
            onChange={(e) =>
              setShelfForm((s) => ({ ...s, location: e.target.value }))
            }
            fullWidth
            margin="normal"
          />

          <TextField
            select
            label="Người phụ trách"
            value={selectedUserIds}
            fullWidth
            margin="normal"
            onChange={handleUserChange}
            SelectProps={{
              multiple: true,
              renderValue: (selected: any) =>
                (selected as string[])
                  .map(
                    (id) =>
                      employees.find((e) => e._id === id)?.fullName ?? id
                  )
                  .join(", "),
            }}
          >
            {employees.map((emp) => (
              <MenuItem key={emp._id} value={emp._id}>
                <Checkbox checked={selectedUserIds.indexOf(emp._id) > -1} />
                <ListItemText primary={emp.fullName ?? emp.username} />
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Ngày tạo"
            value={
              shelf.createdAt
                ? new Date(shelf.createdAt).toLocaleString()
                : ""
            }
            fullWidth
            margin="normal"
            InputProps={{ readOnly: true }}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          color="secondary"
          onClick={() => handUpdateShelf(shelf._id)} // Gọi updateShelf với payload chứa field đã sửa
          disabled={saving}
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShelfInfoDialog;