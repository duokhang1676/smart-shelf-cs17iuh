import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { Shelf, ShelfCreationData } from "../types/selfTypes";
import { createShelf } from "../service/shefl.service";

interface AddShelfDialogProps {
  open: boolean;
  onClose: () => void;
  onShelfAdded: (shelf: Shelf) => void;
}

const AddShelfDialog: React.FC<AddShelfDialogProps> = ({
  open,
  onClose,
  onShelfAdded,
}) => {
  const [shelfId, setShelfId] = useState("");
  const [shelfName, setShelfName] = useState("");
  const [location, setLocation] = useState("");
  const [macIp, setMacIp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const user = useSelector((state: RootState) => state.user.user);

  const handleClose = () => {
    setShelfId("");
    setShelfName("");
    setLocation("");
    setMacIp("");
    setError(null);
    onClose();
  };

  const handleAddShelf = async () => {
    if (!user) {
      setError("Bạn phải đăng nhập để thêm kệ hàng.");
      return;
    }

    if (!shelfId || !shelfName || !location) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    try {
      const shelfData: ShelfCreationData = {
        shelf_id: shelfId,
        shelf_name: shelfName,
        location: location,
        user_id: user._id,
        mac_ip: macIp,
      } as any;

      const created = await createShelf(shelfData);
      // trả về shelf vừa tạo cho parent để cập nhật UI
      try {
        onShelfAdded(created);
      } catch {
        // ignore parent callback errors
      }
      handleClose();

      // reload page so list refreshes
      window.location.reload();
    } catch (err) {
      setError("Thêm kệ hàng thất bại. Vui lòng thử lại.");
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Thêm Kệ Hàng Mới</DialogTitle>
      <DialogContent sx={{ pt: "20px !important" }}>
        <TextField
          autoFocus
          margin="dense"
          id="shelfId"
          label="Mã Kệ Hàng (Shelf ID)"
          type="text"
          fullWidth
          variant="outlined"
          value={shelfId}
          onChange={(e) => setShelfId(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          id="shelfName"
          label="Tên Kệ Hàng (Shelf Name)"
          type="text"
          fullWidth
          variant="outlined"
          value={shelfName}
          onChange={(e) => setShelfName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          id="macIp"
          label="Địa chỉ MAC"
          type="text"
          fullWidth
          variant="outlined"
          value={macIp}
          onChange={(e) => setMacIp(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          id="location"
          label="Vị trí (Location)"
          type="text"
          fullWidth
          variant="outlined"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Hủy</Button>
        <Button onClick={handleAddShelf} variant="contained">
          Thêm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddShelfDialog;
