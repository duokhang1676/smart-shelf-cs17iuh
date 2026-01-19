import React, { useState } from "react";
import { Paper, Typography } from "@mui/material";
import { LoadCell, Product } from "../types/selfTypes";
import ShelfItemMenu from "./ShelfItemMenu";
import ProductDialog from "./ProductDialog";
import {
  updateLoadCellThreshold,
  updateLoadCellQuantity,
} from "../service/loadcell.service";

interface ShelfCompartmentProps {
  level: number;
  compartment: number;
  quantity: number;
  shelfItem: (LoadCell & { product: Product | null }) | null;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, level: number, compartment: number) => void;
  handleRemoveFromShelf: (level: number, compartment: number) => void;
  onViewProductInfo: (product: Product) => void;
  onUpdateQuantity?: (cellId: string, newQuantity: number) => void; // Thêm prop mới
  onUpdateThreshold?: (cellId: string, newThreshold: number) => void; // Thêm prop mới
  // now receives contextual info: loadCellId, product, quantity, threshold
  handleCreateNotification: (
    loadCellId: string,
    product: Product | null,
    quantity: number,
    threshold?: number
  ) => void;
}

const ShelfCompartment: React.FC<ShelfCompartmentProps> = ({
  level,
  quantity,
  compartment,
  shelfItem,
  handleDragOver,
  handleDrop,
  handleRemoveFromShelf,
  onViewProductInfo, // Thêm prop mới
  onUpdateQuantity,
  onUpdateThreshold,
  handleCreateNotification
}) => {
  const isEmpty = !shelfItem?.product;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [productDialogOpen, setProductDialogOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(
    null
  );

  const [isLoadCellError, setIsLoadCellError] = React.useState(0);
  const [localProduct, setLocalProduct] = React.useState<Product | null>(
    shelfItem?.product ?? null
  );

  const [localThreshold, setLocalThreshold] = React.useState<
    number | undefined
  >(shelfItem && (shelfItem as any).threshold);
  // REMOVED localQuantity state - use prop `quantity` directly

  React.useEffect(() => {
    setLocalProduct(shelfItem?.product ?? null);
    setLocalThreshold(shelfItem?.threshold);
    // localQuantity removed
  }, [shelfItem?.product, shelfItem]);

  // Đồng bộ lỗi loadcell dựa trên prop quantity
  React.useEffect(() => {
    // Kiểm tra lỗi loadcell
    if (quantity === 200 || quantity === 222 || quantity === 255) {
      setIsLoadCellError(quantity);
    } else {
      setIsLoadCellError(0); // Reset lỗi nếu không phải các mã lỗi
    }

    if (quantity < Number(localThreshold)) {
      if (shelfItem) {
        
        handleCreateNotification(shelfItem._id, localProduct, quantity, localThreshold);
      }
    }

    if (quantity === 200 || quantity === 222 || quantity === 255  ) {
      if (shelfItem) {
        
        handleCreateNotification(shelfItem._id, localProduct, quantity, localThreshold);
      }
    }
  }, [quantity]);

  const handleOpenMenu = (event: React.MouseEvent) => {
    if (!isEmpty) setAnchorEl(event.currentTarget as HTMLElement);
  };
  const handleCloseMenu = () => setAnchorEl(null);

  // Các hàm xử lý cho menu
  const handleRemove = () => handleRemoveFromShelf(level, compartment);
  const handleViewInfo = () => {
    if (shelfItem?.product) {
      onViewProductInfo(shelfItem.product);
    }
  };
  const handleEditPrice = (newPrice: string) => {
    if (localProduct) {
      setLocalProduct({ ...localProduct, price: Number(newPrice) });
    }
  };
  const handleChangeThreshold = async (newThreshold: string) => {
    if (shelfItem) {
      try {
        const updated = await updateLoadCellThreshold(
          shelfItem._id,
          Number(newThreshold)
        );

        // Gọi callback để cập nhật state ở parent
        if (onUpdateThreshold) {
          onUpdateThreshold(shelfItem._id, Number(newThreshold));
        }

        setLocalThreshold((updated as any).threshold);
      } catch (err) {
        alert("Cập nhật ngưỡng thất bại!");
      }
    }
  };

  const handleChangeQuantity = async (newQuantity: string) => {
    if (shelfItem) {
      try {
        const updated = await updateLoadCellQuantity(
          shelfItem._id,
          Number(newQuantity)
        );

        // Gọi callback để cập nhật state ở parent
        if (onUpdateQuantity) {
          onUpdateQuantity(shelfItem._id, Number(newQuantity));
        }

        // localQuantity removed — parent should provide updated `quantity` prop
      } catch (err) {
        alert("Cập nhật số lượng thất bại!");
      }
    }
  };

  const handleCloseProductDialog = () => {
    setProductDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleSaveProduct = (productData: any, file?: File) => {
    // Xử lý lưu sản phẩm nếu cần
    handleCloseProductDialog();
  };

  // Use `quantity` prop directly in UI and logic
  const displayQuantity = quantity;

  return (
    <Paper
      onDragOver={isLoadCellError ? undefined : handleDragOver}
      onDrop={
        isLoadCellError ? undefined : (e) => handleDrop(e, level, compartment)
      }
      sx={{
        height: "24vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: "4px dashed",
        borderColor: isEmpty
          ? "grey.300"
          : isLoadCellError
            ? "warning.main"
            : displayQuantity === 0
              ? "error.main"
              : displayQuantity && localThreshold && displayQuantity < localThreshold
                ? "warning.main"
                : "primary.main",
        backgroundColor: isEmpty ? "grey.50" : "background.paper",
        cursor: isEmpty
          ? "default"
          : isLoadCellError
            ? "not-allowed"
            : "pointer",
        transition: "all 0.3s ease",
        "&:hover": {
          borderColor: isEmpty
            ? "grey.400"
            : isLoadCellError
              ? "warning.dark"
              : displayQuantity === 0
                ? "error.dark"
                : displayQuantity && localThreshold && displayQuantity < localThreshold
                  ? "warning.dark"
                  : "primary.dark",
          backgroundColor: isEmpty ? "grey.100" : "grey.50",
        },
        opacity: isLoadCellError ? 0.7 : 1,
      }}
    >
      {!localProduct ? (
        <Typography variant="body2" color="text.secondary">
          Drop here
        </Typography>
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            cursor: isLoadCellError ? "not-allowed" : "pointer",
            backgroundImage: `url(${localProduct.img_url || "/placeholder.svg"
              })`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderRadius: 8,
            overflow: "hidden",
          }}
          onClick={isLoadCellError ? undefined : handleOpenMenu}
        >
          {/* Overlay cảnh báo loadcell lỗi */}
          {isLoadCellError ? (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(255, 215, 0, 0.5)", // vàng nhạt
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              <Typography fontWeight="700" fontSize="30px" color="#000">
                {isLoadCellError}
              </Typography>
            </div>
          ) : null}

          <div
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.5)",
              color: "#fff",
              padding: 4,
              fontSize: "16px",
              textAlign: "center",
            }}
          >
            <Typography
              variant="caption"
              noWrap
              sx={{ width: "100%", fontWeight: "bold" }}
            >
              {localProduct.product_name}
            </Typography>
            <Typography
              variant="caption"
              color="inherit"
              sx={{ display: "block" }}
            >
              Giá:{" "}
              {localProduct.price
                ? localProduct.price.toLocaleString() + "₫"
                : "N/A"}
            </Typography>
            <Typography
              variant="caption"
              color="inherit"
              sx={{ display: "block" }}
            >
              Số lượng: {displayQuantity !== undefined ? displayQuantity : "N/A"} -
              <Typography
                variant="caption"
                color="text.white"
                fontWeight="bold"
              >
                Ngưỡng: {localThreshold}
              </Typography>
            </Typography>
          </div>
        </div>
      )}
      <ShelfItemMenu
        anchorEl={anchorEl}
        onClose={handleCloseMenu}
        onRemove={handleRemove}
        onViewInfo={handleViewInfo}
        onEditPrice={handleEditPrice}
        onChangeThreshold={handleChangeThreshold}
        onChangeQuantity={handleChangeQuantity}
        currentThreshold={localThreshold}
        currentQuantity={quantity} // use prop directly
      />
      <ProductDialog
        open={productDialogOpen}
        onClose={handleCloseProductDialog}
        onSave={handleSaveProduct}
        product={selectedProduct}
      />
    </Paper>
  );
};

export default ShelfCompartment;
