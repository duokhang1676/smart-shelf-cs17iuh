import React from "react";
import { Box, Paper, Typography, Button, List, ListItem, ListItemText } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ShelfRealtimePanel from "../components/ShelfRealtimePanel";
import useMqtt from "../lib/useMqtt";
import StatsCharts from "../components/StatsCharts";
import { getRevenueStatistics, getTopProducts, getProductStats } from "../service/statistics.service";
import { useState, useEffect } from "react";

const StatCard: React.FC<{ title: React.ReactNode; value: React.ReactNode; onClick?: () => void }> = ({ title, value, onClick }) => (
  <Paper elevation={2} sx={{ p: 2, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
    <Typography variant="subtitle2" color="textSecondary">
      {title}
    </Typography>
    <Typography variant="h4" sx={{ mt: 1 }}>
      {value}
    </Typography>
  </Paper>
);

export default function DashboardPage() {
  const navigate = useNavigate();

  const [loadingStats, setLoadingStats] = useState(true);
  const [topProducts, setTopProducts] = React.useState<{ name: string; count: number }[]>([]);
  const [revenueSeries, setRevenueSeries] = React.useState<{ period: string; revenue: number }[]>([]);
  const [overview, setOverview] = React.useState({ shelves: 0, products: 0, orders: 0, users: 0 });
  const [totalRevenue, setTotalRevenue] = React.useState(0);
  const [totalPaidOrders, setTotalPaidOrders] = React.useState(0);

  // connect to mqtt and subscribe topics
  const { connected, sensor, loadcellQuantities, tracking, status } = useMqtt({
    host: "broker.hivemq.com",
    port: 8884,
    path: "/mqtt",
    topics: [
      "shelf/sensor/environment",
      "shelf/loadcell/quantity",
      "shelf/tracking/unpaid_customer",
      "shelf/status/data",
    ],
  });

  // fetch statistics from BE
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoadingStats(true);
        
        // top products - API response: { success: true, data: { productStatistics: [...], summary: {...} } }
        const topRes = await getTopProducts({ limit: 6 });
        console.log('Top Products API Response:', topRes);
        
        // Extract productStatistics array từ response
        const prodStats = topRes?.data?.productStatistics || [];
        console.log('Product Statistics Array:', prodStats);
        
        const top = prodStats.map((p: any) => ({ 
          name: p.productName || p.product_name || 'Unknown', 
          count: p.totalQuantitySold || 0 
        }));
        console.log('Normalized Top Products:', top);

        // revenue series (monthly for last 6 months)
        const revRes = await getRevenueStatistics({ period: 'monthly', year: new Date().getFullYear() });
        // revRes may be { success:true, data: { statistics: [...] , summary: {...} } }
        const rawStats = revRes?.data?.statistics ?? revRes?.statistics ?? revRes?.data ?? [];
        const statsArray = Array.isArray(rawStats) ? rawStats : (Array.isArray(rawStats.statistics) ? rawStats.statistics : []);
        const revData = statsArray.map((s: any) => {
          // some responses use s.period = { year, month } others use s._id
          const periodObj = s.period ?? s._id ?? {};
          const year = periodObj.year;
          const month = periodObj.month;
          const label = month ? `Th${String(month).padStart(2, '0')}/${year}` : (year ? String(year) : (s.date ? new Date(s.date).toLocaleDateString() : ''));
          return { period: label, revenue: s.totalRevenue ?? s.totalAmount ?? s.revenue ?? 0 };
        });

        // overall product stats for counts - same API, different limit
        const prodRes = await getProductStats({ limit: 0 });
        console.log('Product Stats API Response:', prodRes);

        if (!mounted) return;
        
        // Extract summary từ response
        const prodSummary = prodRes?.data?.summary || {};
        const revSummary = revRes?.data?.summary || {};
        console.log('Product Summary:', prodSummary);
        console.log('Revenue Summary:', revSummary);

        setTopProducts(top);
        setRevenueSeries(revData);
        setTotalRevenue(revSummary.totalRevenue ?? 0);
        setTotalPaidOrders(revSummary.totalOrders ?? 0);
        setOverview({
          shelves: 0,
          products: prodSummary.uniqueProductCount ?? prodSummary.uniqueProducts ?? 0,
          orders: revSummary.totalOrders ?? revSummary.total_orders ?? 0,
          users: 0,
        });
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  console.log(revenueSeries);
  

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Thống kê tổng quan */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard 
          title="Tổng doanh thu (đã thanh toán)" 
          value={new Intl.NumberFormat('vi-VN').format(totalRevenue) + ' đ'}
        />
        <StatCard 
          title="Đơn hàng đã thanh toán" 
          value={totalPaidOrders}
        />
        <StatCard 
          title="Sản phẩm đã bán" 
          value={overview.products}
        />
        <StatCard 
          title="Giá trị TB/đơn" 
          value={totalPaidOrders > 0 ? new Intl.NumberFormat('vi-VN').format(Math.round(totalRevenue / totalPaidOrders)) + ' đ' : '0 đ'}
        />
      </Box>

      <Box sx={{ my: 2 }}>
        <ShelfRealtimePanel
          sensor={sensor}
          status={status}
          useLocalStorageFallback={true}
          sx={{ mt: 1 }}
        />
      </Box>


      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 70%' }, minWidth: { xs: '100%', md: 300 } }}>
          <StatsCharts products={topProducts} revenue={revenueSeries} />
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 5%' }, minWidth: { xs: '100%', md: 240 } }}>
          <Paper variant="outlined" sx={{ p: 2, width: '100%' }}>
            <Typography variant="subtitle1" gutterBottom>
              Top sản phẩm
            </Typography>
            <List dense>
              {topProducts && topProducts.length ? (
                topProducts.map((p, idx) => (
                  <ListItem key={idx}>
                    <ListItemText primary={p.name} secondary={`Số lượng: ${p.count}`} />
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary={loadingStats ? 'Đang tải...' : 'Không có dữ liệu'} />
                </ListItem>
              )}
            </List>
          </Paper>
        </Box>
      </Box>

    </Box>
  );
}