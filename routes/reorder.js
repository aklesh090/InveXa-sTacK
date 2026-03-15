const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const ReorderLog = require('../models/ReorderLog');

// Configure email transporter
function createTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: { rejectUnauthorized: false }
    });
}

// POST /api/reorder — Send reorder email to supplier
router.post('/', async (req, res) => {
    try {
        const { productId, quantity, notes } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        // Fetch product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Find supplier by name (since product stores supplier as string)
        const supplier = await Supplier.findOne({ name: product.supplier });
        if (!supplier) {
            return res.status(404).json({ error: `Supplier "${product.supplier}" not found in database. Please add the supplier first.` });
        }

        if (!supplier.email) {
            return res.status(400).json({ error: `Supplier "${supplier.name}" does not have an email address. Please update supplier details.` });
        }

        const reorderQty = quantity || Math.max(product.maxStock - product.currentStock, product.minimumStock * 2);

        // Build email
        const emailSubject = `Reorder Request – InveXa sTacK`;
        const emailBody = `
Dear ${supplier.name},

We would like to place a reorder for the following item:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Product:         ${product.name}
Quantity:        ${reorderQty} units
Current Stock:   ${product.currentStock} units
Reorder Level:   ${product.minimumStock} units
Batch Number:    ${product.batchNumber || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${notes ? `Additional Notes: ${notes}\n` : ''}
Please confirm availability and expected delivery time.

Regards,
InveXa sTacK Inventory System
📧 ${process.env.EMAIL_USER}
        `.trim();

        // Create reorder log entry
        const reorderLog = new ReorderLog({
            productId: product._id,
            productName: product.name,
            supplierId: supplier._id,
            supplierName: supplier.name,
            supplierEmail: supplier.email,
            reorderQuantity: reorderQty,
            currentStock: product.currentStock,
            reorderLevel: product.minimumStock,
            emailStatus: 'pending',
            notes: notes || ''
        });

        // Send email
        try {
            const transporter = createTransporter();
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: supplier.email,
                subject: emailSubject,
                text: emailBody
            };
            // CC the store manager so they also receive the email
            if (process.env.MANAGER_EMAIL) {
                mailOptions.cc = process.env.MANAGER_EMAIL;
            }
            await transporter.sendMail(mailOptions);

            reorderLog.emailStatus = 'sent';
            await reorderLog.save();

            res.status(201).json({
                success: true,
                message: `Reorder email sent to ${supplier.name} (${supplier.email})${process.env.MANAGER_EMAIL ? ' — CC: ' + process.env.MANAGER_EMAIL : ''}`,
                reorderLog: reorderLog
            });

        } catch (emailErr) {
            reorderLog.emailStatus = 'failed';
            reorderLog.emailError = emailErr.message;
            await reorderLog.save();

            // Provide clear instructions based on error type
            let suggestion = '';
            if (emailErr.message.includes('Invalid login') || emailErr.message.includes('auth') || emailErr.message.includes('Username and Password not accepted')) {
                suggestion = 'Gmail requires an App Password for SMTP. Go to https://myaccount.google.com/apppasswords to generate one, then update EMAIL_PASS in your .env file.';
            } else {
                suggestion = 'Check your internet connection and email credentials in the .env file.';
            }

            res.status(500).json({
                success: false,
                error: `Email failed: ${emailErr.message}`,
                suggestion: suggestion,
                reorderLog: reorderLog
            });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reorder — List reorder logs
router.get('/', async (req, res) => {
    try {
        const logs = await ReorderLog.find().sort({ createdAt: -1 }).limit(50);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/reorder/:id/status — Update order status
router.patch('/:id/status', async (req, res) => {
    try {
        const { orderStatus } = req.body;
        const log = await ReorderLog.findByIdAndUpdate(
            req.params.id,
            { orderStatus },
            { new: true }
        );
        if (!log) return res.status(404).json({ error: 'Reorder log not found' });
        res.json(log);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
