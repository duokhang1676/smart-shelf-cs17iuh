"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Menu,
  MenuItem,
} from "@mui/material";
import { MoreVert as MoreVertIcon, Add as AddIcon } from "@mui/icons-material";
import { useSelector } from "react-redux";
import {
  TaskResponse,
  getAllTasks,
  getMyTasks,
  getAssignedByMeTasks,
  updateTaskStatus,
  Task,
} from "../service/task.service";
import { RootState } from "../store";
import TaskDialog from "../components/TaskDialog";

export default function TaskPage() {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const currentUser = useSelector((state: RootState) => state.user.user);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await getAllTasks();
      setTasks(data);
    } catch (err) {
      setError("Không thể tải danh sách công việc");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    taskId: string,
    newStatus: Task["status"]
  ) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      await fetchTasks(); // Refresh danh sách
    } catch (err) {
      setError("Không thể cập nhật trạng thái");
    }
  };

  const handleOpenDialog = () => {
    setTaskDialogOpen(true);
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "pending":
        return "warning";
      case "in_progress":
        return "info";
      case "completed":
        return "success";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
    taskId: string
  ) => {
    setMenuAnchor(event.currentTarget);
    setSelectedTask(taskId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedTask(null);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">Quản lý công việc</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setTaskDialogOpen(true)}
        >
          Tạo công việc mới
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tiêu đề</TableCell>
              <TableCell>Mô tả</TableCell>
              <TableCell>Người nhận việc</TableCell>
              <TableCell>Người giao việc</TableCell>
              <TableCell>Hạn hoàn thành</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task._id}>
                <TableCell>{task.title}</TableCell>
                <TableCell>{task.description}</TableCell>
                <TableCell>{task.assignedTo.fullName}</TableCell>
                <TableCell>{task.assignedBy.fullName}</TableCell>
                <TableCell>
                  {new Date(task.dueDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={task.status}
                    color={getStatusColor(task.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={(e) => handleMenuOpen(e, task._id)}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedTask) handleOpenDialog();
            handleMenuClose();
          }}
        >
          Xem chi tiết công việc
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedTask) handleStatusChange(selectedTask, "in_progress");
            handleMenuClose();
          }}
        >
          Đánh dấu đang làm
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedTask) handleStatusChange(selectedTask, "completed");
            handleMenuClose();
          }}
        >
          Đánh dấu hoàn thành
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedTask) handleStatusChange(selectedTask, "cancelled");
            handleMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          Hủy công việc
        </MenuItem>
      </Menu>

      <TaskDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        onSave={async (taskData) => {
          await fetchTasks(); // Refresh sau khi tạo task mới
        }}
        employees={[]} // Cần truyền danh sách employees vào đây
      />
    </Container>
  );
}
