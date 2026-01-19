// src/components/ProductItem.tsx
import React from "react";
import {
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  Divider,
  Typography,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Product } from "../types/selfTypes";

interface ProductItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function ProductItem({ product, onEdit, onDelete }: ProductItemProps) {
  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        p: 2,
        mb: 2,
        transition: "transform 0.2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 4,
        },
      }}
    >
      <CardMedia
        component="img"
        image={product.img_url}
        alt={product.product_name}
        sx={{
          width: 120,
          height: 120,
          objectFit: "contain",
          bgcolor: "grey.100",
          borderRadius: 1,
          mr: 2,
        }}
      />
      <Box sx={{ flex: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
          }}
        >
          <Typography
            variant="subtitle1"
            fontWeight={600}
            noWrap
            sx={{ maxWidth: "70%" }}
          >
            {product.product_name}
          </Typography>
          <Chip
            label={`${product.price}đ`}
            color="primary"
            size="small"
            sx={{ fontWeight: "bold" }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Stock: {product.stock}
        </Typography>
        <CardActions sx={{ px: 0, mt: 1 }}>
          <Button size="small" startIcon={<EditIcon />} onClick={() => onEdit(product)}>
            Edit
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => onDelete(product)}
          >
            Delete
          </Button>
        </CardActions>
      </Box>
    </Card>
  );
}
