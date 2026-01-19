// src/components/ShelfItemMenu.tsx
import React, { useState } from "react";
import { Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";

interface ShelfItemMenuProps {
  anchorEl: null | HTMLElement;
  onClose: () => void;
  onRemove: () => void;
  onViewInfo: () => void;
  onEditPrice: (newPrice: string) => void;
  onChangeThreshold: (newThreshold: string) => void;
  onChangeQuantity: (newQuantity: string) => void; // Thêm callback thay đổi số lượng
  currentThreshold?: number;
  currentQuantity?: number; // Thêm giá trị số lượng hiện tại
}

const ShelfItemMenu: React.FC<ShelfItemMenuProps> = ({
  anchorEl,
  onClose,
  onRemove,
  onViewInfo,
  onEditPrice,
  onChangeThreshold,
  onChangeQuantity,
  currentThreshold,
  currentQuantity,
}) => {
  const [openEditPrice, setOpenEditPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [openThreshold, setOpenThreshold] = useState(false);
  const [newThreshold, setNewThreshold] = useState("");
  const [openQuantity, setOpenQuantity] = useState(false);
  const [newQuantity, setNewQuantity] = useState("");

  const handleChangeThresholdClick = () => {
    setOpenThreshold(true);
    setNewThreshold(currentThreshold !== undefined ? String(currentThreshold) : "");
    onClose();
  };

  const handleChangeThresholdConfirm = () => {
    onChangeThreshold(newThreshold);
    setOpenThreshold(false);
    setNewThreshold("");
  };

  const handleChangeQuantityClick = () => {
    setOpenQuantity(true);
    setNewQuantity(currentQuantity !== undefined ? String(currentQuantity) : "");
    onClose();
  };

  const handleChangeQuantityConfirm = () => {
    onChangeQuantity(newQuantity);
    setOpenQuantity(false);
    setNewQuantity("");
  };


  return (
    <>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
        <MenuItem onClick={() => { onRemove(); onClose(); }}>Xóa</MenuItem>
        <MenuItem onClick={() => { onViewInfo(); onClose(); }}>Xem thông tin sản phẩm</MenuItem>
        {/* <MenuItem onClick={handleChangeQuantityClick}>Thay đổi số lượng sản phẩm</MenuItem> */}
        <MenuItem onClick={handleChangeThresholdClick}>Thay đổi ngưỡng báo hết hàng</MenuItem>
      </Menu>
      <Dialog open={openThreshold} onClose={() => setOpenThreshold(false)}>
        <DialogTitle>Thay đổi ngưỡng báo hết hàng</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Ngưỡng mới"
            type="number"
            fullWidth
            value={newThreshold}
            onChange={e => {
              const val = e.target.value;
              if (Number(val) < 0) return;
              setNewThreshold(val);
            }}
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenThreshold(false)}>Hủy</Button>
          <Button onClick={handleChangeThresholdConfirm} variant="contained" color="primary">Lưu</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openQuantity} onClose={() => setOpenQuantity(false)}>
        <DialogTitle>Thay đổi số lượng sản phẩm</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Số lượng mới"
            type="number"
            fullWidth
            value={newQuantity}
            onChange={e => {
              const val = e.target.value;
              if (Number(val) < 0) return; // Không cho số âm
              setNewQuantity(val);
            }}
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuantity(false)}>Hủy</Button>
          <Button onClick={handleChangeQuantityConfirm} variant="contained" color="primary">Lưu</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ShelfItemMenu;
