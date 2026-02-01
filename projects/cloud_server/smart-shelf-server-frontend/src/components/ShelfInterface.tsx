"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Inventory as InventoryIcon,
  Menu as MenuIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import createMqttClient from "../lib/mqttClient";
import { useNavigate } from "react-router-dom";
import ProductCard from "./ProductCard";
import ShelfCompartment from "./ShelfCompartment";
import ShelfStatistics from "./ShelfStatistics";
import ShelvesOverview from "./ShelvesOverview";
import {
  fetchLoadCellsByShelfId,
  fetchProducts,
  fetchShelves,
} from "../service/shefl.service";
import { getEmployees } from "../service/user.service";
import { updateLoadCell } from "../service/loadcell.service";
import { Product, Shelf, LoadCell } from "../types/selfTypes";
import AddShelfDialog from "./AddShelfDialog";
import ProductDialog from "./ProductDialog";
import TaskDialog from "./TaskDialog";
import ShelfInfoDialog from "./ShelfInfoDialog";
import { User } from "../types/userTypes";
import { createNotification, CreateNotificationRequest } from "../service/notification.service";


export default function ShelfInterface() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [activeShelfId, setActiveShelfId] = useState(
    "685aafc545619025a0bb9f27"
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newShelfName, setNewShelfName] = useState("");
  const [editingShelf, setEditingShelf] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedShelfForMenu, setSelectedShelfForMenu] = useState<
    string | null
  >(null);
  const [sampleProducts, setSampleProducts] = useState<Product[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loadCells, setLoadCells] = useState<LoadCell[]>([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [realtimeQuantities, setRealtimeQuantities] = useState<number[]>([]);

  const [hasProductChange, setHasProductChange] = useState(false);
  const [viewChangesMode, setViewChangesMode] = useState(false);
  const [changesDialogOpen, setChangesDialogOpen] = useState(false);
  const [shelfItems, setShelfItems] = useState<
    (LoadCell & { product: Product | null })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadCellsLoading, setLoadCellsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shelfInfoOpen, setShelfInfoOpen] = useState(false);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleShelfAdded = (shelf: Shelf) => {
    setShelves((prev) => [...prev, shelf]);
    setActiveShelfId(shelf.shelf_id);
    handleCloseDialog();
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Bật loading
      try {
        const [products, shelvesData, employeesList] = await Promise.all([
          fetchProducts(),
          fetchShelves(),
          getEmployees(),
        ]);

        setSampleProducts(products);
        setShelves(shelvesData);
        setEmployees(employeesList);

      } catch (error) {
        console.error("Failed to fetch data:", error);
        alert("Không thể tải dữ liệu sản phẩm hoặc kệ. Vui lòng thử lại.");
      } finally {
        setLoading(false); // Tắt loading
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchLoadCells = async () => {
      if (activeShelfId) {
        setLoadCellsLoading(true); // Bật loading cho loadCells
        try {
          const data = await fetchLoadCellsByShelfId(activeShelfId);
          console.log(data.loadCells);
          setLoadCells(data.loadCells);
          console.log("data.loadCells", loadCells);
        } catch (error) {
          console.error("Failed to fetch load cells:", error);
        } finally {
          setLoadCellsLoading(false); // Tắt loading
        }
      }
    };
    fetchLoadCells();
  }, [activeShelfId]);

  useEffect(() => {
    const mqtt = createMqttClient({
      host: "broker.hivemq.com",
      port: 8884,
      path: "/mqtt",
      useSSL: true,
      topics: ["shelf/loadcell/quantity"],
      onConnect: () => {
        console.log("Connected to MQTT broker");
      },
      onMessage: (topic, payload) => {
        try {
          const obj = JSON.parse(payload);
          if (obj && Array.isArray(obj.values)) {
            const vals = obj.values.map((v: any) => Number(v) || 0);
            console.log(vals);
            setRealtimeQuantities(vals);
          }
        } catch (e) {
          console.error("Invalid MQTT payload:", e);
        }
      },
      onFailure: (err) => {
        console.error("MQTT Connection failed:", err);
      },
    });

    return () => {
      mqtt.disconnect();
    };
  }, []);

  useEffect(() => {
    const hasChange = loadCells.some((cell) => cell.previous_product_id !== null);
    setHasProductChange(hasChange);
  }, [loadCells]);

  useEffect(() => {
    const items = loadCells.map((cell) => {
      const product = viewChangesMode
        ? sampleProducts.find((p) => p._id === cell.product_id) || null // Chỉ lấy product_id
        : cell.previous_product_id
          ? sampleProducts.find((p) => p._id === cell.previous_product_id) || null // Lấy previous_product_id nếu có
          : sampleProducts.find((p) => p._id === cell.product_id) || null; // Ngược lại lấy product_id

      return { ...cell, product };
    });

    setShelfItems(items);
  }, [loadCells, sampleProducts, viewChangesMode]);

  const activeShelf: Shelf | undefined = shelves.find(
    (shelf) => shelf._id === activeShelfId
  );

  const handleCreateShelf = () => {
    if (newShelfName.trim()) {
      const newShelf: Shelf = {
        _id: Date.now().toString(),
        shelf_id: `S${Date.now()}`,
        mac_ip: "",
        shelf_name: newShelfName.trim(),
        user_id: null,
        location: "",
        createdAt: new Date(),
      };
      setShelves((prev) => [...prev, newShelf]);
      setActiveShelfId(newShelf.shelf_id);
      setNewShelfName("");
      setDialogOpen(false);
    }
  };

  const handleDeleteShelf = (shelfId: string) => {
    if (shelves.length > 1) {
      setShelves((prev) => prev.filter((shelf) => shelf.shelf_id !== shelfId));
      if (activeShelfId === shelfId) {
        setActiveShelfId(
          shelves.find((shelf) => shelf.shelf_id !== shelfId)?.shelf_id ||
          shelves[0].shelf_id
        );
      }
    }
    setMenuAnchor(null);
  };

  const handleDragStart = (e: React.DragEvent, product: Product) => {
    e.dataTransfer.setData("application/json", JSON.stringify(product));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const uploadAllLoadCells = async () => {
    setUploading(true); // Bật loading
    try {
      await Promise.all(
        loadCells.map((cell) =>
          updateLoadCell(cell._id, {
            product_id: cell.product_id ? cell.product_id : null,
            quantity: cell.quantity,
          })
        )
      );

      const updatedHistory = loadCells.map((cell) => {
        const matchedProduct = sampleProducts.find(
          (p) => p._id === cell.product_id
        );
        return {
          productID: cell.product_id,
          productName: matchedProduct?.product_name || "",
          quantity: cell.quantity,
          updatedAt: new Date().toISOString(),
        };
      });

      localStorage.setItem(
        "loadcellHistory",
        JSON.stringify([...updatedHistory])
      );

      alert("Upload thành công toàn bộ load cell!");
      setSidebarOpen(false);
      setViewChangesMode(false);
    } catch (error) {
      alert("Có lỗi khi upload load cell!");
      console.error(error);
    } finally {
      setUploading(false); // Tắt loading
    }
  };

  const handleDrop = async (
    e: React.DragEvent,
    level: number,
    compartment: number
  ) => {
    e.preventDefault();
    const productData = e.dataTransfer.getData("application/json");

    if (productData && activeShelf && sampleProducts.length > 0) {
      const product: Product = JSON.parse(productData);
      const targetCell = loadCells.find(
        (cell) => cell.floor === level + 1 && cell.column === compartment + 1
      );

      if (targetCell) {
        // Cập nhật state loadCells
        setLoadCells((prev) =>
          prev.map((cell): LoadCell =>
            cell._id === targetCell._id
              ? {
                ...cell,
                product_id: (product._id ?? null) as string | null,
                quantity: 1,
                previous_product_id: (cell.product_id ?? null) as string | null, // đảm bảo không undefined
              }
              : cell
          )
        );

        // Cập nhật state shelfItems để UI phản ánh ngay lập tức
        setShelfItems((prev) =>
          prev.map((item) =>
            item._id === targetCell._id
              ? {
                ...item,
                product_id: (product._id ?? null) as string | null,
                quantity: 1,
                previous_product_id: (item.product_id ?? null) as string | null,
                product: product,
              }
              : item
          )
        );
      }
    } else {
      console.warn("No products loaded or active shelf not found.");
    }
  };

  const handleRemoveFromShelf = async (level: number, compartment: number) => {
    const targetCell = loadCells.find(
      (cell) => cell.floor === level + 1 && cell.column === compartment + 1
    );

    if (targetCell) {
      // Cập nhật state loadCells
      setLoadCells((prev) =>
        prev.map((cell) =>
          cell._id === targetCell._id
            ? {
              ...cell,
              product_id: null,
              quantity: 0,
              previous_product_id: cell.product_id // Lưu product_id hiện tại vào previous
            }
            : cell
        )
      );

      // Cập nhật state shelfItems để UI phản ánh ngay lập tức
      setShelfItems((prev) =>
        prev.map((item) =>
          item._id === targetCell._id
            ? {
              ...item,
              product_id: null,
              quantity: 0,
              previous_product_id: item.product_id,
              product: null
            }
            : item
        )
      );
    }
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedShelfForMenu(null);
  };

  const handleViewProductInfo = (product: Product) => {
    setSelectedProduct(product);
    setProductDialogOpen(true);
  };

  const handleCloseProductDialog = () => {
    setProductDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleSaveProduct = (productData: any, file?: File) => {
    console.log("Saving product:", productData, file);
    handleCloseProductDialog();
  };

  const handleViewChanges = () => {
    setViewChangesMode(!viewChangesMode); // Bật chế độ "Xem sự thay đổi"
  };

  const handleUpdateQuantity = (cellId: string, newQuantity: number) => {
    // Cập nhật state loadCells
    setLoadCells((prev) =>
      prev.map((cell) =>
        cell._id === cellId
          ? { ...cell, quantity: newQuantity }
          : cell
      )
    );

    // Cập nhật state shelfItems
    setShelfItems((prev) =>
      prev.map((item) =>
        item._id === cellId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const handleUpdateThreshold = (cellId: string, newThreshold: number) => {
    // Cập nhật state loadCells
    setLoadCells((prev) =>
      prev.map((cell) =>
        cell._id === cellId
          ? { ...cell, threshold: newThreshold }
          : cell
      )
    );

    // Cập nhật state shelfItems
    setShelfItems((prev) =>
      prev.map((item) =>
        item._id === cellId
          ? { ...item, threshold: newThreshold }
          : item
      )
    );
  };

  // DEPRECATED: Backend tự động tạo notification qua MQTT
  // Hàm này không còn được sử dụng vì ShelfCompartment đã xóa logic gọi
  const handleCreateNotification = async (
    loadCellId: string,
    product: Product | null,
    quantity: number,
    threshold?: number
  ) => {
    // Backend đã xử lý notification qua MQTT handler
    // Không cần tạo từ frontend nữa
    console.log("Notification sẽ được tạo tự động từ backend");
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            setEditingShelf(selectedShelfForMenu);
            handleMenuClose();
          }}
        >
          <EditIcon sx={{ mr: 1 }} />
          Rename
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() =>
            selectedShelfForMenu && handleDeleteShelf(selectedShelfForMenu)
          }
          disabled={shelves.length <= 1}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Shelf</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Shelf Name"
            fullWidth
            variant="outlined"
            value={newShelfName}
            onChange={(e) => setNewShelfName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateShelf();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateShelf}
            variant="contained"
            disabled={!newShelfName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        variant="persistent"
        anchor="left"
        open={sidebarOpen}
        sx={{
          width: 280,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 280,
            boxSizing: "border-box",
            mt: 8,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Hàng hóa
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Kéo thả vào các ô tương ứng ở trên kệ
          </Typography>
          <List sx={{ p: 0 }}>
            {sampleProducts.map((product) => (
              <ListItem key={product._id} sx={{ p: 0, mb: 1 }}>
                <ProductCard
                  product={product}
                  handleDragStart={handleDragStart}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: sidebarOpen ? 0 : "-280px",
          transition: "margin-left 0.3s ease",
        }}
      >
        <Container maxWidth="lg">
          {/* Loading overlay cho toàn bộ component */}
          {loading && (
            <Box
              sx={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              }}
            >
              <CircularProgress size={60} />
            </Box>
          )}

          {/* <MqttMessageViewer /> */}
          <Box
            sx={{
              p: 2,
              mb: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              backgroundColor: "background.paper",
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
              Các mã lỗi:
            </Typography>
            <List dense sx={{ pl: 0, py: 0 }}>
              <ListItem
                sx={{ display: "list-item", listStyleType: "disc", py: 0.25, ml: 2 }}
              >
              </ListItem>
              <ListItem
                sx={{ display: "list-item", listStyleType: "disc", py: 0.25, ml: 2 }}
              >
                <ListItemText primary="200: Số lượng sản phẩm trên ngăn vượt mức tối đa" primaryTypographyProps={{ variant: "body2" }} />
              </ListItem>
              <ListItem
                sx={{ display: "list-item", listStyleType: "disc", py: 0.25, ml: 2 }}
              >
                <ListItemText primary="222: Sản phẩm trên ngăn không đúng" primaryTypographyProps={{ variant: "body2" }} />
              </ListItem>
            </List>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              mb: 2,
              gap: 2,
            }}
          >
            <Typography variant="h4">
              {activeShelf?.shelf_name || "Shelf"}
              {hasProductChange && !sidebarOpen && (
                <Box>
                  <Typography variant="h6" color="error" sx={{ mb: 2 }}>
                    Có sự thay đổi hàng hóa
                  </Typography>

                  <Button
                    variant="text"
                    color={viewChangesMode ? "secondary" : "info"}
                    onClick={handleViewChanges}
                  >
                    {viewChangesMode ? "Quay lại" : "Xem sự thay đổi hàng hóa"}
                  </Button>

                </Box>
              )}
            </Typography>{" "}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "stretch", sm: "center" },
                gap: 2,
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {sidebarOpen ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={uploadAllLoadCells}
                  disabled={uploading}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  {uploading ? <CircularProgress size={20} color="inherit" /> : "Lưu"}
                </Button>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleOpenDialog}
                    sx={{ flex: { xs: 1, sm: "initial" } }}
                  >
                    <AddIcon />
                    Thêm Kệ
                  </Button>

                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => setShelfInfoOpen(true)}
                    disabled={uploading}
                    sx={{ flex: { xs: 1, sm: "initial" } }}
                  >
                    {uploading ? <CircularProgress size={20} color="inherit" /> : "Cập nhật"}
                  </Button>
                </Box>
              )}

              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  setSidebarOpen(!sidebarOpen)
                  sidebarOpen ? setViewChangesMode(false) : setViewChangesMode(true)
                }}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {sidebarOpen ? "Hủy thay đổi" : "Thay đổi hàng hóa"}
              </Button>
            </Box>
          </Box>

          {/* Loading cho shelf items */}
          {loadCellsLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 400,
              }}
            >
              <CircularProgress />
              <Typography variant="h6" sx={{ ml: 2 }}>
                Đang tải dữ liệu kệ...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[0, 1, 2].map((level) => (
                <Box key={level}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 'bold',
                      color: 'primary.main',
                      borderLeft: '4px solid',
                      borderColor: 'primary.main',
                      pl: 2
                    }}
                  >
                    Tầng {level + 1}
                  </Typography>
                  <Grid container spacing={2}>
                    {[0, 1, 2, 3, 4].map((compartment, index) => {
                      const cellIndex = level * 5 + compartment;
                      const cell = shelfItems.find(
                        (item) => item.floor === level + 1 && item.column === compartment + 1
                      );
                      const quantity =
                        realtimeQuantities[cellIndex] !== undefined
                          ? realtimeQuantities[cellIndex]
                          : cell?.quantity ?? 0;

                      return (
                        <Grid component="div" size={{ xs: 6, sm: 4, md: 2.4 }} key={index}>
                          <ShelfCompartment
                            level={level}
                            quantity={quantity}
                            compartment={compartment}
                            shelfItem={cell || null}
                            handleDragOver={handleDragOver}
                            handleDrop={handleDrop}
                            handleRemoveFromShelf={handleRemoveFromShelf}
                            onViewProductInfo={handleViewProductInfo}
                            onUpdateQuantity={handleUpdateQuantity} // Thêm prop mới
                            onUpdateThreshold={handleUpdateThreshold} // Thêm prop mới
                            // pass handler that accepts contextual info
                            handleCreateNotification={(loadCellId, product, qty, thresh) =>
                              handleCreateNotification(loadCellId, product, qty, thresh)
                            }
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              ))}
            </Box>
          )}

          <>
            <ShelfStatistics shelf={activeShelf} loadCells={loadCells} />

            <ShelvesOverview
              shelves={shelves}
              activeShelfId={activeShelfId}
              setActiveShelfId={setActiveShelfId}
            />
          </>
        </Container>
      </Box>

      <AddShelfDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onShelfAdded={handleShelfAdded}
      />

      <ProductDialog
        open={productDialogOpen}
        onClose={handleCloseProductDialog}
        onSave={handleSaveProduct}
        product={selectedProduct}
      />

      <ShelfInfoDialog
        open={shelfInfoOpen}
        onClose={() => setShelfInfoOpen(false)}
        shelf={activeShelf}
        loadCells={loadCells}
      />

      <TaskDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        onSave={(taskData) => {
          console.log("Dữ liệu công việc:", taskData);
          setTaskDialogOpen(false);
        }}
        employees={employees}
      />
    </Box>
  );
}
