const express = require('express');
const router = express.Router();
const StockAdjustment = require('../models/StockAdjustment');

// GET /api/stock-adjustments
router.get('/', async (req, res) => {
    try {
        const { productId, limit = 50 } = req.query;
        let query = {};
        if (productId) query.productId = productId;

        const adjustments = await StockAdjustment.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json(adjustments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
