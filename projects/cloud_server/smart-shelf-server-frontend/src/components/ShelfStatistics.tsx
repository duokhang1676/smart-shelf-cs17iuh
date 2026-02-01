import React from "react";
import { Paper, Typography, Grid } from "@mui/material";
import { Shelf, LoadCell } from "../types/selfTypes";

interface ShelfStatisticsProps {
  shelf?: Shelf;
  loadCells: LoadCell[]; // MỚI: Thêm prop loadCells
}

const ShelfStatistics: React.FC<ShelfStatisticsProps> = ({ shelf, loadCells }) => (
  <Paper sx={{ mt: 4, p: 2 }}>
    <Typography variant="h6" gutterBottom>
      Thông tin - {shelf?.shelf_name || "Unknown Shelf"}
    </Typography>
    <Grid container spacing={2}>
      <Grid component="div" size={3}>
        <Typography variant="body2" color="text.secondary">
          Tổng ô
        </Typography>
        <Typography variant="h4">15</Typography>
      </Grid>
      <Grid component="div" size={3}>
        <Typography variant="body2" color="text.secondary">
          Có hàng
        </Typography>
        <Typography variant="h4" color="primary">
          {loadCells.filter((cell) => cell.product_id !== "" && cell.product_id !== null).length}
        </Typography>
      </Grid>
      <Grid component="div" size={3}>
        <Typography variant="body2" color="text.secondary">
          Trống
        </Typography>
        <Typography variant="h4" color="success.main">
          {loadCells.filter((cell) => cell.product_id === "" || cell.product_id === null).length}
        </Typography>
      </Grid>
      <Grid component="div" size={3}>
        <Typography variant="body2" color="text.secondary">
          Tỉ lệ infill
        </Typography>
        <Typography variant="h4" color="warning.main">
          {Math.round((loadCells.filter((cell) => cell.product_id !== "").length / 15) * 100)}%
        </Typography>
      </Grid>
    </Grid>
  </Paper>
);

export default ShelfStatistics;