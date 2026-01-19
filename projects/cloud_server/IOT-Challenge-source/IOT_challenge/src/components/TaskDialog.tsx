import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import { useSelector } from "react-redux";
import { createTask } from "../service/task.service";
import { RootState } from "../store";
import { useEffect } from "react";
import { User } from "../types/userTypes";

export interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (taskData: any) => void;
  employees: User[];
}

const TaskDialog: React.FC<TaskDialogProps> = ({
  open,
  onClose,
  onSave,
  employees,
}) => {
  // Lấy thông tin user từ redux store
  const currentUser = useSelector((state: RootState) => state.user.user);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Lưu vào localStorage
  const taskHistory = JSON.parse(
    localStorage.getItem("loadcellHistory") || "[]"
  );
  taskHistory.push({
    title,
    description,
    assignedTo,
    assignedBy: currentUser?._id,
    dueDate,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem("loadcellHistory", JSON.stringify(taskHistory));

  useEffect(() => {
    if (open) {
      const rawHistory = JSON.parse(
        localStorage.getItem("loadcellHistory") || "[]"
      );

      // Lọc ra các bản ghi hợp lệ (có productName và quantity)
      const validHistory = rawHistory.filter(
        (item: any) => item.productName && typeof item.quantity === "number"
      );

      if (validHistory.length > 0) {
        const recent = validHistory
          .map(
            (item: any, idx: number) =>
              `${idx + 1}. ${item.productName} - ${
                item.quantity
              } (lúc ${new Date(item.updatedAt).toLocaleString()})`
          )
          .join("\n");

        setDescription(`Lịch sử cập nhật gần đây:\n${recent}`);
      } else {
        setDescription("");
      }
    }
  }, [open]);

  const handleSave = async () => {
    if (!title || !assignedTo || !dueDate) return;

    setLoading(true);
    setError("");

    try {
      const newTask = {
        title,
        description,
        assignedTo,
        assignedBy: currentUser?._id, // Thêm ID của user đang đăng nhập
        dueDate,
        status: "pending" as const,
      };

      const result = await createTask(newTask);
      setSuccess(true);
      onSave(result);

      // Reset form
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setDueDate("");

      // Close dialog after success
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Không thể tạo công việc. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Giao việc cho nhân viên</DialogTitle>
      <DialogContent>
        <TextField
          label="Tiêu đề công việc"
          fullWidth
          margin="normal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextField
          label="Mô tả"
          fullWidth
          margin="normal"
          multiline
          minRows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          select
          label="Nhân viên nhận việc"
          fullWidth
          margin="normal"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
        >
          {employees.map((emp) => (
            <MenuItem key={emp._id} value={emp._id}>
              {emp.fullName}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Hạn hoàn thành"
          type="date"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !title || !assignedTo || !dueDate}
        >
          {loading ? "Đang xử lý..." : "Giao việc"}
        </Button>
      </DialogActions>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
      >
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={success} autoHideDuration={1500}>
        <Alert severity="success">Tạo công việc thành công!</Alert>
      </Snackbar>
    </Dialog>
  );
};

export default TaskDialog;
