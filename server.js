require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_inventory';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// ─── Serve frontend static files ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/stock-adjustments', require('./routes/stockAdjustments'));
app.use('/api/reorder', require('./routes/reorder'));
app.use('/api/auth', require('./routes/auth'));

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        const Product = require('./models/Product');
        const Category = require('./models/Category');
        const Supplier = require('./models/Supplier');

        const [pCount, cCount, sCount] = await Promise.all([
            Product.countDocuments(),
            Category.countDocuments(),
            Supplier.countDocuments()
        ]);

        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
            products: pCount,
            categories: cCount,
            suppliers: sCount
        });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', error: err.message });
    }
});

// ─── Login page route (login is now integrated into index.html) ────────────────
app.get('/login', (req, res) => {
    res.redirect('/');
});

// ─── Catch-all: serve HTML pages or 404 for API routes ────────────────────────
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    // Serve the requested HTML file if it exists, otherwise fall back to index.html
    const requestedFile = path.join(__dirname, req.path);
    res.sendFile(requestedFile, (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, 'index.html'));
        }
    });
});

// ─── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err.stack);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ─── MongoDB Connection ────────────────────────────────────────────────────────
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log(`✅ MongoDB connected: ${MONGODB_URI}`);
        app.listen(PORT, () => {
            console.log(`\n🚀 InveXa sTacK Backend running on http://localhost:${PORT}`);
            console.log(`📊 Dashboard:    http://localhost:${PORT}`);
            console.log(`🔌 API Health:   http://localhost:${PORT}/api/health`);
            console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
            console.log(`\n💡 First time? Run: node seed.js  (to populate sample data)`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        console.error('\n💡 Make sure MongoDB is running:');
        console.error('   - Local: mongod (or start MongoDB service)');
        console.error('   - Or update MONGODB_URI in .env file with your Atlas connection string\n');
        process.exit(1);
    });

module.exports = app;
