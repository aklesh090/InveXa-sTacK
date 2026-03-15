require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Supplier = require('./models/Supplier');
const Sale = require('./models/Sale');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_inventory';

const categories = [
    { name: 'Fruits', description: 'Fresh fruits and seasonal produce' },
    { name: 'Vegetables', description: 'Fresh vegetables and greens' },
    { name: 'Dairy', description: 'Milk, cheese, butter and dairy products' },
    { name: 'Meat', description: 'Fresh meat and poultry' },
    { name: 'Beverages', description: 'Drinks, juices and beverages' },
    { name: 'Snacks', description: 'Packaged snacks and chips' },
    { name: 'Frozen', description: 'Frozen foods and ready meals' },
    { name: 'Bakery', description: 'Bread, cakes and baked goods' }
];

const suppliers = [
    {
        name: 'Fresh Farms Co',
        contact: 'John Smith',
        phone: '(555) 123-4567',
        email: 'orders@freshfarms.com',
        reliability: 95,
        avgLeadTime: 2,
        totalOrders: 156,
        onTimeDelivery: 98
    },
    {
        name: 'Dairy Fresh Ltd',
        contact: 'Sarah Johnson',
        phone: '(555) 234-5678',
        email: 'supply@dairyfresh.com',
        reliability: 88,
        avgLeadTime: 1,
        totalOrders: 203,
        onTimeDelivery: 92
    },
    {
        name: 'Golden Bakery',
        contact: 'Mike Brown',
        phone: '(555) 345-6789',
        email: 'orders@goldenbakery.com',
        reliability: 92,
        avgLeadTime: 1,
        totalOrders: 87,
        onTimeDelivery: 95
    },
    {
        name: 'Quality Meats Inc',
        contact: 'Lisa Wilson',
        phone: '(555) 456-7890',
        email: 'supply@qualitymeats.com',
        reliability: 90,
        avgLeadTime: 3,
        totalOrders: 134,
        onTimeDelivery: 88
    },
    {
        name: 'Beverage Distributors',
        contact: 'Tom Davis',
        phone: '(555) 567-8901',
        email: 'orders@bevdist.com',
        reliability: 85,
        avgLeadTime: 2,
        totalOrders: 245,
        onTimeDelivery: 90
    },
    {
        name: 'Garden Valley',
        contact: 'Emma Green',
        phone: '(555) 678-9012',
        email: 'supply@gardenvalley.com',
        reliability: 93,
        avgLeadTime: 1,
        totalOrders: 178,
        onTimeDelivery: 96
    },
    {
        name: 'Artisan Cheese Co',
        contact: 'Robert White',
        phone: '(555) 789-0123',
        email: 'orders@artisancheese.com',
        reliability: 89,
        avgLeadTime: 4,
        totalOrders: 67,
        onTimeDelivery: 87
    }
];

// Helper: offset date from today
const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
};
const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
};

const products = [
    {
        name: 'Organic Bananas',
        category: 'Fruits',
        currentStock: 45,
        minimumStock: 20,
        maxStock: 100,
        costPrice: 1.20,
        sellingPrice: 2.99,
        supplier: 'Fresh Farms Co',
        expiryDate: daysFromNow(9),
        batchNumber: 'BN001',
        lastRestocked: daysAgo(2),
        salesVelocity: 15,
        location: 'Aisle 1-A',
        barcode: '8901030875201'
    },
    {
        name: 'Whole Milk 1L',
        category: 'Dairy',
        currentStock: 8,
        minimumStock: 25,
        maxStock: 80,
        costPrice: 2.10,
        sellingPrice: 3.49,
        supplier: 'Dairy Fresh Ltd',
        expiryDate: daysFromNow(7),
        batchNumber: 'ML045',
        lastRestocked: daysAgo(1),
        salesVelocity: 25,
        location: 'Cooler 2-B',
        barcode: '8901030875202'
    },
    {
        name: 'Artisan White Bread',
        category: 'Bakery',
        currentStock: 5,
        minimumStock: 15,
        maxStock: 50,
        costPrice: 1.50,
        sellingPrice: 2.79,
        supplier: 'Golden Bakery',
        expiryDate: daysFromNow(2),
        batchNumber: 'BR232',
        lastRestocked: daysAgo(1),
        salesVelocity: 12,
        location: 'Bakery Section',
        barcode: '8901030875203'
    },
    {
        name: 'Premium Chicken Breast',
        category: 'Meat',
        currentStock: 28,
        minimumStock: 10,
        maxStock: 60,
        costPrice: 5.50,
        sellingPrice: 8.99,
        supplier: 'Quality Meats Inc',
        expiryDate: daysFromNow(5),
        batchNumber: 'CB891',
        lastRestocked: daysAgo(1),
        salesVelocity: 8,
        location: 'Meat Counter',
        barcode: '8901030875204'
    },
    {
        name: 'Coca Cola 2L',
        category: 'Beverages',
        currentStock: 22,
        minimumStock: 20,
        maxStock: 120,
        costPrice: 2.80,
        sellingPrice: 4.99,
        supplier: 'Beverage Distributors',
        expiryDate: daysFromNow(295),
        batchNumber: 'CC445',
        lastRestocked: daysAgo(6),
        salesVelocity: 18,
        location: 'Aisle 3-C',
        barcode: '8901030875205'
    },
    {
        name: 'Fresh Carrots 2lb',
        category: 'Vegetables',
        currentStock: 35,
        minimumStock: 15,
        maxStock: 70,
        costPrice: 0.99,
        sellingPrice: 1.99,
        supplier: 'Garden Valley',
        expiryDate: daysFromNow(14),
        batchNumber: 'CR156',
        lastRestocked: daysAgo(3),
        salesVelocity: 10,
        location: 'Produce Section',
        barcode: '8901030875206'
    },
    {
        name: 'Aged Cheddar Cheese',
        category: 'Dairy',
        currentStock: 3,
        minimumStock: 12,
        maxStock: 40,
        costPrice: 3.20,
        sellingPrice: 5.49,
        supplier: 'Artisan Cheese Co',
        expiryDate: daysFromNow(21),
        batchNumber: 'CH789',
        lastRestocked: daysAgo(10),
        salesVelocity: 6,
        location: 'Deli Counter',
        barcode: '8901030875207'
    },
    {
        name: 'Lays Classic Chips',
        category: 'Snacks',
        currentStock: 60,
        minimumStock: 20,
        maxStock: 150,
        costPrice: 1.50,
        sellingPrice: 2.99,
        supplier: 'Beverage Distributors',
        expiryDate: daysFromNow(120),
        batchNumber: 'LC001',
        lastRestocked: daysAgo(5),
        salesVelocity: 20,
        location: 'Aisle 4-B',
        barcode: '8901030875208'
    },
    {
        name: 'Frozen Peas 500g',
        category: 'Frozen',
        currentStock: 40,
        minimumStock: 10,
        maxStock: 80,
        costPrice: 1.10,
        sellingPrice: 2.49,
        supplier: 'Garden Valley',
        expiryDate: daysFromNow(365),
        batchNumber: 'FP100',
        lastRestocked: daysAgo(7),
        salesVelocity: 7,
        location: 'Freezer 1-A',
        barcode: '8901030875209'
    },
    {
        name: 'Orange Juice 1L',
        category: 'Beverages',
        currentStock: 30,
        minimumStock: 15,
        maxStock: 90,
        costPrice: 2.20,
        sellingPrice: 3.99,
        supplier: 'Beverage Distributors',
        expiryDate: daysFromNow(21),
        batchNumber: 'OJ200',
        lastRestocked: daysAgo(2),
        salesVelocity: 14,
        location: 'Cooler 3-A',
        barcode: '8901030875210'
    }
];

// Generate some historical sales for charts
function generateSalesData() {
    const sales = [];
    for (let i = 6; i >= 0; i--) {
        const saleDate = daysAgo(i);
        const numTransactions = Math.floor(Math.random() * 5) + 3;
        for (let t = 0; t < numTransactions; t++) {
            const total = parseFloat((Math.random() * 500 + 100).toFixed(2));
            sales.push({
                saleDate,
                items: [
                    {
                        productId: new mongoose.Types.ObjectId(),
                        productName: 'Sample Product',
                        quantity: Math.floor(Math.random() * 10) + 1,
                        price: parseFloat((Math.random() * 50 + 5).toFixed(2)),
                        subtotal: total
                    }
                ],
                totalAmount: total,
                notes: 'Seeded historical sale'
            });
        }
    }
    return sales;
}

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Promise.all([
            Product.deleteMany({}),
            Category.deleteMany({}),
            Supplier.deleteMany({}),
            Sale.deleteMany({})
        ]);
        console.log('🗑️  Cleared existing data');

        // Insert categories
        const insertedCategories = await Category.insertMany(categories);
        console.log(`✅ Inserted ${insertedCategories.length} categories`);

        // Insert suppliers
        const insertedSuppliers = await Supplier.insertMany(suppliers);
        console.log(`✅ Inserted ${insertedSuppliers.length} suppliers`);

        // Insert products
        const insertedProducts = await Product.insertMany(products);
        console.log(`✅ Inserted ${insertedProducts.length} products`);

        // Insert historical sales for charts
        const historicalSales = generateSalesData();
        await Sale.insertMany(historicalSales);
        console.log(`✅ Inserted ${historicalSales.length} historical sales records`);

        console.log('\n🎉 Database seeded successfully!');
        console.log('   Run: node server.js  to start the server');
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

seed();
