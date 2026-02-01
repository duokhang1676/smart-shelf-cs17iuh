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
  Typography,
  Paper,
} from "@mui/material";
import { Save as SaveIcon, Image as ImageIcon, Info as InfoIcon, Inventory as InventoryIcon, Settings as SettingsIcon } from "@mui/icons-material";
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
    in_stock: 0,
    out_stock: 0,
    weight: 0,
    discount: 0,
    max_quantity: 0,
    threshold: 1,
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
          in_stock: typeof (product as any).in_stock === "number" ? (product as any).in_stock : 0,
          out_stock: typeof (product as any).out_stock === "number" ? (product as any).out_stock : 0,
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
          threshold:
            typeof (product as any).threshold === "number"
              ? (product as any).threshold
              : 1,
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
          in_stock: 0,
          out_stock: 0,
          weight: 0,
          discount: 0,
          max_quantity: 0,
          threshold: 1,
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
    const { in_stock, out_stock, ...clean } = formData;
    const finalData: ProductFormData = {
      ...clean,
      price:
        Number.isFinite(Number(clean.price)) ? Number(clean.price) : 0,
      stock: Number.isFinite(Number(clean.stock)) ? Number(clean.stock) : 0,
      weight:
        Number.isFinite(Number(clean.weight)) ? Number(clean.weight) : 0,
      discount:
        Number.isFinite(Number(clean.discount))
          ? Number(clean.discount)
          : 0,
      max_quantity:
        Number.isFinite(Number(clean.max_quantity))
          ? Number(clean.max_quantity)
          : 0,
      threshold:
        Number.isFinite(Number(clean.threshold))
          ? Number(clean.threshold)
          : 1,
    };

    onSave(finalData, selectedFile || undefined);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{product ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Image Upload Section */}
          <Grid size={6}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ImageIcon sx={{ mr: 1 }} />
                Hình ảnh sản phẩm
              </Typography>
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
                    border: "2px dashed",
                    borderColor: "primary.main",
                    borderRadius: 2,
                    mb: 2,
                    overflow: "hidden",
                    bgcolor: "grey.50",
                    transition: 'border-color 0.3s',
                    '&:hover': {
                      borderColor: 'primary.dark',
                    },
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
                  variant="contained"
                  startIcon={<ImageIcon />}
                  onClick={handleImageUpload}
                  sx={{ borderRadius: 2 }}
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
            </Paper>
          </Grid>

          {/* Basic Information Section */}
          <Grid size={6}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 1 }} />
                Thông tin cơ bản
              </Typography>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Tên sản phẩm"
                    value={formData.product_name}
                    onChange={(e) =>
                      setFormData({ ...formData, product_name: e.target.value })
                    }
                    required
                    variant="outlined"
                  />
                </Grid>
                <Grid size={12}>
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
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Stock Information Section - REMOVED as per request */}

          {/* Additional Information Section */}
          <Grid size={12}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SettingsIcon sx={{ mr: 1 }} />
                Thông tin bổ sung
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{md: 4, xs: 12}}>
                  <TextField
                    fullWidth
                    label="Cân nặng (gram)"
                    type="number"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: Number(e.target.value) || 0 })
                    }
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{md: 4, xs: 12}}>
                  <TextField
                    fullWidth
                    label="Số lượng tối đa"
                    type="number"
                    value={formData.max_quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, max_quantity: Number(e.target.value) || 0 })
                    }
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{md: 4, xs: 12}}>
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
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </Paper>
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
