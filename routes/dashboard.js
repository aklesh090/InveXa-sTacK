const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Sale = require('../models/Sale');

// GET /api/dashboard/stats - all stats in one call
router.get('/stats', async (req, res) => {
    try {
        const products = await Product.find();

        const totalProducts = products.length;
        const totalValue = products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);
        const lowStockCount = products.filter(p => p.currentStock <= p.minimumStock).length;

        // Expiring within 30 days
        const now = new Date();
        const in30Days = new Date();
        in30Days.setDate(in30Days.getDate() + 30);
        const expiringCount = products.filter(p => {
            const expiry = new Date(p.expiryDate);
            return expiry <= in30Days;
        }).length;

        // Last 7-day sales summary
        const since7Days = new Date();
        since7Days.setDate(since7Days.getDate() - 7);
        const recentSales = await Sale.find({ saleDate: { $gte: since7Days } }).sort({ saleDate: 1 });

        // Aggregate by date
        const salesByDate = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            salesByDate[dateStr] = { date: dateStr, totalSales: 0, transactions: 0 };
        }

        recentSales.forEach(sale => {
            const dateStr = new Date(sale.saleDate).toISOString().split('T')[0];
            if (salesByDate[dateStr]) {
                salesByDate[dateStr].totalSales += sale.totalAmount;
                salesByDate[dateStr].transactions += 1;
            }
        });

        const salesTrend = Object.values(salesByDate);
        const totalRevenue7d = salesTrend.reduce((sum, d) => sum + d.totalSales, 0);

        // Category distribution
        const categoryMap = {};
        products.forEach(p => {
            if (!categoryMap[p.category]) categoryMap[p.category] = 0;
            categoryMap[p.category]++;
        });

        res.json({
            totalProducts,
            totalValue: parseFloat(totalValue.toFixed(2)),
            lowStockCount,
            expiringCount,
            salesTrend,
            totalRevenue7d: parseFloat(totalRevenue7d.toFixed(2)),
            categoryDistribution: categoryMap
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
