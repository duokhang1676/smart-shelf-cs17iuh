import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  InputAdornment,
  Box,
} from "@mui/material";
import { Save as SaveIcon, Image as ImageIcon } from "@mui/icons-material";
import { Product } from "../types/selfTypes";

type ProductFormData = Omit<Product, "createdAt" | "updatedAt">;

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (productData: ProductFormData, file?: File) => void;
  product: Product | null;
}

const ProductDialog: React.FC<ProductDialogProps> = ({
  open,
  onClose,
  product,
  onSave,
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    _id: "",
    product_id: "",
    product_name: "",
    img_url: "/placeholder.svg?height=200&width=200",
    price: 0,
    stock: 0,
    weight: 0,
    discount: 0,
    max_quantity: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      if (product) {
        setFormData({
          _id: product._id || "",
          product_id: product.product_id || "",
          product_name: product.product_name || "",
          img_url: product.img_url || "/placeholder.svg?height=200&width=200",
          price: typeof product.price === "number" ? product.price : 0,
          stock: typeof product.stock === "number" ? product.stock : 0,
          weight:
            typeof (product as any).weight === "number"
              ? (product as any).weight
              : 0,
          discount:
            typeof (product as any).discount === "number"
              ? (product as any).discount
              : 0,
          max_quantity:
            typeof (product as any).max_quantity === "number"
              ? (product as any).max_quantity
              : 0,
        });
        setSelectedFile(null);
      } else {
        setFormData({
          _id: "",
          product_id: "",
          product_name: "",
          img_url: "/placeholder.svg?height=200&width=200",
          price: 0,
          stock: 0,
          weight: 0,
          discount: 0,
          max_quantity: 0,
        });
        setSelectedFile(null);
      }
    }
  }, [product, open]);

  useEffect(() => {
    const currentImageUrl = formData.img_url;
    return () => {
      if (currentImageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(currentImageUrl);
      }
    };
  }, [formData.img_url]);

  const handleImageUpload = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      setSelectedFile(file);
      const tempUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, img_url: tempUrl }));
    }
  };

  const handleInternalSave = () => {
    const clean: ProductFormData = {
      ...formData,
      price:
        Number.isFinite(Number(formData.price)) ? Number(formData.price) : 0,
      stock: Number.isFinite(Number(formData.stock)) ? Number(formData.stock) : 0,
      weight:
        Number.isFinite(Number(formData.weight)) ? Number(formData.weight) : 0,
      discount:
        Number.isFinite(Number(formData.discount))
          ? Number(formData.discount)
          : 0,
      max_quantity:
        Number.isFinite(Number(formData.max_quantity))
          ? Number(formData.max_quantity)
          : 0,
    };

    onSave(clean, selectedFile || undefined);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{product ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid size={12}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  height: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px dashed",
                  borderColor: "grey.300",
                  borderRadius: 1,
                  mb: 2,
                  overflow: "hidden",
                  bgcolor: "grey.50",
                }}
              >
                {formData.img_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.img_url}
                    alt="Sản phẩm"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <ImageIcon sx={{ fontSize: 60, color: "grey.400" }} />
                )}
              </Box>
              <Button
                variant="outlined"
                startIcon={<ImageIcon />}
                onClick={handleImageUpload}
              >
                Tải ảnh
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileChange}
              />
            </Box>
          </Grid>

          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid size={4}>
                <TextField
                  fullWidth
                  label="Tên sản phẩm"
                  value={formData.product_name}
                  onChange={(e) =>
                    setFormData({ ...formData, product_name: e.target.value })
                  }
                  required
                />
              </Grid>

              <Grid size={4}>
                <TextField
                  fullWidth
                  label="Giá"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: Number(e.target.value) || 0 })
                  }
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  required
                />
              </Grid>

              <Grid size={4}>
                <TextField
                  fullWidth
                  label="Số lượng (kho)"
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: Number.parseInt(e.target.value) || 0 })
                  }
                />
              </Grid>

              <Grid size={4}>
                <TextField
                  fullWidth
                  label="Cân nặng (gram)"
                  type="number"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData({ ...formData, weight: Number(e.target.value) || 0 })
                  }
                />
              </Grid>

              <Grid size={4}>
                <TextField
                  fullWidth
                  label="Số lượng tối đa"
                  type="number"
                  value={formData.max_quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, max_quantity: Number(e.target.value) || 0 })
                  }
                />
              </Grid>

              <Grid size={4}>
                <TextField
                  fullWidth
                  label="Khuyến mãi (%)"
                  type="number"
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({ ...formData, discount: Number(e.target.value) || 0 })
                  }
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          variant="contained"
          onClick={handleInternalSave}
          startIcon={<SaveIcon />}
        >
          {product ? "Cập nhật" : "Thêm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductDialog;
