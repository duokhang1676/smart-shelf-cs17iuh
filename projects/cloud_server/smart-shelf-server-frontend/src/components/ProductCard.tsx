import React from "react";
import { Card, CardMedia, CardContent, Typography, Chip } from "@mui/material";
import { Product } from "../types/selfTypes";

interface ProductCardProps {
  product: Product;
  handleDragStart: (e: React.DragEvent, product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, handleDragStart }) => (
  <Card
    draggable
    onDragStart={(e) => handleDragStart(e, product)}
    sx={{
      width: '100%',
      cursor: "grab",
      "&:active": { cursor: "grabbing" },
      "&:hover": { transform: "scale(1.02)", transition: "transform 0.2s" },
      mb: 1,
    }}
  >
    <CardMedia
      component="img"
      height="auto"
      image={product.img_url}
      alt={product.product_name}
      sx={{ objectFit: "cover" }}
    />
    <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
      <Typography variant="body2" fontWeight="bold" noWrap>
        {product.product_name}
      </Typography>
      <Chip
        label={product.stock}
        size="small"
        sx={{ mt: 0.5, fontSize: "0.7rem" }}
      />
      <Typography variant="body2" color="primary" fontWeight="bold">
        {product.price}đ
      </Typography>
    </CardContent>
  </Card>
);

export default ProductCard; 