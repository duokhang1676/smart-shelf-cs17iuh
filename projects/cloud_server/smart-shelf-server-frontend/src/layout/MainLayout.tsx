import React from "react";
import { Outlet } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Drawer,
  List,
  ListItem,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Inventory as InventoryIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import HeaderBar from "../components/HeaderBar";

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <div className="min-h-screen flex flex-col" style={{ width: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <HeaderBar />

      {/* Main Content */}
      <main className="flex-grow" style={{ width: '100%' }}>
        <div 
          style={{
            width: '100%',
            maxWidth: '100%',
            margin: '0 auto',
            paddingLeft: isSmallMobile ? '8px' : isMobile ? '16px' : '32px',
            paddingRight: isSmallMobile ? '8px' : isMobile ? '16px' : '32px',
            paddingTop: isMobile ? '16px' : '32px',
            paddingBottom: isMobile ? '16px' : '32px',
            boxSizing: 'border-box',
          }}
        >
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
