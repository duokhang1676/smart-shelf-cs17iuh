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

  // connect to mqtt and subscribe topics
  const { connected, sensor, loadcellQuantities, tracking, status } = useMqtt({
    host: "broker.hivemq.com",
    port: 8000,
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
        // top products
  const topRes = await getTopProducts({ limit: 6 });
  // topRes may be the axios "data" object: { success: true, data: { productStatistics: [...] } }
  // or it may already be the inner data depending on service. Normalize possible shapes:
  let prodStats: any[] = [];
  if (Array.isArray(topRes?.data)) prodStats = topRes.data;
  else if (Array.isArray(topRes?.data?.productStatistics)) prodStats = topRes.data.productStatistics;
  else if (Array.isArray(topRes?.productStatistics)) prodStats = topRes.productStatistics;
  else if (Array.isArray(topRes)) prodStats = topRes;
  const top = prodStats.map((p: any) => ({ name: p.productName || p.product_name || p.name || 'Unknown', count: p.totalQuantitySold ?? p.totalQuantity ?? p.count ?? 0 }));

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

        // overall product stats for counts
  const prodRes = await getProductStats({ limit: 10 });

        if (!mounted) return;
        // extract product summary safely
        const prodSummary = prodRes?.data?.summary ?? prodRes?.summary ?? prodRes?.data ?? {};
        const revSummary = revRes?.data?.summary ?? revRes?.summary ?? revRes?.summary ?? {};

        setTopProducts(top);
        setRevenueSeries(revData);
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ my: 2 }}>
        <ShelfRealtimePanel
          sensor={sensor}
          status={status}
          useLocalStorageFallback={true}
          sx={{ mt: 1 }}
        />
      </Box>


      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 70%', minWidth: 300 }}>
          <StatsCharts products={topProducts} revenue={revenueSeries} />
        </Box>
        <Box sx={{ flex: '1 1 5%', minWidth: 240 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
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