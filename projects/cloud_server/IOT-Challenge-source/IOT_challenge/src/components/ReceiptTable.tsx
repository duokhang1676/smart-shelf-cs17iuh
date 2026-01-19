import React from "react";
import { TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Chip, IconButton, Box } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Receipt } from "../types/receiptTypes";

interface ReceiptTableProps {
  receipts: Receipt[];
  page: number;
  rowsPerPage: number;
  tabValue: number;
  onView: (receipt: Receipt) => void;
  onEdit: (receipt: Receipt) => void;
  onDelete: (receipt: Receipt) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
}

const ReceiptTable: React.FC<ReceiptTableProps> = ({
  receipts,
  page,
  rowsPerPage,
  tabValue,
  onView,
  onEdit,
  onDelete,
  getStatusIcon,
  getStatusColor,
}) => {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Receipt #</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Items</TableCell>
            <TableCell>Total</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Payment Method</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {receipts
            .filter((receipt) => {
              if (tabValue === 0) return true;
              if (tabValue === 1) return receipt.status === "Paid";
              if (tabValue === 2) return receipt.status === "Pending";
              if (tabValue === 3)
                return (
                  receipt.status === "Cancelled" ||
                  receipt.status === "Refunded"
                );
              return true;
            })
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((receipt) => (
              <TableRow
                key={receipt.id}
                hover
                onClick={() => onView(receipt)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell>{receipt.receiptNumber}</TableCell>
                <TableCell>
                  {receipt.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {receipt.customer
                    ? `${receipt.customer.firstName} ${receipt.customer.lastName}`
                    : "Walk-in Customer"}
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${receipt.items.length} items`}
                    size="small"
                  />
                </TableCell>
                <TableCell>${receipt.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={receipt.status}
                    color={getStatusColor(receipt.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{receipt.paymentMethod}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(receipt);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ReceiptTable;
