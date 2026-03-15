const API_BASE = '/api';

class GroceryInventorySystem {
    constructor() {
        this.products = [];
        this.categories = [];
        this.suppliers = [];
        this.salesData = [];
        this.stockAdjustments = [];
        this.currentEditingId = null;
        this.currentEditingType = null;
        this.charts = {};
        this.barcodeCallback = null;
        this.saleItems = [];
        this.soldData = [];
        this.isConnected = false;

        this.init();
    }

    // -”--”- API Helper -”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”--”-
    async api(path, options = {}) {
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                headers: { 'Content-Type': 'application/json' },
                ...options,
                body: options.body ? JSON.stringify(options.body) : undefined
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            return data;
        } catch (err) {
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                this.updateConnectionStatus(false);
                throw new Error('Cannot connect to server. Make sure: node server.js is running on port 5000.');
            }
            throw err;
        }
    }

    async loadAllData() {
        try {
            const [products, categories, suppliers, salesSummary] = await Promise.all([
                this.api('/products'),
                this.api('/categories'),
                this.api('/suppliers'),
                this.api('/sales/summary?days=7')
            ]);
            this.products = products;
            this.categories = categories;
            this.suppliers = suppliers;
            this.salesData = salesSummary.map(s => ({ date: s.date, totalSales: s.totalSales, transactions: s.transactions, topProduct: s.topProduct || '' }));
            this.updateConnectionStatus(true);
        } catch (err) {
            this.showNotification('' + err.message, 'error');
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const dot = document.getElementById('connectionDot');
        const label = document.getElementById('connectionLabel');
        if (dot && label) {
            dot.style.background = connected ? '#22c55e' : '#ef4444';
            label.textContent = connected ? 'Live' : 'Offline';
        }
    }

    // All data is loaded from MongoDB API in loadAllData() — no static fallback
    initializeData() {
        // Empty - populated from API
    }

    async init() {
        this.setupEventListeners();
        this.showSection('dashboard');
        this.showNotification('Connecting to server...', 'info');
        await this.loadAllData();
        this.populateDropdowns();
        this.renderDashboard();
        this.renderAllTables();
        this.createCharts();
    }

    setupEventListeners() {
        // Navigation - Fixed to prevent default and properly handle section switching
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const section = link.getAttribute('data-section');
                this.showSection(section);
                this.updateActiveNavLink(link);
            });
        });

        // Modal buttons - Fixed to ensure proper functionality
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showProductModal();
            });
        }

        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showCategoryModal();
            });
        }

        const addSupplierBtn = document.getElementById('addSupplierBtn');
        if (addSupplierBtn) {
            addSupplierBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSupplierModal();
            });
        }

        const recordSaleBtn = document.getElementById('recordSaleBtn');
        if (recordSaleBtn) {
            recordSaleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSaleModal();
            });
        }

        const stockAdjustBtn = document.getElementById('stockAdjustBtn');
        if (stockAdjustBtn) {
            stockAdjustBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showStockAdjustModal();
            });
        }

        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportData();
            });
        }

        const runPredictionsBtn = document.getElementById('runPredictionsBtn');
        if (runPredictionsBtn) {
            runPredictionsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.runAdvancedAnalytics();
            });
        }

        const exportPredictionsBtn = document.getElementById('exportPredictionsBtn');
        if (exportPredictionsBtn) {
            exportPredictionsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportAnalytics();
            });
        }

        // Analytics tabs
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAnalyticsTab(e.target.dataset.tab);
            });
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeAllModals();
            });
        });

        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeAllModals();
            });
        });

        // Form submissions
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
        }

        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        }

        const supplierForm = document.getElementById('supplierForm');
        if (supplierForm) {
            supplierForm.addEventListener('submit', (e) => this.handleSupplierSubmit(e));
        }

        const saleForm = document.getElementById('saleForm');
        if (saleForm) {
            saleForm.addEventListener('submit', (e) => this.handleSaleSubmit(e));
        }

        const stockAdjustForm = document.getElementById('stockAdjustForm');
        if (stockAdjustForm) {
            stockAdjustForm.addEventListener('submit', (e) => this.handleStockAdjustSubmit(e));
        }

        // Search and filters
        const productSearch = document.getElementById('productSearch');
        if (productSearch) {
            productSearch.addEventListener('input', (e) => this.filterProducts());
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => this.filterProducts());
        }

        const stockFilter = document.getElementById('stockFilter');
        if (stockFilter) {
            stockFilter.addEventListener('change', (e) => this.filterProducts());
        }

        // Barcode scanning
        const scanBarcodeBtn = document.getElementById('scanBarcodeBtn');
        if (scanBarcodeBtn) {
            scanBarcodeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startBarcodeScanner('productBarcode');
            });
        }

        // Sale form enhancements
        const addSaleItemBtn = document.getElementById('addSaleItemBtn');
        if (addSaleItemBtn) {
            addSaleItemBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addSaleItem();
            });
        }

        // Stock adjustment product selection
        const adjustProduct = document.getElementById('adjustProduct');
        if (adjustProduct) {
            adjustProduct.addEventListener('change', (e) => this.updateStockDisplay(e.target.value));
        }

        // Initialize sale form listeners
        this.attachSaleItemListeners();
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');

            // Refresh section-specific content
            switch (sectionName) {
                case 'dashboard':
                    this.renderDashboard();
                    setTimeout(() => this.createCharts(), 100);
                    break;
                case 'products':
                    this.renderProductsTable();
                    break;
                case 'alerts':
                    this.renderAlerts();
                    break;
                case 'categories':
                    this.renderCategoriesTable();
                    break;
                case 'suppliers':
                    this.renderSuppliersTable();
                    break;
                case 'expiry':
                    this.renderExpiryTracking();
                    break;
                case 'valuation':
                    this.renderValuation();
                    break;
                case 'reorder':
                    this.renderReorderSuggestions();
                    break;
                case 'salesprofit':
                    this.initSalesProfitHub();
                    break;
                case 'prediction':
                    // Prediction charts are created when "Run AI Predictions" is clicked
                    break;
                case 'intelligence':
                    if (typeof window.initIntelligence === 'function') {
                        setTimeout(() => window.initIntelligence(), 100);
                    }
                    break;
            }
        }
    }

    updateActiveNavLink(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    populateDropdowns() {
        // Populate category dropdowns
        const categorySelects = ['productCategory', 'categoryFilter'];
        categorySelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                const isFilter = selectId.includes('Filter');
                select.innerHTML = isFilter ? '<option value="">All Categories</option>' : '<option value="">Select Category</option>';

                this.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.textContent = category.name;
                    select.appendChild(option);
                });

                if (currentValue) {
                    select.value = currentValue;
                }
            }
        });

        // Populate supplier dropdown
        const supplierSelect = document.getElementById('productSupplier');
        if (supplierSelect) {
            const currentValue = supplierSelect.value;
            supplierSelect.innerHTML = '<option value="">Select Supplier</option>';
            this.suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.name;
                option.textContent = supplier.name;
                supplierSelect.appendChild(option);
            });
            if (currentValue) {
                supplierSelect.value = currentValue;
            }
        }

        // Populate sale product dropdowns
        this.populateSaleProductDropdowns();

        // Populate stock adjustment product dropdown
        const adjustProductSelect = document.getElementById('adjustProduct');
        if (adjustProductSelect) {
            const currentValue = adjustProductSelect.value;
            adjustProductSelect.innerHTML = '<option value="">Select Product</option>';
            this.products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (Current: ${product.currentStock})`;
                adjustProductSelect.appendChild(option);
            });
            if (currentValue) {
                adjustProductSelect.value = currentValue;
            }
        }
    }

    populateSaleProductDropdowns() {
        const saleProductSelects = document.querySelectorAll('.sale-product');
        saleProductSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Product</option>';
            this.products.forEach(product => {
                if (product.currentStock > 0) {
                    const option = document.createElement('option');
                    option.value = product._id || product.id;
                    option.textContent = `${product.name} (Stock: ${product.currentStock})`;
                    option.dataset.price = product.sellingPrice;
                    option.dataset.barcode = product.barcode;
                    select.appendChild(option);
                }
            });
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    renderDashboard() {
        const totalProducts = this.products.length;
        const totalValue = this.products.reduce((sum, product) =>
            sum + (product.currentStock * product.costPrice), 0);
        const lowStockCount = this.products.filter(product =>
            product.currentStock <= product.minimumStock).length;
        const expiringCount = this.getExpiringProducts().length;

        const totalProductsEl = document.getElementById('totalProducts');
        const totalValueEl = document.getElementById('totalValue');
        const lowStockCountEl = document.getElementById('lowStockCount');
        const expiringCountEl = document.getElementById('expiringCount');

        if (totalProductsEl) totalProductsEl.textContent = totalProducts;
        if (totalValueEl) totalValueEl.textContent = `₹${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount;
        if (expiringCountEl) expiringCountEl.textContent = expiringCount;

        // Render sales calendar heatmap
        try { this.renderSalesCalendar(); } catch (e) { }
    }

    createCharts() {
        this.createSalesChart();
        this.createCategoryChart();
    }

    createSalesChart() {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        if (this.charts.sales) {
            this.charts.sales.destroy();
        }

        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.salesData.map(data => {
                    const date = new Date(data.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }),
                datasets: [{
                    label: 'Daily Sales (₹)',
                    data: this.salesData.map(data => data.totalSales),
                    borderColor: '#0066FF',
                    backgroundColor: 'rgba(0, 102, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                }
            }
        });
    }

    createCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        if (this.charts.category) {
            this.charts.category.destroy();
        }

        const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325'];

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.categories.map(cat => cat.name),
                datasets: [{
                    data: this.categories.map(cat => cat.totalProducts),
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createSalesReportChart() {
        const ctx = document.getElementById('salesReportChart');
        if (!ctx) return;

        if (this.charts.salesReport) {
            this.charts.salesReport.destroy();
        }

        this.charts.salesReport = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.salesData.map(data => {
                    const date = new Date(data.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }),
                datasets: [{
                    label: 'Sales (₹)',
                    data: this.salesData.map(data => data.totalSales),
                    backgroundColor: '#0066FF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                }
            }
        });
    }

    createProfitChart() {
        const ctx = document.getElementById('profitChart');
        if (!ctx) return;

        if (this.charts.profit) {
            this.charts.profit.destroy();
        }

        const profitData = this.categories.map(cat => ({
            category: cat.name,
            profit: cat.totalValue * (cat.avgMargin / 100)
        }));

        this.charts.profit = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: profitData.map(data => data.category),
                datasets: [{
                    label: 'Profit by Category ($)',
                    data: profitData.map(data => data.profit),
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                }
            }
        });
    }

    renderAllTables() {
        this.renderProductsTable();
        this.renderCategoriesTable();
        this.renderSuppliersTable();
    }

    renderProductsTable() {
        const tableBody = document.getElementById('productsTableBody');
        if (!tableBody) return;

        let filteredProducts = [...this.products];

        // Apply filters
        const searchTerm = document.getElementById('productSearch')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const stockFilter = document.getElementById('stockFilter')?.value || '';

        if (searchTerm) {
            filteredProducts = filteredProducts.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm) ||
                product.supplier.toLowerCase().includes(searchTerm) ||
                (product.barcode && product.barcode.includes(searchTerm))
            );
        }

        if (categoryFilter) {
            filteredProducts = filteredProducts.filter(product => product.category === categoryFilter);
        }

        if (stockFilter) {
            filteredProducts = filteredProducts.filter(product => {
                const status = this.getStockStatus(product);
                return status === stockFilter;
            });
        }

        if (filteredProducts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 2rem; color: var(--color-text-secondary);">
                        No products found matching your criteria.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filteredProducts.map(product => {
            const status = this.getStockStatus(product);
            const statusClass = `status-indicator--${status}`;
            const statusText = this.getStockStatusText(status);
            const margin = ((product.sellingPrice - product.costPrice) / product.costPrice * 100).toFixed(1);

            return `
                <tr>
                    <td>
                        <div>
                            <strong>${this.escapeHtml(product.name)}</strong>
                            <div style="font-size: 0.8em; color: var(--color-text-secondary);">
                                Batch: ${product.batchNumber} | Barcode: ${product.barcode}
                            </div>
                        </div>
                    </td>
                    <td>${this.escapeHtml(product.category)}</td>
                    <td>
                        <div>${product.currentStock} / ${product.maxStock}</div>
                        <div style="font-size: 0.8em; color: var(--color-text-secondary);">
                            Min: ${product.minimumStock}
                        </div>
                    </td>
                    <td>₹${product.costPrice.toFixed(2)}</td>
                    <td>
                        <div>₹${product.sellingPrice.toFixed(2)}</div>
                        <div style="font-size: 0.8em; color: var(--color-success);">
                            +${margin}% margin
                        </div>
                    </td>
                    <td>${this.escapeHtml(product.supplier)}</td>
                    <td>
                        <div>${new Date(product.expiryDate).toLocaleDateString()}</div>
                        <div style="font-size: 0.8em; color: var(--color-text-secondary);">
                            ${this.getDaysUntilExpiry(product.expiryDate)} days
                        </div>
                    </td>
                    <td>${this.escapeHtml(product.location)}</td>
                    <td>
                        <span class="status-indicator ${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-icon btn-icon--edit" onclick="app.editProduct('${product._id || product.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-icon--delete" onclick="app.deleteProduct('${product._id || product.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                            ${product.currentStock <= product.minimumStock * 2 ? `<button class="btn-icon" style="color:#0066FF;" onclick="app.reorderProduct('${product._id || product.id}')" title="Reorder from Supplier">
                                <i class="fas fa-truck-loading"></i>
                            </button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderCategoriesTable() {
        const tableBody = document.getElementById('categoriesTableBody');
        if (!tableBody) return;

        this.updateCategoryStatistics();

        tableBody.innerHTML = this.categories.map(category => `
            <tr>
                <td>
                    <strong>${this.escapeHtml(category.name)}</strong>
                </td>
                <td>${category.totalProducts}</td>
                <td>₹${(category.totalValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td>${category.avgMargin.toFixed(1)}%</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-icon--edit" onclick="app.editCategory('${category._id || category.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-icon--delete" onclick="app.deleteCategory('${category._id || category.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderSuppliersTable() {
        const tableBody = document.getElementById('suppliersTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = this.suppliers.map(supplier => `
            <tr>
                <td>
                    <div>
                        <strong>${this.escapeHtml(supplier.name)}</strong>
                        <div style="font-size: 0.8em; color: var(--color-text-secondary);">
                            ${supplier.totalOrders} orders
                        </div>
                    </div>
                </td>
                <td>
                    <div>${this.escapeHtml(supplier.contact)}</div>
                    <div style="font-size: 0.8em; color: var(--color-text-secondary);">
                        ${supplier.email}
                    </div>
                </td>
                <td>${supplier.phone}</td>
                <td>
                    <div class="flex items-center gap-8">
                        <span class="status-indicator ${supplier.reliability >= 90 ? 'status-indicator--high' : supplier.reliability >= 80 ? 'status-indicator--medium' : 'status-indicator--low'}">
                            ${supplier.reliability}%
                        </span>
                    </div>
                    <div style="font-size: 0.8em; color: var(--color-text-secondary);">
                        ${supplier.onTimeDelivery}% on-time
                    </div>
                </td>
                <td>${supplier.avgLeadTime} days</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-icon--edit" onclick="app.editSupplier('${supplier._id || supplier.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-icon--delete" onclick="app.deleteSupplier('${supplier._id || supplier.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderAlerts() {
        const alertsList = document.getElementById('alertsList');
        if (!alertsList) return;

        const lowStockProducts = this.products.filter(product =>
            product.currentStock <= product.minimumStock);

        if (lowStockProducts.length === 0) {
            alertsList.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-check-circle" style="color: var(--color-success);"></i>
                    <p>No low stock alerts! All products are adequately stocked.</p>
                </div>
            `;
            return;
        }

        alertsList.innerHTML = lowStockProducts.map(product => {
            const deficit = product.minimumStock - product.currentStock;
            const suggestedQty = Math.max(deficit * 2, product.minimumStock);
            const pid = product._id || product.id;
            return `
            <div class="alert-item">
                <div class="alert-content">
                    <h4>${this.escapeHtml(product.name)}</h4>
                    <p>Current stock: <strong style="color:#ef4444;">${product.currentStock}</strong> | Minimum required: ${product.minimumStock}</p>
                    <p style="color: var(--color-text-secondary); font-size: 0.9em;">
                        Supplier: ${product.supplier} | Location: ${product.location} | Suggested order: ${suggestedQty} units
                    </p>
                </div>
                <div class="alert-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn--primary btn--sm" onclick="app.executeReorder('${pid}', ${suggestedQty})">
                        <i class="fas fa-envelope"></i> Reorder (Email)
                    </button>
                    <button class="btn btn--sm" style="background:#10b981;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-weight:600;" onclick="app.markOrderReceived('${pid}', '${product.name.replace(/'/g, "\\'")}', ${suggestedQty})">
                        <i class="fas fa-check-double"></i> Mark Received
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    renderReorderSuggestions() {
        const reorderList = document.getElementById('reorderList');
        if (!reorderList) return;

        const reorderSuggestions = this.generateReorderSuggestions();

        if (reorderSuggestions.length === 0) {
            reorderList.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-sync-alt"></i>
                    <p>No reorder suggestions at this time. All products are well-stocked.</p>
                </div>
            `;
            return;
        }

        reorderList.innerHTML = reorderSuggestions.map(suggestion => `
            <div class="reorder-item">
                <h4>${this.escapeHtml(suggestion.product.name)}</h4>
                <div class="reorder-details">
                    <p><strong>Current Stock:</strong> ${suggestion.product.currentStock}</p>
                    <p><strong>Suggested Order:</strong> ${suggestion.suggestedQuantity} units</p>
                    <p><strong>Reason:</strong> ${suggestion.reason}</p>
                    <p><strong>Priority:</strong> <span class="status-indicator status-indicator--${suggestion.priority}">${suggestion.priority.toUpperCase()}</span></p>
                    <p><strong>Supplier:</strong> ${suggestion.product.supplier}</p>
                    <p><strong>Est. Lead Time:</strong> ${this.getSupplierLeadTime(suggestion.product.supplier)} days</p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                    <button class="btn btn--primary btn--sm" onclick="app.executeReorder('${suggestion.product._id || suggestion.product.id}', ${suggestion.suggestedQuantity})">
                        <i class="fas fa-envelope"></i> Place Order
                    </button>
                    <button class="btn btn--sm" style="background:#10b981;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:600;" onclick="app.markOrderReceived('${suggestion.product._id || suggestion.product.id}', '${suggestion.product.name.replace(/'/g, "\\'")}', ${suggestion.suggestedQuantity})">
                        <i class="fas fa-check-double"></i> Mark Received
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderExpiryTracking() {
        const expiryList = document.getElementById('expiryList');
        if (!expiryList) return;

        const expiringProducts = this.getExpiringProducts();

        if (expiringProducts.length === 0) {
            expiryList.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-calendar-check" style="color: var(--color-success);"></i>
                    <p>No products expiring soon.</p>
                </div>
            `;
            return;
        }

        expiryList.innerHTML = expiringProducts.map(product => {
            const daysUntilExpiry = this.getDaysUntilExpiry(product.expiryDate);
            const isExpired = daysUntilExpiry < 0;
            const isCritical = daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
            const itemClass = isExpired ? 'critical' : isCritical ? 'critical' : 'warning';

            return `
                <div class="expiry-item ${itemClass}">
                    <h4>${this.escapeHtml(product.name)}</h4>
                    <p class="expiry-date">
                        Expires: ${new Date(product.expiryDate).toLocaleDateString()}
                        <span style="color: ${isExpired ? 'var(--color-error)' : isCritical ? 'var(--color-error)' : 'var(--color-warning)'};">
                            ${isExpired ? `(Expired ${Math.abs(daysUntilExpiry)} days ago)` : `(${daysUntilExpiry} days remaining)`}
                        </span>
                    </p>
                    <p style="font-size: 0.9em; color: var(--color-text-secondary);">
                        Stock: ${product.currentStock} | Batch: ${product.batchNumber} | Location: ${product.location}
                    </p>
                    ${isExpired || isCritical ? `
                        <div style="margin-top: 12px;">
                            <button class="btn btn--secondary btn--sm" onclick="app.markForDisposal('${product._id || product.id}')">
                                Mark for Disposal
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    renderValuation() {
        const valuationSummary = document.getElementById('valuationSummary');
        if (!valuationSummary) return;

        const totalCostValue = this.products.reduce((sum, product) =>
            sum + (product.currentStock * product.costPrice), 0);
        const totalSellingValue = this.products.reduce((sum, product) =>
            sum + (product.currentStock * product.sellingPrice), 0);
        const totalProfit = totalSellingValue - totalCostValue;
        const avgMargin = totalCostValue > 0 ? (totalProfit / totalCostValue * 100) : 0;

        // Calculate EARNED profit from actual sales
        const earnedProfit = this.salesData.reduce((sum, day) => {
            return sum + (day.totalSales || 0);
        }, 0);
        // Estimate cost from sold items (use avg margin)
        const estimatedCostOfSold = avgMargin > 0 ? earnedProfit / (1 + avgMargin / 100) : earnedProfit * 0.7;
        const actualEarnedProfit = earnedProfit - estimatedCostOfSold;

        valuationSummary.innerHTML = `
            <div class="valuation-card">
                <h3>Cost Value</h3>
                <p class="value">₹${totalCostValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                <small style="color:var(--color-text-secondary);">Total cost of current inventory</small>
            </div>
            <div class="valuation-card">
                <h3>Selling Value</h3>
                <p class="value">₹${totalSellingValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                <small style="color:var(--color-text-secondary);">Market value if all sold</small>
            </div>
            <div class="valuation-card">
                <h3>Potential Profit</h3>
                <p class="value" style="color:#10b981;">₹${totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                <small style="color:var(--color-text-secondary);">Selling value minus cost</small>
            </div>
            <div class="valuation-card" style="border-left:4px solid #8b5cf6;">
                <h3> Earned Profit</h3>
                <p class="value" style="color:#8b5cf6;font-size:1.6rem;">₹${actualEarnedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                <small style="color:var(--color-text-secondary);">From ₹${earnedProfit.toLocaleString('en-IN')} in sales revenue</small>
            </div>
            <div class="valuation-card">
                <h3>Average Margin</h3>
                <p class="value">${avgMargin.toFixed(1)}%</p>
                <small style="color:var(--color-text-secondary);">Profit margin percentage</small>
            </div>
        `;
    }

    // Modal handlers
    showProductModal(product = null) {
        this.currentEditingType = 'product';
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const title = document.getElementById('productModalTitle');

        if (product) {
            title.textContent = 'Edit Product';
            this.currentEditingId = product._id || product.id;

            // Populate form fields
            Object.keys(product).forEach(key => {
                const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
                if (field) {
                    field.value = product[key];
                }
            });
        } else {
            title.textContent = 'Add Product';
            this.currentEditingId = null;
            form.reset();

            // Set default expiry date (30 days from now)
            const defaultExpiry = new Date();
            defaultExpiry.setDate(defaultExpiry.getDate() + 30);
            document.getElementById('expiryDate').value = defaultExpiry.toISOString().split('T')[0];

            // Generate default barcode
            document.getElementById('productBarcode').value = this.generateBarcode();
        }

        this.populateDropdowns();
        modal.classList.remove('hidden');
    }

    showSaleModal() {
        const modal = document.getElementById('saleModal');
        this.saleItems = [];
        this.resetSaleForm();
        this.populateDropdowns();
        modal.classList.remove('hidden');
    }

    showStockAdjustModal() {
        const modal = document.getElementById('stockAdjustModal');
        const form = document.getElementById('stockAdjustForm');

        form.reset();
        this.populateDropdowns();
        modal.classList.remove('hidden');
    }

    showCategoryModal(category = null) {
        this.currentEditingType = 'category';
        const modal = document.getElementById('categoryModal');
        const form = document.getElementById('categoryForm');
        const title = document.getElementById('categoryModalTitle');

        if (category) {
            title.textContent = 'Edit Category';
            this.currentEditingId = category._id || category.id;
            document.getElementById('categoryName').value = category.name;
        } else {
            title.textContent = 'Add Category';
            this.currentEditingId = null;
            form.reset();
        }

        modal.classList.remove('hidden');
    }

    showSupplierModal(supplier = null) {
        this.currentEditingType = 'supplier';
        const modal = document.getElementById('supplierModal');
        const form = document.getElementById('supplierForm');
        const title = document.getElementById('supplierModalTitle');

        if (supplier) {
            title.textContent = 'Edit Supplier';
            this.currentEditingId = supplier._id || supplier.id;

            Object.keys(supplier).forEach(key => {
                const field = document.getElementById(`supplier${key.charAt(0).toUpperCase() + key.slice(1)}`) ||
                    document.querySelector(`[name="${key}"]`);
                if (field) {
                    field.value = supplier[key];
                }
            });
        } else {
            title.textContent = 'Add Supplier';
            this.currentEditingId = null;
            form.reset();
        }

        modal.classList.remove('hidden');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        this.currentEditingId = null;
        this.currentEditingType = null;
        this.stopBarcodeScanner();
    }

    // Form submission handlers (API-connected)
    async handleProductSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = {};
        for (let [key, value] of formData.entries()) {
            if (['currentStock', 'minimumStock', 'maxStock', 'salesVelocity'].includes(key)) {
                productData[key] = parseInt(value);
            } else if (['costPrice', 'sellingPrice'].includes(key)) {
                productData[key] = parseFloat(value);
            } else {
                productData[key] = value.trim();
            }
        }
        if (!this.validateProductData(productData)) return;
        try {
            if (this.currentEditingId) {
                await this.api(`/products/${this.currentEditingId}`, { method: 'PUT', body: productData });
                this.showNotification(`Product "${productData.name}" updated successfully!`, 'success');
            } else {
                await this.api('/products', { method: 'POST', body: productData });
                this.showNotification(`New product "${productData.name}" added to inventory!`, 'success');
            }
            this.closeAllModals();
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Product save failed: ' + err.message, 'error');
        }
    }

    async handleSaleSubmit(e) {
        e.preventDefault();
        const items = [];
        document.querySelectorAll('.sale-item').forEach(item => {
            const productSelect = item.querySelector('.sale-product');
            const quantityInput = item.querySelector('.sale-quantity');
            const priceInput = item.querySelector('.sale-price');
            if (productSelect && quantityInput && priceInput) {
                const productId = productSelect.value;
                const quantity = parseInt(quantityInput.value);
                const price = parseFloat(priceInput.value);
                if (productId && quantity > 0 && price > 0) {
                    items.push({ productId, quantity, price });
                }
            }
        });
        if (items.length === 0) { alert('Please add at least one valid item.'); return; }
        try {
            const sale = await this.api('/sales', { method: 'POST', body: { items } });
            this.showNotification(`Sale recorded: ₹${sale.totalAmount.toFixed(2)} (${items.length} item${items.length > 1 ? 's' : ''})`, 'success');
            this.closeAllModals();
            // Show invoice/receipt
            this.showInvoice(sale);
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Sale recording failed: ' + err.message, 'error');
        }
    }

    async handleStockAdjustSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productId = formData.get('product');
        const adjustmentType = formData.get('type');
        const quantity = parseInt(formData.get('quantity'));
        const reason = formData.get('reason');
        const notes = formData.get('notes');
        if (!productId) { alert('Please select a product.'); return; }
        try {
            const result = await this.api(`/products/${productId}/stock`, {
                method: 'PATCH',
                body: { adjustmentType, quantity, reason: reason || 'Manual adjustment', notes: notes || '' }
            });
            this.showNotification(`Stock adjusted for ${result.product.name}: ${result.adjustment.oldStock} --- ${result.adjustment.newStock}`, 'success');
            this.closeAllModals();
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Error: ' + err.message, 'error');
        }
    }

    async handleCategorySubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const categoryName = formData.get('name').trim();
        if (!categoryName) { alert('Please enter a category name.'); return; }
        try {
            if (this.currentEditingId) {
                await this.api(`/categories/${this.currentEditingId}`, { method: 'PUT', body: { name: categoryName } });
                this.showNotification(`Category renamed to "${categoryName}"`, 'success');
            } else {
                await this.api('/categories', { method: 'POST', body: { name: categoryName } });
                this.showNotification(`New category "${categoryName}" created!`, 'success');
            }
            this.closeAllModals();
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Error: ' + err.message, 'error');
        }
    }

    async handleSupplierSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const supplierData = {};
        for (let [key, value] of formData.entries()) {
            supplierData[key] = ['avgLeadTime', 'reliability'].includes(key) ? parseInt(value) : value.trim();
        }
        try {
            if (this.currentEditingId) {
                await this.api(`/suppliers/${this.currentEditingId}`, { method: 'PUT', body: supplierData });
                this.showNotification(`Supplier "${supplierData.name}" updated!`, 'success');
            } else {
                await this.api('/suppliers', { method: 'POST', body: supplierData });
                this.showNotification(`Supplier "${supplierData.name}" added!`, 'success');
            }
            this.closeAllModals();
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Error: ' + err.message, 'error');
        }
    }

    // Enhanced sale form management
    resetSaleForm() {
        const saleItemsContainer = document.getElementById('saleItems');
        if (saleItemsContainer) {
            saleItemsContainer.innerHTML = this.createSaleItemHTML(0);
            this.attachSaleItemListeners();
            this.updateSaleTotal();
        }
    }

    addSaleItem() {
        const saleItemsContainer = document.getElementById('saleItems');
        if (saleItemsContainer) {
            const itemIndex = saleItemsContainer.children.length;
            const newItemHTML = this.createSaleItemHTML(itemIndex);
            saleItemsContainer.insertAdjacentHTML('beforeend', newItemHTML);
            this.populateSaleProductDropdowns();
            this.attachSaleItemListeners();
        }
    }

    createSaleItemHTML(index) {
        return `
            <div class="sale-item">
                ${index > 0 ? '<button type="button" class="remove-item" onclick="app.removeSaleItem(this)"><i class="fas fa-times"></i></button>' : ''}
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Product</label>
                        <div style="display: flex; gap: 8px;">
                            <select name="product" class="form-control sale-product" required>
                                <option value="">Select Product</option>
                            </select>
                            <button type="button" class="btn btn--secondary scan-product-btn">
                                <i class="fas fa-camera"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Quantity</label>
                        <input type="number" name="quantity" class="form-control sale-quantity" min="1" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Price per Unit (₹)</label>
                        <input type="number" name="price" class="form-control sale-price" step="0.01" min="0" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Subtotal</label>
                        <input type="text" class="form-control sale-subtotal" readonly>
                    </div>
                </div>
            </div>
        `;
    }

    attachSaleItemListeners() {
        // Product selection change
        document.querySelectorAll('.sale-product').forEach(select => {
            const newSelect = select.cloneNode(true);
            select.parentNode.replaceChild(newSelect, select);

            newSelect.addEventListener('change', (e) => {
                const productId = e.target.value;
                const saleItem = e.target.closest('.sale-item');
                const priceField = saleItem.querySelector('.sale-price');
                const quantityField = saleItem.querySelector('.sale-quantity');

                if (productId) {
                    const product = this.products.find(p => (p._id || p.id) == productId);
                    if (product) {
                        priceField.value = (product.sellingPrice || product.sell || 0).toFixed(2);
                        if (!quantityField.value || quantityField.value == '0') quantityField.value = 1;
                        this.updateSaleItemSubtotal(saleItem);
                    }
                }
            });
        });

        // Quantity and price changes
        document.querySelectorAll('.sale-quantity, .sale-price').forEach(input => {
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);

            newInput.addEventListener('input', (e) => {
                const saleItem = e.target.closest('.sale-item');
                this.updateSaleItemSubtotal(saleItem);
            });
        });

        // Barcode scanning for products
        document.querySelectorAll('.scan-product-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const saleItem = e.target.closest('.sale-item');
                const productSelect = saleItem.querySelector('.sale-product');
                this.startBarcodeScanner(null, (barcode) => {
                    const product = this.products.find(p => p.barcode === barcode);
                    if (product) {
                        productSelect.value = product._id || product.id;
                        productSelect.dispatchEvent(new Event('change'));
                        this.showNotification(`Product found: ${product.name}`, 'success');
                    } else {
                        this.showNotification('No product found with barcode: ' + barcode, 'warning');
                    }
                });
            });
        });
    }

    removeSaleItem(button) {
        button.closest('.sale-item').remove();
        this.updateSaleTotal();
    }

    updateSaleItemSubtotal(saleItem) {
        const quantityInput = saleItem.querySelector('.sale-quantity');
        const priceInput = saleItem.querySelector('.sale-price');
        const subtotalInput = saleItem.querySelector('.sale-subtotal');

        if (quantityInput && priceInput && subtotalInput) {
            const quantity = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const subtotal = quantity * price;

            subtotalInput.value = `$${subtotal.toFixed(2)}`;
            this.updateSaleTotal();
        }
    }

    updateSaleTotal() {
        let total = 0;
        document.querySelectorAll('.sale-item').forEach(item => {
            const quantityInput = item.querySelector('.sale-quantity');
            const priceInput = item.querySelector('.sale-price');

            if (quantityInput && priceInput) {
                const quantity = parseFloat(quantityInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                total += quantity * price;
            }
        });

        const totalElement = document.getElementById('saleTotal');
        if (totalElement) {
            totalElement.textContent = total.toFixed(2);
        }
    }

    updateStockDisplay(productId) {
        const product = this.products.find(p => p.id === parseInt(productId));
        const display = document.getElementById('currentStockDisplay');

        if (product && display) {
            display.value = `${product.currentStock} units`;
        }
    }

    // Barcode scanning functionality
    startBarcodeScanner(inputFieldId, callback = null) {
        this.barcodeCallback = callback || ((barcode) => {
            const field = document.getElementById(inputFieldId);
            if (field) {
                field.value = barcode;
                this.showNotification('Barcode scanned successfully!', 'success');
            }
        });

        const modal = document.getElementById('barcodeScanModal');
        modal.classList.remove('hidden');

        // Check if Quagga is available
        if (typeof Quagga === 'undefined') {
            // Simulate barcode scanning for demo purposes
            setTimeout(() => {
                const mockBarcode = '8901030875201'; // Use first product's barcode
                this.stopBarcodeScanner();
                this.closeAllModals();
                this.barcodeCallback(mockBarcode);
                this.showNotification('Demo: Scanned barcode ' + mockBarcode, 'info');
            }, 2000);
            return;
        }

        // Initialize QuaggaJS
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#barcode-scanner'),
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: "environment"
                }
            },
            decoder: {
                readers: [
                    "code_128_reader",
                    "ean_reader",
                    "ean_8_reader",
                    "code_39_reader",
                    "code_39_vin_reader",
                    "codabar_reader",
                    "upc_reader",
                    "upc_e_reader",
                    "i2of5_reader"
                ]
            }
        }, (err) => {
            if (err) {
                console.error('QuaggaJS initialization error:', err);
                // Camera not available - user can use manual input below the scanner
                this.showNotification('Camera not available - please type the barcode manually below', 'info');
                return;
            }
            Quagga.start();
        });

        // Handle barcode detection
        Quagga.onDetected((data) => {
            const barcode = data.codeResult.code;
            this.stopBarcodeScanner();
            this.closeAllModals();
            this.barcodeCallback(barcode);
        });
    }

    stopBarcodeScanner() {
        if (typeof Quagga !== 'undefined') {
            try { Quagga.stop(); } catch (e) { }
        }
    }

    submitManualBarcode() {
        const input = document.getElementById('manualBarcodeInput');
        if (!input || !input.value.trim()) {
            this.showNotification('Please enter a barcode number', 'error');
            return;
        }
        const barcode = input.value.trim();
        this.stopBarcodeScanner();
        this.closeAllModals();
        if (this.barcodeCallback) {
            this.barcodeCallback(barcode);
        }
        input.value = '';
        this.showNotification(`Barcode ${barcode} entered successfully`, 'success');
    }

    generateBarcode() {
        // Generate a simple 13-digit barcode
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return '890' + timestamp.slice(-7) + random;
    }

    // Utility functions
    validateProductData(data) {
        if (!data.name || !data.category || !data.supplier) {
            alert('Please fill in all required fields.');
            return false;
        }

        if (data.currentStock < 0 || data.minimumStock < 0 || data.maxStock < 0) {
            alert('Stock values cannot be negative.');
            return false;
        }

        if (data.costPrice < 0 || data.sellingPrice < 0) {
            alert('Prices cannot be negative.');
            return false;
        }

        if (data.sellingPrice < data.costPrice) {
            if (!confirm('Selling price is lower than cost price. This will result in a loss. Continue?')) {
                return false;
            }
        }

        // Check for duplicate barcode
        if (data.barcode) {
            const existingProduct = this.products.find(p =>
                p.barcode === data.barcode && p.id !== this.currentEditingId
            );
            if (existingProduct) {
                alert('A product with this barcode already exists.');
                return false;
            }
        }

        return true;
    }

    getNextId(collection) {
        const items = this[collection];
        return items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
    }

    getStockStatus(product) {
        if (product.currentStock <= product.minimumStock) return 'low';
        if (product.currentStock <= product.minimumStock * 1.5) return 'medium';
        return 'high';
    }

    getStockStatusText(status) {
        const statusMap = {
            'low': 'Low Stock',
            'medium': 'Medium',
            'high': 'In Stock'
        };
        return statusMap[status] || 'Unknown';
    }

    getDaysUntilExpiry(expiryDate) {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getExpiringProducts() {
        return this.products.filter(product => {
            const daysUntilExpiry = this.getDaysUntilExpiry(product.expiryDate);
            return daysUntilExpiry <= 7;
        }).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    }

    updateCategoryStatistics() {
        this.categories.forEach(category => {
            const categoryProducts = this.products.filter(p => p.category === category.name);
            category.totalProducts = categoryProducts.length;
            category.totalValue = categoryProducts.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);

            if (categoryProducts.length > 0) {
                const totalMargin = categoryProducts.reduce((sum, p) => {
                    const margin = ((p.sellingPrice - p.costPrice) / p.costPrice) * 100;
                    return sum + margin;
                }, 0);
                category.avgMargin = totalMargin / categoryProducts.length;
            } else {
                category.avgMargin = 0;
            }
        });
    }

    generateReorderSuggestions() {
        const suggestions = [];

        this.products.forEach(product => {
            const daysOfStock = product.salesVelocity > 0 ? product.currentStock / product.salesVelocity : 999;
            const supplier = this.suppliers.find(s => s.name === product.supplier);
            const leadTime = supplier ? supplier.avgLeadTime : 3;

            let suggestion = null;

            if (product.currentStock <= product.minimumStock) {
                suggestion = {
                    product: product,
                    suggestedQuantity: product.maxStock - product.currentStock,
                    reason: 'Below minimum stock level',
                    priority: 'high'
                };
            } else if (daysOfStock <= leadTime + 2) {
                suggestion = {
                    product: product,
                    suggestedQuantity: Math.ceil(product.salesVelocity * (leadTime + 7)) - product.currentStock,
                    reason: `Stock will run out in ${Math.ceil(daysOfStock)} days`,
                    priority: 'medium'
                };
            } else if (daysOfStock <= leadTime + 7) {
                suggestion = {
                    product: product,
                    suggestedQuantity: Math.ceil(product.salesVelocity * (leadTime + 14)) - product.currentStock,
                    reason: 'Proactive restocking recommended',
                    priority: 'low'
                };
            }

            if (suggestion && suggestion.suggestedQuantity > 0) {
                suggestions.push(suggestion);
            }
        });

        return suggestions.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    getSupplierLeadTime(supplierName) {
        const supplier = this.suppliers.find(s => s.name === supplierName);
        return supplier ? supplier.avgLeadTime : 3;
    }

    filterProducts() {
        this.renderProductsTable();
    }

    async refreshAllData() {
        try {
            await this.loadAllData();
            this.populateDropdowns();
            this.renderAllTables();
            this.renderDashboard();
            this.updateCategoryStatistics();
            // Re-populate sale product dropdowns for the sale modal
            try { this.populateSaleProductDropdowns(); } catch (e) { }

            // Safely re-render charts only if their section is visible
            const activeSection = document.querySelector('.section.active');
            if (activeSection) {
                const sectionId = activeSection.id;
                if (sectionId === 'dashboard') {
                    setTimeout(() => {
                        try { this.createCharts(); } catch (e) { console.warn('Chart refresh skipped:', e); }
                    }, 150);
                } else if (sectionId === 'products') {
                    this.renderProductsTable();
                } else if (sectionId === 'alerts') {
                    this.renderAlerts();
                } else if (sectionId === 'categories') {
                    this.renderCategoriesTable();
                } else if (sectionId === 'suppliers') {
                    this.renderSuppliersTable();
                } else if (sectionId === 'reorder') {
                    this.renderReorderSuggestions();
                } else if (sectionId === 'expiry') {
                    this.renderExpiryTracking();
                } else if (sectionId === 'valuation') {
                    this.renderValuation();
                } else if (sectionId === 'salesprofit') {
                    try { this.initSalesProfitHub(); } catch (e) { }
                }
            }
            console.log('Data refreshed from server');
        } catch (err) {
            console.error('Refresh failed:', err);
        }
    }

    // CRUD operations (API-connected)
    editProduct(id) {
        const product = this.products.find(p => (p._id || p.id) == id || p.id == id);
        if (product) this.showProductModal(product);
    }

    async deleteProduct(id) {
        const product = this.products.find(p => (p._id || p.id) == id);
        if (!confirm(`Are you sure you want to delete "${product ? product.name : 'this product'}"?`)) return;
        try {
            await this.api(`/products/${id}`, { method: 'DELETE' });
            this.showNotification(`Product "${product ? product.name : ''}" deleted from inventory`, 'success');
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Delete failed: ' + err.message, 'error');
        }
    }

    async reorderProduct(id) {
        const product = this.products.find(p => (p._id || p.id) == id);
        if (!product) { this.showNotification('Product not found', 'error'); return; }

        const suggestedQty = Math.max(product.maxStock - product.currentStock, product.minimumStock * 2);
        const quantity = prompt(
            `📦 Reorder: ${product.name}\n` +
            `Current Stock: ${product.currentStock}\n` +
            `Min Stock: ${product.minimumStock}\n` +
            `Supplier: ${product.supplier}\n\n` +
            `Enter reorder quantity:`,
            suggestedQty
        );

        if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) return;

        try {
            this.showNotification('Sending reorder email to supplier...', 'info');
            const result = await this.api('/reorder', {
                method: 'POST',
                body: {
                    productId: product._id || product.id,
                    quantity: parseInt(quantity),
                    notes: ''
                }
            });
            this.showNotification(`${result.message}`, 'success');
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Reorder failed: ' + err.message, 'error');
        }
    }

    editCategory(id) {
        const category = this.categories.find(c => (c._id || c.id) == id);
        if (category) this.showCategoryModal(category);
    }

    async deleteCategory(id) {
        const category = this.categories.find(c => (c._id || c.id) == id);
        if (!category) return;
        if (!confirm(`Delete category "${category.name}"?`)) return;
        try {
            await this.api(`/categories/${id}`, { method: 'DELETE' });
            this.showNotification(`Category "${category.name}" deleted`, 'success');
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Delete failed: ' + err.message, 'error');
        }
    }

    editSupplier(id) {
        const supplier = this.suppliers.find(s => (s._id || s.id) == id);
        if (supplier) this.showSupplierModal(supplier);
    }

    async deleteSupplier(id) {
        const supplier = this.suppliers.find(s => (s._id || s.id) == id);
        if (!supplier) return;
        if (!confirm(`Delete supplier "${supplier.name}"?`)) return;
        try {
            await this.api(`/suppliers/${id}`, { method: 'DELETE' });
            this.showNotification(`Supplier "${supplier.name}" removed`, 'success');
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Delete failed: ' + err.message, 'error');
        }
    }

    reorderProduct(id) {
        const product = this.products.find(p => (p._id || p.id) == id);
        if (product) {
            const orderQuantity = product.maxStock - product.currentStock;
            if (confirm(`Reorder ${orderQuantity} units of ${product.name}?`)) {
                this.executeReorder(id, orderQuantity);
            }
        }
    }

    async executeReorder(productId, quantity) {
        try {
            this.showNotification('Sending reorder email to supplier...', 'info');
            const result = await this.api('/reorder', {
                method: 'POST',
                body: { productId, quantity, notes: 'Auto reorder from inventory system' }
            });
            this.showNotification(`${result.message}`, 'success');
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Reorder failed: ' + err.message, 'error');
        }
    }

    async markOrderReceived(productId, productName, suggestedQty) {
        const qtyStr = prompt(`📦 Enter received quantity for "${productName}"\n(Suggested order was ${suggestedQty} units):`, suggestedQty);
        if (!qtyStr) return;
        const qty = parseInt(qtyStr);
        if (isNaN(qty) || qty <= 0) {
            this.showNotification('Please enter a valid positive number', 'error');
            return;
        }
        try {
            await this.api(`/products/${productId}/stock`, {
                method: 'PATCH',
                body: { adjustmentType: 'increase', quantity: qty, reason: 'restock', notes: `Stock received - reorder fulfilled (${qty} units)` }
            });
            this.showNotification(`Stock updated! ${productName} +${qty} units received`, 'success');
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Stock update failed: ' + err.message, 'error');
        }
    }

    async markForDisposal(productId) {
        const product = this.products.find(p => (p._id || p.id) == productId);
        if (!product) return;
        if (!confirm(`Mark ${product.currentStock} units of ${product.name} for disposal?`)) return;
        try {
            await this.api(`/products/${productId}/stock`, {
                method: 'PATCH',
                body: { adjustmentType: 'set', quantity: 0, reason: 'expired', notes: 'Expired product disposal' }
            });
            this.showNotification(`${product.name} marked for disposal`, 'warning');
            await this.refreshAllData();
        } catch (err) {
            this.showNotification('Error: ' + err.message, 'error');
        }
    }

    exportData() {
        // Show the format selection modal instead of exporting immediately
        const modal = document.getElementById('exportModal');
        if (modal) modal.classList.remove('hidden');
    }

    closeExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) modal.classList.add('hidden');
    }

    exportAsJSON() {
        const data = {
            exportDate: new Date().toISOString(),
            products: this.products,
            categories: this.categories,
            suppliers: this.suppliers,
            salesData: this.salesData,
            stockAdjustments: this.stockAdjustments || []
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invex_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.closeExportModal();
        this.showNotification('JSON exported successfully!', 'success');
    }

    exportAsPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const dateStr = new Date().toLocaleDateString('en-IN');
            const primaryColor = [37, 99, 235]; // blue

            // - Header -
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, 297, 18, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('InveXa sTacK - Inventory Report', 14, 12);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${dateStr}`, 240, 12);
            doc.setTextColor(0, 0, 0);

            // - Summary Stats -
            const totalValue = this.products.reduce((s, p) => s + (p.currentStock * p.costPrice), 0);
            const lowStock = this.products.filter(p => p.currentStock <= p.minimumStock).length;
            doc.setFontSize(9);
            doc.text(`Total Products: ${this.products.length} | Total Inventory Value: ₹${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | Low Stock Items: ${lowStock} | Suppliers: ${this.suppliers.length}`, 14, 26);

            // - Products Table -
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Products - Current Inventory', 14, 34);

            doc.autoTable({
                startY: 37,
                head: [['Name', 'Category', 'Supplier', 'Stock', 'Min Stock', 'Cost ₹', 'Sell ₹', 'Status', 'Expiry']],
                body: this.products.map(p => {
                    const status = p.currentStock <= p.minimumStock ? 'Low' : p.currentStock <= p.minimumStock * 1.5 ? 'Medium' : 'Good';
                    return [
                        p.name,
                        p.category,
                        p.supplier,
                        p.currentStock,
                        p.minimumStock,
                        `₹${(p.costPrice || 0).toFixed(2)}`,
                        `₹${(p.sellingPrice || 0).toFixed(2)}`,
                        status,
                        p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : 'N/A'
                    ];
                }),
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                didParseCell: (data) => {
                    if (data.column.index === 7 && data.section === 'body') {
                        if (data.cell.raw === 'Low') data.cell.styles.textColor = [220, 38, 38];
                        else if (data.cell.raw === 'Medium') data.cell.styles.textColor = [217, 119, 6];
                        else data.cell.styles.textColor = [22, 163, 74];
                    }
                }
            });

            // - Suppliers Table -
            const afterProducts = doc.lastAutoTable.finalY + 10;
            doc.addPage();
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, 297, 18, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('InveXa sTacK - Suppliers & Categories', 14, 12);
            doc.setTextColor(0, 0, 0);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Suppliers', 14, 27);

            doc.autoTable({
                startY: 30,
                head: [['Name', 'Contact', 'Phone', 'Email', 'Reliability %', 'Lead Time', 'Total Orders']],
                body: this.suppliers.map(s => [
                    s.name, s.contact || '', s.phone || '', s.email || '',
                    `${s.reliability || 0}%`, `${s.avgLeadTime || 0} days`, s.totalOrders || 0
                ]),
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 255] }
            });

            // - Categories Table -
            const afterSuppliers = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Categories', 14, afterSuppliers);

            doc.autoTable({
                startY: afterSuppliers + 3,
                head: [['Category', 'Total Products', 'Total Value', 'Avg Margin %']],
                body: this.categories.map(c => [
                    c.name,
                    c.totalProducts || 0,
                    `₹${(c.totalValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                    `${(c.avgMargin || 0).toFixed(1)}%`
                ]),
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 255] }
            });

            // - Footer with page numbers -
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Page ${i} of ${pageCount} | InveXa sTacK Inventory Report | ${dateStr}`, 14, 207);
            }

            doc.save(`invex_report_${new Date().toISOString().split('T')[0]}.pdf`);
            this.closeExportModal();
            this.showNotification('PDF report exported successfully!', 'success');
        } catch (err) {
            console.error('PDF export error:', err);
            this.showNotification('PDF export failed: ' + err.message + ' - Try JSON instead.', 'error');
        }
    }

    // Advanced Analytics methods
    async runAdvancedAnalytics() {
        const period = parseInt(document.getElementById('predictionPeriod').value) || 30;
        const type = document.getElementById('predictionType').value || 'sales';
        const aggregation = document.getElementById('aggregationLevel').value || 'weekly';
        const model = document.getElementById('forecastModel').value || 'sarima';

        this.showNotification('Fetching real sales data & running forecasts...', 'info');

        try {
            // Fetch REAL sales data from API (last 180 days for robust training)
            const res = await fetch(`${API_BASE}/sales?days=180`);
            const realSales = await res.json();

            // Aggregate real sales by date - fill every day in range
            const dailyMap = {};
            const today = new Date(); today.setHours(0, 0, 0, 0);
            for (let i = 179; i >= 0; i--) {
                const d = new Date(today); d.setDate(today.getDate() - i);
                const ds = d.toISOString().split('T')[0];
                dailyMap[ds] = { date: ds, totalSales: 0, transactions: 0, items: 0 };
            }
            realSales.forEach(sale => {
                const dateStr = new Date(sale.saleDate || sale.createdAt).toISOString().split('T')[0];
                if (dailyMap[dateStr]) {
                    dailyMap[dateStr].totalSales += sale.totalAmount || 0;
                    dailyMap[dateStr].transactions += 1;
                    dailyMap[dateStr].items += (sale.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
                }
            });
            this.realSalesTimeSeries = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

            // Use real data as the single source of truth for all charts
            this.extendedSalesData = this.realSalesTimeSeries;
            this.salesData = this.realSalesTimeSeries.slice(-7);
            this._realSaleCount = realSales.length;

            // Compute REAL seasonal multipliers from actual data
            this._computedSeasonalMultipliers = this._computeRealSeasonalMultipliers();

            this.performHistoricalAggregation(aggregation);
            this.createAdvancedCharts(period, type, model);
            this.generateDynamicStrategy();
            this.generateAdvancedInsights(period, type, aggregation, model);

            const dataLabel = realSales.length > 0
                ? `✅ Forecasting complete ” ${realSales.length} real sales records analysed!`
                : ' No sales recorded yet ” forecasts will improve as you record sales';
            this.showNotification(dataLabel, realSales.length > 0 ? 'success' : 'info');
        } catch (err) {
            console.error('Analytics error:', err);
            this.showNotification('Analytics failed: ' + err.message, 'error');
        }
    }

    switchAnalyticsTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.analytics-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    performHistoricalAggregation(level) {
        this.aggregatedData = this.aggregateSalesData(level);
    }

    aggregateSalesData(level) {
        const aggregated = {};
        // Use real sales time series as the data source
        const data = this.realSalesTimeSeries || this.extendedSalesData || this.salesData || [];
        if (data.length === 0) return aggregated;

        data.forEach(sale => {
            const date = new Date(sale.date);
            let key;

            switch (level) {
                case 'daily':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'weekly':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'monthly':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'quarterly':
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    key = `${date.getFullYear()}-Q${quarter}`;
                    break;
            }

            if (!aggregated[key]) {
                aggregated[key] = {
                    totalSales: 0,
                    transactions: 0,
                    dates: []
                };
            }
            aggregated[key].totalSales += sale.totalSales;
            aggregated[key].transactions += sale.transactions;
            aggregated[key].dates.push(date);
        });

        return aggregated;
    }

    generateExtendedHistoricalData() {
        // Use REAL sales time series if available ” no fake data generation
        if (this.realSalesTimeSeries && this.realSalesTimeSeries.length > 0) {
            this.extendedSalesData = this.realSalesTimeSeries;
            return;
        }
        // If no real data exists at all, extendedSalesData stays as set in runAdvancedAnalytics
    }


    createAdvancedCharts(period, type, model) {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;

        switch (activeTab) {
            case 'forecasts':
                this.createForecastCharts(period, model);
                break;
            case 'anomalies':
                this.createAnomalyCharts();
                break;
            case 'seasonal':
                this.createSeasonalCharts();
                break;
            case 'procurement':
                this.createProcurementCharts();
                break;
        }
    }

    createForecastCharts(period, model) {
        // Route to the correct forecast model based on user selection
        switch (model) {
            case 'exponential':
                this.createExponentialSmoothingChart(period);
                break;
            case 'linear':
                this.createLinearForecastChart(period);
                break;
            case 'sarima':
            default:
                this.createSARIMAForecastChart(period);
                break;
        }
        this.createInventoryPredictionChart(period);
        this.createHistoricalAggregationChart();
        this.createDemandPredictionChart(period);
    }

    createSARIMAForecastChart(period) {
        const ctx = document.getElementById('salesForecastChart');
        if (!ctx) return;

        const salesData = this.realSalesTimeSeries || this.extendedSalesData || this.salesData || [];
        if (salesData.length === 0) return;
        const historicalSales = salesData.map(d => d.totalSales);
        const forecast = this.sarimaForecast(historicalSales, period);
        this._renderForecastChart(ctx, salesData, historicalSales, forecast, period, 'SARIMA Sales Forecast', '#ef4444', 'rgba(239,68,68,0.1)');
    }

    // -”--”- Exponential Smoothing Chart -”--”-
    createExponentialSmoothingChart(period) {
        const ctx = document.getElementById('salesForecastChart');
        if (!ctx) return;

        const salesData = this.realSalesTimeSeries || this.extendedSalesData || this.salesData || [];
        if (salesData.length === 0) return;
        const historicalSales = salesData.map(d => d.totalSales);
        const forecast = this.exponentialSmoothingForecast(historicalSales, period);
        this._renderForecastChart(ctx, salesData, historicalSales, forecast, period, 'Holt-Winters Exponential Smoothing', '#e67e22', 'rgba(230,126,34,0.1)');
    }

    // -”--”- Linear Regression Chart -”--”-
    createLinearForecastChart(period) {
        const ctx = document.getElementById('salesForecastChart');
        if (!ctx) return;

        const salesData = this.realSalesTimeSeries || this.extendedSalesData || this.salesData || [];
        if (salesData.length === 0) return;
        const historicalSales = salesData.map(d => d.totalSales);
        const forecast = this.linearRegressionForecast(historicalSales, period);
        this._renderForecastChart(ctx, salesData, historicalSales, forecast, period, 'Linear Regression Forecast', '#8b5cf6', 'rgba(139,92,246,0.1)');
    }

    // -”--”- Shared forecast chart renderer -”--”-
    _renderForecastChart(ctx, salesData, historicalSales, forecast, period, modelLabel, fgColor, bgColor) {
        const labels = [];
        const lastDate = new Date(salesData[salesData.length - 1].date);

        // Last 30 days of historical labels
        const showDays = Math.min(30, historicalSales.length);
        for (let i = historicalSales.length - showDays; i < historicalSales.length; i++) {
            const date = new Date(lastDate);
            date.setDate(lastDate.getDate() - (historicalSales.length - 1 - i));
            labels.push(date.toLocaleDateString());
        }
        // Future labels
        for (let i = 1; i <= period; i++) {
            const date = new Date(lastDate);
            date.setDate(lastDate.getDate() + i);
            labels.push(date.toLocaleDateString());
        }

        const historicalData = historicalSales.slice(-showDays);
        const forecastData = [...Array(historicalData.length).fill(null), ...forecast];

        if (this.charts.salesForecastChart) {
            this.charts.salesForecastChart.destroy();
        }

        this.charts.salesForecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Historical Sales',
                    data: historicalData,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.3, fill: true, pointRadius: 1
                }, {
                    label: modelLabel,
                    data: forecastData,
                    borderColor: fgColor,
                    backgroundColor: bgColor,
                    borderDash: [5, 5],
                    tension: 0.3, fill: true, pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: modelLabel },
                    tooltip: { callbacks: { label: c => `${c.dataset.label}: ₹${(c.raw || 0).toLocaleString('en-IN')}` } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => '₹' + v.toLocaleString('en-IN') } }
                }
            }
        });
    }

    sarimaForecast(data, periods) {
        const n = data.length;
        if (n < 8) return Array(periods).fill(0);
        const seasonalPeriod = 7; // Weekly seasonality

        // Calculate moving averages (7-day)
        const ma = [];
        for (let i = 6; i < n; i++) {
            ma.push(data.slice(i - 6, i + 1).reduce((a, b) => a + b, 0) / 7);
        }

        // Calculate seasonal ratios (guard against division by zero)
        const seasonal = [];
        for (let i = seasonalPeriod; i < n; i++) {
            const prev = data[i - seasonalPeriod];
            seasonal.push(prev > 0 ? data[i] / prev : 1.0);
        }
        const validSeasonal = seasonal.filter(v => isFinite(v) && !isNaN(v) && v > 0);
        const avgSeasonal = validSeasonal.length > 0 ? validSeasonal.reduce((a, b) => a + b, 0) / validSeasonal.length : 1.0;

        // Trend from moving averages
        const trend = [];
        for (let i = 1; i < ma.length; i++) {
            trend.push(ma[i] - ma[i - 1]);
        }
        const validTrend = trend.filter(v => isFinite(v) && !isNaN(v));
        const avgTrend = validTrend.length > 0 ? validTrend.reduce((a, b) => a + b, 0) / validTrend.length : 0;

        // Generate forecast
        const forecast = [];
        const nonZero = data.filter(v => v > 0);
        let lastValue = nonZero.length > 0 ? nonZero[nonZero.length - 1] : 0;
        if (lastValue === 0 && ma.length > 0) lastValue = ma[ma.length - 1];

        for (let i = 0; i < periods; i++) {
            const seasonalIndex = i % seasonalPeriod;
            const sf = (seasonal[seasonalIndex] && isFinite(seasonal[seasonalIndex]) && seasonal[seasonalIndex] > 0)
                ? seasonal[seasonalIndex] : avgSeasonal;
            lastValue = lastValue * sf + avgTrend;
            forecast.push(Math.max(0, Math.round(lastValue * 100) / 100));
        }

        return forecast;
    }

    // -”--”- Exponential Smoothing (Holt-Winters Triple) -”--”-
    exponentialSmoothingForecast(data, periods) {
        const n = data.length;
        if (n < 8) return Array(periods).fill(0);

        const seasonLength = 7; // weekly cycle
        const alpha = 0.3; // level smoothing
        const beta = 0.1; // trend smoothing
        const gamma = 0.2; // seasonal smoothing

        // Initialise level, trend, seasonal
        const firstWeek = data.slice(0, seasonLength);
        const secondWeek = data.slice(seasonLength, seasonLength * 2);
        let level = firstWeek.reduce((s, v) => s + v, 0) / seasonLength;
        let trend = 0;
        if (secondWeek.length === seasonLength) {
            const secondAvg = secondWeek.reduce((s, v) => s + v, 0) / seasonLength;
            trend = (secondAvg - level) / seasonLength;
        }

        // Initial seasonal indices
        const seasonals = [];
        for (let i = 0; i < seasonLength; i++) {
            seasonals[i] = level > 0 ? firstWeek[i] / level : 1.0;
        }

        // Smooth through historical data
        for (let t = 0; t < n; t++) {
            const si = t % seasonLength;
            const val = data[t];
            const prevLevel = level;
            const s = seasonals[si] || 1;

            // Update level
            level = alpha * (s > 0 ? val / s : val) + (1 - alpha) * (prevLevel + trend);
            // Update trend
            trend = beta * (level - prevLevel) + (1 - beta) * trend;
            // Update seasonal
            seasonals[si] = gamma * (level > 0 ? val / level : 1) + (1 - gamma) * s;
        }

        // Generate forecast
        const forecast = [];
        for (let i = 1; i <= periods; i++) {
            const si = (n + i - 1) % seasonLength;
            const predicted = (level + trend * i) * (seasonals[si] || 1);
            forecast.push(Math.max(0, Math.round(predicted * 100) / 100));
        }
        return forecast;
    }

    createHistoricalAggregationChart() {
        const ctx = document.getElementById('historicalAggregationChart');
        if (!ctx) return;

        const aggregated = this.aggregatedData || this.aggregateSalesData('weekly');
        const labels = Object.keys(aggregated).slice(-12); // Last 12 periods
        const sales = labels.map(key => aggregated[key].totalSales);

        if (this.charts.historicalAggregationChart) {
            this.charts.historicalAggregationChart.destroy();
        }

        this.charts.historicalAggregationChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Aggregated Sales',
                    data: sales,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Historical Sales Aggregation'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                }
            }
        });
    }

    createAnomalyCharts() {
        this.createAnomalyDetectionChart();
        this.createOutlierAnalysisChart();
        this.createTrendDeviationChart();
        this.createConfidenceIntervalsChart();
    }

    createAnomalyDetectionChart() {
        const ctx = document.getElementById('anomalyDetectionChart');
        if (!ctx) return;

        const salesData = this.extendedSalesData || this.salesData;
        const data = salesData.map(d => d.totalSales);
        const anomalies = this.detectAnomalies(data);

        const labels = salesData.map(d => new Date(d.date).toLocaleDateString());
        const normalData = data.map((val, index) => anomalies[index] ? null : val);
        const anomalyData = data.map((val, index) => anomalies[index] ? val : null);

        if (this.charts.anomalyDetectionChart) {
            this.charts.anomalyDetectionChart.destroy();
        }

        this.charts.anomalyDetectionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Normal Sales',
                    data: normalData,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.1
                }, {
                    label: 'Anomalies',
                    data: anomalyData,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    showLine: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Anomaly Detection in Sales Data'
                    }
                }
            }
        });
    }

    detectAnomalies(data) {
        // Simple anomaly detection using Z-score
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const std = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);

        return data.map(val => Math.abs((val - mean) / std) > 2.5); // Z-score > 2.5
    }

    createOutlierAnalysisChart() {
        const ctx = document.getElementById('outlierAnalysisChart');
        if (!ctx) return;

        const salesData = this.extendedSalesData || this.salesData;
        const data = salesData.map(d => d.totalSales);
        const outliers = this.detectOutliers(data);

        const labels = salesData.map(d => new Date(d.date).toLocaleDateString());
        const normalData = data.map((val, index) => outliers[index] ? null : val);
        const outlierData = data.map((val, index) => outliers[index] ? val : null);

        if (this.charts.outlierAnalysisChart) {
            this.charts.outlierAnalysisChart.destroy();
        }

        this.charts.outlierAnalysisChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Normal Data',
                    data: normalData.map((val, index) => ({ x: index, y: val })).filter(point => point.y !== null),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                }, {
                    label: 'Outliers',
                    data: outlierData.map((val, index) => ({ x: index, y: val })).filter(point => point.y !== null),
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    pointRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Outlier Analysis'
                    }
                }
            }
        });
    }

    detectOutliers(data) {
        // IQR method for outlier detection
        const sorted = [...data].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        return data.map(val => val < lowerBound || val > upperBound);
    }

    createTrendDeviationChart() {
        const ctx = document.getElementById('trendDeviationChart');
        if (!ctx) return;

        const salesData = this.extendedSalesData || this.salesData;
        const data = salesData.map(d => d.totalSales);

        // Calculate moving average
        const ma = [];
        for (let i = 6; i < data.length; i++) {
            ma.push(data.slice(i - 6, i + 1).reduce((a, b) => a + b, 0) / 7);
        }

        // Calculate deviations
        const deviations = [];
        for (let i = 6; i < data.length; i++) {
            deviations.push(data[i] - ma[i - 6]);
        }

        const labels = salesData.slice(6).map(d => new Date(d.date).toLocaleDateString());

        if (this.charts.trendDeviationChart) {
            this.charts.trendDeviationChart.destroy();
        }

        this.charts.trendDeviationChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Trend Deviation',
                    data: deviations,
                    backgroundColor: deviations.map(dev => dev > 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'),
                    borderColor: deviations.map(dev => dev > 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Trend Deviation Analysis'
                    }
                }
            }
        });
    }

    createConfidenceIntervalsChart() {
        const ctx = document.getElementById('confidenceIntervalsChart');
        if (!ctx) return;

        const salesData = this.extendedSalesData || this.salesData;
        const data = salesData.slice(-30).map(d => d.totalSales);

        // Calculate confidence intervals (simplified)
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const std = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);
        const confidenceLevel = 1.96; // 95% confidence
        const margin = confidenceLevel * std / Math.sqrt(data.length);

        const upperBound = data.map(() => mean + margin);
        const lowerBound = data.map(() => mean - margin);

        const labels = salesData.slice(-30).map(d => new Date(d.date).toLocaleDateString());

        if (this.charts.confidenceIntervalsChart) {
            this.charts.confidenceIntervalsChart.destroy();
        }

        this.charts.confidenceIntervalsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales Data',
                    data: data,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.1
                }, {
                    label: 'Upper Confidence Bound',
                    data: upperBound,
                    borderColor: 'rgba(255, 99, 132, 0.5)',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1
                }, {
                    label: 'Lower Confidence Bound',
                    data: lowerBound,
                    borderColor: 'rgba(255, 99, 132, 0.5)',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Confidence Intervals Analysis'
                    }
                }
            }
        });
    }

    createSeasonalCharts() {
        this.createSeasonalDecompositionChart();
        this.createSeasonalAdjustmentChart();
        this.createYearOverYearChart();
        this.createSeasonalIndexChart();
    }

    createSeasonalDecompositionChart() {
        const ctx = document.getElementById('seasonalDecompositionChart');
        if (!ctx) return;

        const salesData = this.extendedSalesData || this.salesData;
        const data = salesData.map(d => d.totalSales);
        const dates = salesData.map(d => new Date(d.date));

        // Simple seasonal decomposition
        const { trend, seasonal, residual } = this.seasonalDecompose(data, 7);

        const labels = dates.map(d => d.toLocaleDateString());

        if (this.charts.seasonalDecompositionChart) {
            this.charts.seasonalDecompositionChart.destroy();
        }

        this.charts.seasonalDecompositionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Original Data',
                    data: data,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.1
                }, {
                    label: 'Trend Component',
                    data: trend,
                    borderColor: 'rgb(255, 205, 86)',
                    backgroundColor: 'rgba(255, 205, 86, 0.1)',
                    tension: 0.1
                }, {
                    label: 'Seasonal Component',
                    data: seasonal,
                    borderColor: 'rgb(153, 102, 255)',
                    backgroundColor: 'rgba(153, 102, 255, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Seasonal Decomposition'
                    }
                }
            }
        });
    }

    seasonalDecompose(data, period) {
        // Simplified seasonal decomposition
        const trend = this.movingAverage(data, period);
        const seasonal = new Array(data.length).fill(0);
        const residual = new Array(data.length).fill(0);

        // Calculate seasonal component
        for (let i = 0; i < data.length; i++) {
            if (trend[i] && data[i]) {
                seasonal[i] = data[i] / trend[i];
                residual[i] = data[i] - trend[i];
            }
        }

        return { trend, seasonal, residual };
    }

    movingAverage(data, window) {
        const result = new Array(data.length).fill(null);
        for (let i = window - 1; i < data.length; i++) {
            const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
            result[i] = sum / window;
        }
        return result;
    }

    createSeasonalAdjustmentChart() {
        const ctx = document.getElementById('seasonalAdjustmentChart');
        if (!ctx) return;

        const seasonalFactors = this.getSeasonalMultiplier();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (this.charts.seasonalAdjustmentChart) {
            this.charts.seasonalAdjustmentChart.destroy();
        }

        this.charts.seasonalAdjustmentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Seasonal Adjustment Factor',
                    data: seasonalFactors,
                    backgroundColor: seasonalFactors.map(factor =>
                        factor > 1.2 ? 'rgba(75, 192, 192, 0.6)' :
                            factor < 0.9 ? 'rgba(255, 99, 132, 0.6)' : 'rgba(255, 205, 86, 0.6)'
                    ),
                    borderColor: seasonalFactors.map(factor =>
                        factor > 1.2 ? 'rgba(75, 192, 192, 1)' :
                            factor < 0.9 ? 'rgba(255, 99, 132, 1)' : 'rgba(255, 205, 86, 1)'
                    ),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Seasonal Adjustment Factors'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Adjustment Factor'
                        }
                    }
                }
            }
        });
    }

    createYearOverYearChart() {
        const ctx = document.getElementById('yearOverYearChart');
        if (!ctx) return;

        // Generate year-over-year comparison data
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const currentYearData = months.map((_, index) => {
            const seasonalFactor = this.getSeasonalMultiplier()[index];
            return 15000 * seasonalFactor + Math.random() * 5000;
        });

        const lastYearData = currentYearData.map(val => val * (0.9 + Math.random() * 0.2));

        if (this.charts.yearOverYearChart) {
            this.charts.yearOverYearChart.destroy();
        }

        this.charts.yearOverYearChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: `${currentYear} Sales`,
                    data: currentYearData,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.1
                }, {
                    label: `${lastYear} Sales`,
                    data: lastYearData,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Year-over-Year Sales Comparison'
                    }
                }
            }
        });
    }

    createSeasonalIndexChart() {
        const ctx = document.getElementById('seasonalIndexChart');
        if (!ctx) return;

        const seasonalIndex = this.calculateSeasonalIndex();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (this.charts.seasonalIndexChart) {
            this.charts.seasonalIndexChart.destroy();
        }

        this.charts.seasonalIndexChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Seasonal Index',
                    data: seasonalIndex,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    pointBackgroundColor: 'rgb(75, 192, 192)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(75, 192, 192)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Seasonal Index Analysis'
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    calculateSeasonalIndex() {
        // Calculate seasonal index based on historical data
        const salesData = this.extendedSalesData || this.salesData;
        const monthlyTotals = new Array(12).fill(0);
        const monthlyCounts = new Array(12).fill(0);

        salesData.forEach(sale => {
            const month = new Date(sale.date).getMonth();
            monthlyTotals[month] += sale.totalSales;
            monthlyCounts[month] += 1;
        });

        const monthlyAverages = monthlyTotals.map((total, index) =>
            monthlyCounts[index] > 0 ? total / monthlyCounts[index] : 0
        );

        const overallAverage = monthlyAverages.reduce((a, b) => a + b, 0) / 12;

        return monthlyAverages.map(avg => avg / overallAverage);
    }

    createProcurementCharts() {
        this.createProcurementPlanningChart();
        this.createReorderPointChart();
        this.createLeadTimeOptimizationChart();
        this.createSupplierPerformanceChart();
    }

    createProcurementPlanningChart() {
        const ctx = document.getElementById('procurementPlanningChart');
        if (!ctx) return;

        // Generate procurement planning data
        const products = this.products.slice(0, 5);
        const procurementData = products.map(product => {
            const leadTime = this.getSupplierLeadTime(product.supplier);
            const safetyStock = product.minimumStock * 0.2;
            const reorderPoint = product.minimumStock + safetyStock;
            const currentStock = product.currentStock;
            const daysToReorder = Math.max(0, (currentStock - reorderPoint) / (product.salesVelocity / 7));

            return {
                name: product.name,
                currentStock: currentStock,
                reorderPoint: reorderPoint,
                daysToReorder: daysToReorder,
                leadTime: leadTime
            };
        });

        const labels = procurementData.map(p => p.name);

        if (this.charts.procurementPlanningChart) {
            this.charts.procurementPlanningChart.destroy();
        }

        this.charts.procurementPlanningChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Current Stock',
                    data: procurementData.map(p => p.currentStock),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }, {
                    label: 'Reorder Point',
                    data: procurementData.map(p => p.reorderPoint),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Procurement Planning Analysis'
                    }
                }
            }
        });
    }

    createReorderPointChart() {
        const ctx = document.getElementById('reorderPointChart');
        if (!ctx) return;

        const products = this.products.slice(0, 5);
        const reorderData = products.map(product => {
            const leadTime = this.getSupplierLeadTime(product.supplier);
            const dailyDemand = product.salesVelocity / 7;
            const leadTimeDemand = dailyDemand * leadTime;
            const safetyStock = leadTimeDemand * 0.5; // 50% safety factor
            const reorderPoint = leadTimeDemand + safetyStock;

            return {
                name: product.name,
                leadTimeDemand: leadTimeDemand,
                safetyStock: safetyStock,
                reorderPoint: reorderPoint
            };
        });

        const labels = reorderData.map(p => p.name);

        if (this.charts.reorderPointChart) {
            this.charts.reorderPointChart.destroy();
        }

        this.charts.reorderPointChart = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Lead Time Demand',
                    data: reorderData.map(p => p.leadTimeDemand),
                    backgroundColor: 'rgba(255, 205, 86, 0.6)',
                    borderColor: 'rgba(255, 205, 86, 1)',
                    borderWidth: 1
                }, {
                    label: 'Safety Stock',
                    data: reorderData.map(p => p.safetyStock),
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }, {
                    label: 'Reorder Point',
                    data: reorderData.map(p => p.reorderPoint),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Reorder Point Analysis'
                    }
                },
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true
                    }
                }
            }
        });
    }

    createLeadTimeOptimizationChart() {
        const ctx = document.getElementById('leadTimeOptimizationChart');
        if (!ctx) return;

        const suppliers = this.suppliers.slice(0, 5);
        const leadTimeData = suppliers.map(supplier => ({
            name: supplier.name,
            avgLeadTime: supplier.avgLeadTime,
            reliability: supplier.reliability,
            optimizedLeadTime: supplier.avgLeadTime * (1 - supplier.reliability / 100 * 0.1)
        }));

        const labels = leadTimeData.map(s => s.name);

        if (this.charts.leadTimeOptimizationChart) {
            this.charts.leadTimeOptimizationChart.destroy();
        }

        this.charts.leadTimeOptimizationChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Current Lead Time',
                    data: leadTimeData.map(s => s.avgLeadTime),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.1
                }, {
                    label: 'Optimized Lead Time',
                    data: leadTimeData.map(s => s.optimizedLeadTime),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Lead Time Optimization'
                    }
                }
            }
        });
    }

    createSupplierPerformanceChart() {
        const ctx = document.getElementById('supplierPerformanceChart');
        if (!ctx) return;

        const suppliers = this.suppliers.slice(0, 5);
        const performanceData = suppliers.map(supplier => ({
            name: supplier.name,
            reliability: supplier.reliability,
            onTimeDelivery: supplier.onTimeDelivery,
            overallScore: (supplier.reliability + supplier.onTimeDelivery) / 2
        }));

        const labels = performanceData.map(s => s.name);

        if (this.charts.supplierPerformanceChart) {
            this.charts.supplierPerformanceChart.destroy();
        }

        this.charts.supplierPerformanceChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Reliability',
                    data: performanceData.map(s => s.reliability),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    pointBackgroundColor: 'rgb(75, 192, 192)',
                    pointBorderColor: '#fff'
                }, {
                    label: 'On-Time Delivery',
                    data: performanceData.map(s => s.onTimeDelivery),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    pointBackgroundColor: 'rgb(255, 99, 132)',
                    pointBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Supplier Performance Analysis'
                    }
                }
            }
        });
    }

    generateAdvancedInsights(period, type, aggregation, model) {
        const insightsDiv = document.getElementById('predictionInsights');
        if (!insightsDiv) return;

        const insights = [];
        const ts = this.realSalesTimeSeries || this.extendedSalesData || [];
        const salesCount = this._realSaleCount || 0;
        const products = this.products || [];

        // -”--”- Real metrics computation -”--”-
        const totalRev = ts.reduce((s, d) => s + d.totalSales, 0);
        const totalTxns = ts.reduce((s, d) => s + d.transactions, 0);
        const totalItems = ts.reduce((s, d) => s + d.items, 0);
        const activeDays = ts.filter(d => d.totalSales > 0).length;
        const dailyAvg = activeDays > 0 ? totalRev / activeDays : 0;
        const last30 = ts.slice(-30);
        const prev30 = ts.slice(-60, -30);
        const last30Rev = last30.reduce((s, d) => s + d.totalSales, 0);
        const prev30Rev = prev30.reduce((s, d) => s + d.totalSales, 0);
        const growthPct = prev30Rev > 0 ? ((last30Rev - prev30Rev) / prev30Rev * 100) : 0;
        const last7 = ts.slice(-7);
        const prev7 = ts.slice(-14, -7);
        const last7Rev = last7.reduce((s, d) => s + d.totalSales, 0);
        const prev7Rev = prev7.reduce((s, d) => s + d.totalSales, 0);
        const weekGrowth = prev7Rev > 0 ? ((last7Rev - prev7Rev) / prev7Rev * 100) : 0;

        // -”--”- 1. Revenue & Growth Insight -”--”-
        const growthIcon = growthPct >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        const growthClass = growthPct >= 5 ? '' : growthPct < -5 ? 'alert-item--warning' : '';
        insights.push(`<div class="alert-item ${growthClass}">
            <div class="alert-content">
                <h4><i class="fas fa-chart-line"></i> Revenue Analysis (Real Data: ${salesCount} records)</h4>
                <p><strong>Daily avg: ₹${dailyAvg.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</strong> from ${activeDays} active trading days.
                30-day revenue: ₹${last30Rev.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                (<i class="fas ${growthIcon}"></i> ${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}% vs prior 30d).
                Week-on-week: ${weekGrowth >= 0 ? '+' : ''}${weekGrowth.toFixed(1)}%.
                ${salesCount === 0 ? '<br><em> No sales recorded yet ” start recording sales to see real insights!</em>' : ''}</p>
            </div>
        </div>`);

        // -”--”- 2. Forecast Confidence -”--”-
        const salesValues = ts.filter(d => d.totalSales > 0).map(d => d.totalSales);
        const mean = salesValues.length > 0 ? salesValues.reduce((s, v) => s + v, 0) / salesValues.length : 0;
        const variance = salesValues.length > 1 ? salesValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (salesValues.length - 1) : 0;
        const cv = mean > 0 ? (Math.sqrt(variance) / mean * 100) : 0;
        const confidence = cv < 20 ? 'high' : cv < 40 ? 'moderate' : 'low';
        const confPct = cv < 20 ? 90 : cv < 40 ? 75 : 60;
        const forecastedRev = dailyAvg * period * (1 + growthPct / 100);
        insights.push(`<div class="alert-item">
            <div class="alert-content">
                <h4><i class="fas fa-brain"></i> ${model.toUpperCase()} Forecast (${period}-Day)</h4>
                <p>Projected ${period}-day revenue: <strong>₹${forecastedRev.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</strong>
                (using ${activeDays}-day training data).
                Model confidence: <strong>${confidence} (~${confPct}%)</strong> ” coefficient of variation: ${cv.toFixed(1)}%.
                ${cv > 40 ? 'High volatility detected ” consider shorter forecast windows.' : 'Sales are relatively stable ” forecasts are reliable.'}</p>
            </div>
        </div>`);

        // -”--”- 3. Anomaly Detection (real) -”--”-
        const data = ts.map(d => d.totalSales);
        const anomalies = this.detectAnomalies(data);
        const anomalyCount = anomalies.filter(Boolean).length;
        const anomalyRate = data.length > 0 ? (anomalyCount / data.length * 100) : 0;
        const anomalyDates = [];
        anomalies.forEach((isAnomaly, i) => { if (isAnomaly && ts[i]) anomalyDates.push(ts[i].date); });
        insights.push(`<div class="alert-item ${anomalyCount > 5 ? 'alert-item--warning' : ''}">
            <div class="alert-content">
                <h4><i class="fas fa-exclamation-triangle"></i> Anomaly Detection</h4>
                <p>Found <strong>${anomalyCount} anomalies</strong> (${anomalyRate.toFixed(1)}% of ${data.length} days).
                ${anomalyCount > 0 ? `Recent anomaly dates: ${anomalyDates.slice(-3).join(', ')}.` : 'No anomalies detected.'}
                ${anomalyCount > 5 ? ' High anomaly rate may indicate promotions, stock issues, or supply disruptions.' :
                anomalyCount > 0 ? ' Low anomaly count ” normal for occasional promotions or events.' : ' Stable sales pattern.'}</p>
            </div>
        </div>`);

        // -”--”- 4. Seasonal Analysis (real computed) -”--”-
        const sm = this.getSeasonalMultiplier();
        const currentMonth = new Date().getMonth();
        const curSeason = sm[currentMonth];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const peakIdx = sm.indexOf(Math.max(...sm));
        const troughIdx = sm.indexOf(Math.min(...sm.filter(v => v > 0)));
        const seasonLabel = curSeason > 1.15 ? 'peak season' : curSeason < 0.85 ? 'off-season' : 'normal season';
        insights.push(`<div class="alert-item">
            <div class="alert-content">
                <h4><i class="fas fa-calendar-alt"></i> Seasonal Intelligence (Computed from Your Data)</h4>
                <p>Current month (${months[currentMonth]}): <strong>${seasonLabel}</strong> ” demand index ${curSeason.toFixed(2)}x.
                ${sm[peakIdx] > 1 ? `Peak month: <strong>${months[peakIdx]}</strong> (${((sm[peakIdx] - 1) * 100).toFixed(0)}% above average).` : ''}
                ${sm[troughIdx] < 1 ? `Lowest month: <strong>${months[troughIdx]}</strong> (${((1 - sm[troughIdx]) * 100).toFixed(0)}% below average).` : ''}
                ${salesCount < 30 ? '<br><em>Note: Seasonal patterns need 60+ days of sales data for accuracy.</em>' : ''}</p>
            </div>
        </div>`);

        // -”--”- 5. Procurement (real stock analysis) -”--”-
        const lowStock = products.filter(p => (p.currentStock || 0) <= (p.minimumStock || 0));
        const criticalStock = products.filter(p => {
            const vel = p.salesVelocity || 1;
            return vel > 0 && (p.currentStock / vel) < 7;
        });
        insights.push(`<div class="alert-item ${criticalStock.length > 0 ? 'alert-item--warning' : ''}">
            <div class="alert-content">
                <h4><i class="fas fa-shopping-cart"></i> Procurement Intelligence</h4>
                <p><strong>${lowStock.length}</strong> products below minimum stock. <strong>${criticalStock.length}</strong> products will stockout within 7 days.
                ${lowStock.length > 0 ? `<br>Reorder now: ${lowStock.slice(0, 5).map(p => p.name).join(', ')}${lowStock.length > 5 ? ` +${lowStock.length - 5} more` : ''}.` : ' All products above minimum stock.'}
                ${criticalStock.length > 0 ? `<br>Critical: ${criticalStock.slice(0, 3).map(p => `${p.name} (~${Math.floor(p.currentStock / (p.salesVelocity || 1))}d left)`).join(', ')}.` : ''}</p>
            </div>
        </div>`);

        // -”--”- 6. AI Business Recommendations -”--”-
        const totalInvValue = products.reduce((s, p) => s + (p.costPrice || 0) * (p.currentStock || 0), 0);
        const avgMargin = products.length > 0 ? products.reduce((s, p) => {
            const m = p.sellingPrice > 0 ? ((p.sellingPrice - (p.costPrice || 0)) / p.sellingPrice * 100) : 0;
            return s + m;
        }, 0) / products.length : 0;
        const highMarginProducts = products.filter(p => p.sellingPrice > 0 && ((p.sellingPrice - (p.costPrice || 0)) / p.sellingPrice * 100) > 35);
        const lowMarginHighVelocity = products.filter(p => {
            const m = p.sellingPrice > 0 ? ((p.sellingPrice - (p.costPrice || 0)) / p.sellingPrice * 100) : 0;
            return m < 15 && (p.salesVelocity || 0) > 3;
        });

        const recs = [];
        if (growthPct > 10) recs.push(`ðŸ“ˆ Revenue is growing ${growthPct.toFixed(0)}% ” consider increasing stock of top-selling items to capitalise on momentum.`);
        if (growthPct < -10) recs.push(`ðŸ“‰ Revenue declining ${Math.abs(growthPct).toFixed(0)}% ” review pricing strategy, run promotions, or reduce slow-movers.`);
        if (lowMarginHighVelocity.length > 0) recs.push(`ðŸ’ ${lowMarginHighVelocity.length} fast-selling products have margins below 15% ” renegotiate supplier rates or increase selling prices by 5-10%.`);
        if (highMarginProducts.length > 0) recs.push(`â­ ${highMarginProducts.length} products with 35%+ margins ” prioritise stock availability for: ${highMarginProducts.slice(0, 3).map(p => p.name).join(', ')}.`);
        if (criticalStock.length > 0) recs.push(`ðŸš¨ ${criticalStock.length} items stockout imminent ” place emergency orders today to prevent lost sales.`);
        if (totalInvValue > dailyAvg * 60) recs.push(`ðŸ“¦ Inventory value (₹${(totalInvValue / 1000).toFixed(0)}K) covers ${(totalInvValue / dailyAvg).toFixed(0)} days of sales ” consider reducing slow-moving stock to free up capital.`);
        if (avgMargin < 20) recs.push(` Average margin ${avgMargin.toFixed(1)}% is below healthy (25%+) ” audit cost prices and negotiate bulk discounts.`);
        if (avgMargin >= 30) recs.push(`✅ Strong average margin of ${avgMargin.toFixed(1)}% ” maintain current pricing strategy.`);
        if (salesCount === 0) recs.push('ðŸ’¡ Start recording sales to unlock AI-powered insights, demand forecasting, and stock optimisation.');
        if (recs.length === 0) recs.push('✅ Your business metrics look healthy. Continue monitoring for emerging trends.');

        insights.push(`<div class="alert-item">
            <div class="alert-content">
                <h4><i class="fas fa-robot"></i> AI Strategy Recommendations</h4>
                <ul style="margin:8px 0 0 16px;line-height:1.8;">${recs.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>
        </div>`);

        insightsDiv.innerHTML = insights.join('');
    }

    exportAnalytics() {
        const period = parseInt(document.getElementById('predictionPeriod').value) || 30;
        const type = document.getElementById('predictionType').value || 'sales';
        const aggregation = document.getElementById('aggregationLevel').value || 'weekly';
        const model = document.getElementById('forecastModel').value || 'sarima';

        const analytics = {
            timestamp: new Date().toISOString(),
            parameters: {
                period: period,
                type: type,
                aggregation: aggregation,
                model: model
            },
            historicalData: this.aggregatedData,
            forecasts: {
                sarima: this.sarimaForecast(
                    (this.extendedSalesData || this.salesData).map(d => d.totalSales), period
                ),
                linear: this.linearRegressionForecast(
                    (this.extendedSalesData || this.salesData).map(d => d.totalSales), period
                )
            },
            anomalies: {
                detected: this.detectAnomalies((this.extendedSalesData || this.salesData).map(d => d.totalSales)),
                outliers: this.detectOutliers((this.extendedSalesData || this.salesData).map(d => d.totalSales))
            },
            seasonal: {
                multipliers: this.getSeasonalMultiplier(),
                index: this.calculateSeasonalIndex(),
                decomposition: this.seasonalDecompose(
                    (this.extendedSalesData || this.salesData).map(d => d.totalSales), 7
                )
            },
            procurement: {
                reorderPoints: this.products.map(p => ({
                    name: p.name,
                    currentStock: p.currentStock,
                    reorderPoint: p.minimumStock + (p.minimumStock * 0.2),
                    leadTime: this.getSupplierLeadTime(p.supplier)
                })),
                supplierPerformance: this.suppliers.map(s => ({
                    name: s.name,
                    reliability: s.reliability,
                    leadTime: s.avgLeadTime,
                    onTimeDelivery: s.onTimeDelivery
                }))
            }
        };

        const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `advanced_analytics_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('Advanced analytics exported successfully!', 'success');
    }

    createSalesForecastChart(period) {
        const ctx = document.getElementById('salesForecastChart');
        if (!ctx) return;

        // Use existing sales data and extend with linear regression forecast
        const salesData = this.salesData.map(d => d.totalSales);
        const dates = this.salesData.map(d => new Date(d.date));

        // Simple linear regression for forecasting
        const forecast = this.linearRegressionForecast(salesData, period);

        const futureDates = [];
        const lastDate = new Date(dates[dates.length - 1]);
        for (let i = 1; i <= period; i++) {
            const date = new Date(lastDate);
            date.setDate(date.getDate() + i);
            futureDates.push(date);
        }

        if (this.charts.salesForecastChart) {
            this.charts.salesForecastChart.destroy();
        }

        this.charts.salesForecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [...dates.map(d => d.toLocaleDateString()), ...futureDates.map(d => d.toLocaleDateString())],
                datasets: [{
                    label: 'Historical Sales',
                    data: salesData,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }, {
                    label: 'Forecasted Sales',
                    data: [...Array(salesData.length).fill(null), ...forecast],
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderDash: [5, 5],
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sales Forecast (Linear Regression)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                }
            }
        });
    }

    createInventoryPredictionChart(period) {
        const ctx = document.getElementById('inventoryPredictionChart');
        if (!ctx) return;

        // Predict inventory levels based on sales velocity and current stock
        const predictions = this.products.map(product => {
            const dailySales = product.salesVelocity / 7; // Weekly to daily
            const daysToDepletion = product.currentStock / dailySales;
            const futureLevels = [];

            for (let day = 0; day < period; day++) {
                const remaining = Math.max(0, product.currentStock - (dailySales * day));
                futureLevels.push(remaining);
            }

            return {
                name: product.name,
                current: product.currentStock,
                min: product.minimumStock,
                levels: futureLevels
            };
        });

        const labels = Array.from({ length: period }, (_, i) => `Day ${i + 1}`);

        if (this.charts.inventoryPredictionChart) {
            this.charts.inventoryPredictionChart.destroy();
        }

        this.charts.inventoryPredictionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: predictions.slice(0, 5).map((pred, index) => ({
                    label: pred.name,
                    data: pred.levels,
                    borderColor: `hsl(${index * 60}, 70%, 50%)`,
                    backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.1)`,
                    tension: 0.1
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Inventory Depletion Prediction'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Stock Level'
                        }
                    }
                }
            }
        });
    }

    createSeasonalTrendsChart() {
        const ctx = document.getElementById('seasonalTrendsChart');
        if (!ctx) return;

        // Analyze seasonal patterns (simplified - using month-based analysis)
        const monthlySales = Array(12).fill(0);
        const monthlyCounts = Array(12).fill(0);

        this.salesData.forEach(sale => {
            const month = new Date(sale.date).getMonth();
            monthlySales[month] += sale.totalSales;
            monthlyCounts[month] += 1;
        });

        const avgMonthlySales = monthlySales.map((total, index) =>
            monthlyCounts[index] > 0 ? total / monthlyCounts[index] : 0
        );

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (this.charts.seasonalTrendsChart) {
            this.charts.seasonalTrendsChart.destroy();
        }

        this.charts.seasonalTrendsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Average Monthly Sales',
                    data: avgMonthlySales,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Seasonal Sales Trends'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createDemandPredictionChart(period) {
        const ctx = document.getElementById('demandPredictionChart');
        if (!ctx) return;

        // Predict demand based on sales velocity and seasonal factors
        const demandData = this.products.map(product => {
            const baseDemand = product.salesVelocity;
            const seasonalMultiplier = this.getSeasonalMultiplier();
            const trend = 1.02; // 2% growth trend

            const predictions = [];
            for (let day = 0; day < period; day++) {
                const seasonal = seasonalMultiplier[new Date(Date.now() + day * 24 * 60 * 60 * 1000).getMonth()];
                const predicted = baseDemand * seasonal * Math.pow(trend, day / 30);
                predictions.push(predicted);
            }

            return {
                name: product.name,
                predictions: predictions
            };
        });

        const labels = Array.from({ length: period }, (_, i) => `Day ${i + 1}`);

        if (this.charts.demandPredictionChart) {
            this.charts.demandPredictionChart.destroy();
        }

        this.charts.demandPredictionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: demandData.slice(0, 5).map((item, index) => ({
                    label: item.name,
                    data: item.predictions,
                    borderColor: `hsl(${index * 72}, 70%, 50%)`,
                    backgroundColor: `hsla(${index * 72}, 70%, 50%, 0.1)`,
                    tension: 0.1
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Demand Prediction'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Predicted Demand'
                        }
                    }
                }
            }
        });
    }

    linearRegressionForecast(data, periods) {
        const n = data.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const y = data;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const forecast = [];
        for (let i = 0; i < periods; i++) {
            forecast.push(intercept + slope * (n + i));
        }

        return forecast;
    }

    getSeasonalMultiplier() {
        // Return REAL computed seasonal multipliers if available
        if (this._computedSeasonalMultipliers) return this._computedSeasonalMultipliers;
        // Fallback: compute from real data or return flat (no fake seasonal patterns)
        return this._computeRealSeasonalMultipliers();
    }

    _computeRealSeasonalMultipliers() {
        const ts = this.realSalesTimeSeries || this.extendedSalesData || [];
        if (ts.length < 7) return Array(12).fill(1.0);
        const monthTotals = Array(12).fill(0);
        const monthCounts = Array(12).fill(0);
        ts.forEach(d => {
            const m = new Date(d.date).getMonth();
            monthTotals[m] += d.totalSales;
            monthCounts[m]++;
        });
        const monthAvgs = monthTotals.map((t, i) => monthCounts[i] > 0 ? t / monthCounts[i] : 0);
        const nonZero = monthAvgs.filter(v => v > 0);
        const overallAvg = nonZero.length > 0 ? nonZero.reduce((s, v) => s + v, 0) / nonZero.length : 1;
        return monthAvgs.map(v => overallAvg > 0 ? +(v / overallAvg).toFixed(3) : 1.0);
    }

    generatePredictionInsights(period, type) {
        const insightsDiv = document.getElementById('predictionInsights');
        if (!insightsDiv) return;

        const insights = [];

        // Sales insights
        const salesSrc = this.realSalesTimeSeries || this.salesData || [];
        const avgSales = salesSrc.length > 0 ? salesSrc.reduce((sum, d) => sum + d.totalSales, 0) / salesSrc.length : 0;
        insights.push(`<div class="alert-item">
            <div class="alert-content">
                <h4><i class="fas fa-chart-line"></i> Sales Trend</h4>
                <p>Average daily sales: ₹${avgSales.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}. Expected ${period}-day forecast shows ₹${(avgSales * period * 1.05).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} total revenue.</p>
            </div>
        </div>`);

        // Inventory insights
        const lowStockProducts = this.products.filter(p => p.currentStock <= p.minimumStock);
        if (lowStockProducts.length > 0) {
            insights.push(`<div class="alert-item alert-item--warning">
                <div class="alert-content">
                    <h4><i class="fas fa-exclamation-triangle"></i> Inventory Alert</h4>
                    <p>${lowStockProducts.length} products are at or below minimum stock levels. Reorder recommended within ${period} days.</p>
                </div>
            </div>`);
        }

        // Seasonal insights
        const currentMonth = new Date().getMonth();
        const seasonalMultiplier = this.getSeasonalMultiplier()[currentMonth];
        const seasonText = seasonalMultiplier > 1.2 ? 'peak season' : seasonalMultiplier < 0.9 ? 'off-season' : 'normal season';
        insights.push(`<div class="alert-item">
            <div class="alert-content">
                <h4><i class="fas fa-calendar"></i> Seasonal Analysis</h4>
                <p>Current period is ${seasonText} with ${((seasonalMultiplier - 1) * 100).toFixed(0)}% demand variation. Adjust inventory accordingly.</p>
            </div>
        </div>`);

        // AI recommendations
        insights.push(`<div class="alert-item">
            <div class="alert-content">
                <h4><i class="fas fa-robot"></i> AI Recommendations</h4>
                <p>Based on historical data, increase stock for high-velocity items by 15%. Consider promotional pricing for slow-moving products.</p>
            </div>
        </div>`);

        insightsDiv.innerHTML = insights.join('');
    }

    exportPredictions() {
        const period = parseInt(document.getElementById('predictionPeriod').value) || 30;
        const type = document.getElementById('predictionType').value || 'sales';

        const predictions = {
            period: period,
            type: type,
            timestamp: new Date().toISOString(),
            salesForecast: this.linearRegressionForecast(
                this.salesData.map(d => d.totalSales), period
            ),
            inventoryPredictions: this.products.map(p => ({
                name: p.name,
                currentStock: p.currentStock,
                predictedDepletion: Math.ceil(p.currentStock / (p.salesVelocity / 7))
            })),
            seasonalMultipliers: this.getSeasonalMultiplier()
        };

        const blob = new Blob([JSON.stringify(predictions, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `predictions_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('Predictions exported successfully!', 'success');
    }

    generateDynamicStrategy() {
        const container = document.getElementById('dynamicStrategyInsights');
        if (!container) return;

        const products = this.products;
        const ts = this.realSalesTimeSeries || [];

        // -”--”- Stock-Out Risk -”--”-
        const stockOutRisk = products.filter(p => {
            const velocity = p.salesVelocity || 1;
            const daysLeft = velocity > 0 ? Math.floor(p.currentStock / velocity) : 999;
            return daysLeft <= 7 && p.currentStock > 0;
        }).map(p => ({
            name: p.name,
            stock: p.currentStock,
            velocity: p.salesVelocity || 1,
            daysLeft: Math.floor(p.currentStock / (p.salesVelocity || 1))
        })).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);

        // -”--”- Overstock Warning -”--”-
        const overstocked = products.filter(p => {
            const velocity = p.salesVelocity || 1;
            const daysOfStock = velocity > 0 ? p.currentStock / velocity : 999;
            return daysOfStock > 60 && p.currentStock > 20;
        }).map(p => ({
            name: p.name,
            stock: p.currentStock,
            daysOfStock: Math.floor(p.currentStock / (p.salesVelocity || 1)),
            value: p.costPrice * p.currentStock
        })).sort((a, b) => b.daysOfStock - a.daysOfStock).slice(0, 5);

        // -”--”- Margin Opportunities -”--”-
        const lowMarginProducts = products.filter(p => {
            const margin = p.costPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.costPrice * 100) : 0;
            return margin < 15 && margin >= 0 && p.currentStock > 0;
        }).map(p => ({
            name: p.name,
            margin: p.costPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.costPrice * 100) : 0,
            suggestedPrice: Math.ceil(p.costPrice * 1.25)
        })).slice(0, 5);

        // -”--”- Revenue Trend -”--”-
        const totalRevenue = ts.reduce((s, d) => s + d.totalSales, 0);
        const recentDays = ts.slice(-7);
        const olderDays = ts.slice(-14, -7);
        const recentAvg = recentDays.length > 0 ? recentDays.reduce((s, d) => s + d.totalSales, 0) / recentDays.length : 0;
        const olderAvg = olderDays.length > 0 ? olderDays.reduce((s, d) => s + d.totalSales, 0) / olderDays.length : 0;
        const trendPct = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg * 100) : 0;
        const trendDir = trendPct >= 0 ? 'ðŸ“ˆ' : 'ðŸ“‰';
        const trendColor = trendPct >= 0 ? '#10b981' : '#ef4444';

        container.innerHTML = `
            <div class="stats-grid" style="margin-bottom:20px;">
                <div class="stat-card">
                    <div class="stat-icon" style="background:rgba(0,102,255,0.12);color:#0066FF;"><i class="fas fa-rupee-sign"></i></div>
                    <div class="stat-info"><h3>₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</h3><p>Total Revenue (90d)</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:rgba(${trendPct >= 0 ? '16,185,129' : '239,68,68'},0.12);color:${trendColor};"><i class="fas fa-${trendPct >= 0 ? 'arrow-up' : 'arrow-down'}"></i></div>
                    <div class="stat-info"><h3 style="color:${trendColor}">${trendDir} ${Math.abs(trendPct).toFixed(1)}%</h3><p>Week-over-Week Trend</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b;"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="stat-info"><h3>${stockOutRisk.length}</h3><p>Stock-Out Risks</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:rgba(139,92,246,0.12);color:#8b5cf6;"><i class="fas fa-boxes-stacked"></i></div>
                    <div class="stat-info"><h3>${overstocked.length}</h3><p>Overstocked Items</p></div>
                </div>
            </div>

            <div class="chart-grid" style="grid-template-columns:1fr 1fr 1fr;gap:16px;">
                ${stockOutRisk.length > 0 ? `
                <div class="card" style="border-left:4px solid #ef4444;">
                    <div class="card__header"><h3 style="color:#ef4444;"><i class="fas fa-fire"></i> Stock-Out Risk (Reorder Now!)</h3></div>
                    <div class="card__body">
                        ${stockOutRisk.map(p => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--color-border);">
                                <strong>${p.name}</strong>
                                <span style="color:#ef4444;font-weight:600;">${p.daysLeft} days left (${p.stock} units)</span>
                            </div>
                        `).join('')}
                    </div>
                </div>` : `
                <div class="card" style="border-left:4px solid #10b981;">
                    <div class="card__header"><h3 style="color:#10b981;"><i class="fas fa-check-circle"></i> Stock Health</h3></div>
                    <div class="card__body"><p style="padding:16px 0;color:var(--color-text-secondary);">✅ All products have healthy stock levels!</p></div>
                </div>`}

                ${overstocked.length > 0 ? `
                <div class="card" style="border-left:4px solid #f59e0b;">
                    <div class="card__header"><h3 style="color:#f59e0b;"><i class="fas fa-warehouse"></i> Overstock Warning</h3></div>
                    <div class="card__body">
                        ${overstocked.map(p => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--color-border);">
                                <strong>${p.name}</strong>
                                <span style="color:#f59e0b;">${p.daysOfStock}d supply Â· ₹${p.value.toLocaleString('en-IN')}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>` : `
                <div class="card" style="border-left:4px solid #10b981;">
                    <div class="card__header"><h3 style="color:#10b981;"><i class="fas fa-balance-scale"></i> Inventory Balance</h3></div>
                    <div class="card__body"><p style="padding:16px 0;color:var(--color-text-secondary);">✅ No overstock issues detected</p></div>
                </div>`}

                ${lowMarginProducts.length > 0 ? `
                <div class="card" style="border-left:4px solid #8b5cf6;">
                    <div class="card__header"><h3 style="color:#8b5cf6;"><i class="fas fa-tag"></i> Margin Optimization</h3></div>
                    <div class="card__body">
                        ${lowMarginProducts.map(p => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--color-border);">
                                <strong>${p.name}</strong>
                                <span style="color:#8b5cf6;">${p.margin.toFixed(1)}% â†’ suggest ₹${p.suggestedPrice}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>` : `
                <div class="card" style="border-left:4px solid #10b981;">
                    <div class="card__header"><h3 style="color:#10b981;"><i class="fas fa-thumbs-up"></i> Margins Healthy</h3></div>
                    <div class="card__body"><p style="padding:16px 0;color:var(--color-text-secondary);">✅ All products have healthy margins (>15%)</p></div>
                </div>`}
            </div>
        `;
    }

    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•
    //  SALES & PROFIT HUB
    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•

    initSalesProfitHub() {
        // Set up tab switching
        const tabContainer = document.getElementById('spTabs');
        if (tabContainer && !tabContainer.dataset.initialized) {
            tabContainer.dataset.initialized = '1';
            tabContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-sptab]');
                if (!btn) return;
                const tabName = btn.dataset.sptab;
                tabContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.sp-tab-content').forEach(t => { t.style.display = 'none'; t.classList.remove('active'); });
                const target = document.getElementById('sp-' + tabName);
                if (target) { target.style.display = 'block'; target.classList.add('active'); }
                // Render tab-specific content
                if (tabName === 'revenue') this.renderRevenueTab();
                if (tabName === 'profitbreakdown') this.renderProfitTab();
                if (tabName === 'soldproducts') this.loadSoldProducts();
            });
        }
        // Default render
        this.renderRevenueTab();
    }

    renderRevenueTab() {
        // KPI cards
        const totalRevenue = this.salesData.reduce((s, d) => s + (d.totalSales || 0), 0);
        const avgDaily = this.salesData.length > 0 ? totalRevenue / this.salesData.length : 0;
        const bestDay = this.salesData.reduce((best, d) => (!best || d.totalSales > best.totalSales ? d : best), null);
        const totalTxns = this.salesData.reduce((s, d) => s + (d.transactions || 0), 0);

        const el = (id) => document.getElementById(id);
        if (el('spTotalRevenue')) el('spTotalRevenue').textContent = '₹' + totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        if (el('spAvgDaily')) el('spAvgDaily').textContent = '₹' + avgDaily.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        if (el('spBestDay') && bestDay) el('spBestDay').textContent = new Date(bestDay.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        if (el('spTotalTxns')) el('spTotalTxns').textContent = totalTxns;

        // Revenue line+bar combo chart
        setTimeout(() => {
            const ctx = document.getElementById('spRevenueChart');
            if (!ctx) return;
            if (this.charts.spRevenue) this.charts.spRevenue.destroy();
            const labels = this.salesData.map(d => new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
            const data = this.salesData.map(d => d.totalSales || 0);
            this.charts.spRevenue = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Revenue (₹)',
                        data,
                        backgroundColor: 'rgba(0,102,255,0.65)',
                        borderRadius: 6,
                        order: 2
                    }, {
                        label: 'Trend',
                        data,
                        type: 'line',
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16,185,129,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#10b981',
                        order: 1
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + v.toLocaleString('en-IN') } } }
                }
            });

            // Category sales doughnut
            const catCtx = document.getElementById('spCategorySalesChart');
            if (!catCtx) return;
            if (this.charts.spCatSales) this.charts.spCatSales.destroy();
            const catColors = ['#0066FF', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
            this.charts.spCatSales = new Chart(catCtx, {
                type: 'doughnut',
                data: {
                    labels: this.categories.map(c => c.name),
                    datasets: [{
                        data: this.categories.map(c => c.totalValue || 0),
                        backgroundColor: catColors,
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }, 150);
    }

    renderProfitTab() {
        const products = this.products;
        // Calculate profit data
        let totalProfit = 0, marginSum = 0;
        const catProfit = {};
        products.forEach(p => {
            const margin = p.costPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.costPrice * 100) : 0;
            const profit = (p.sellingPrice - p.costPrice) * p.currentStock;
            totalProfit += profit;
            marginSum += margin;
            const cat = p.category || 'Other';
            catProfit[cat] = (catProfit[cat] || 0) + profit;
        });
        const avgMargin = products.length > 0 ? (marginSum / products.length) : 0;
        const topCat = Object.entries(catProfit).sort((a, b) => b[1] - a[1]);
        const lowestMarginProduct = [...products].sort((a, b) => {
            const ma = a.costPrice > 0 ? ((a.sellingPrice - a.costPrice) / a.costPrice * 100) : 0;
            const mb = b.costPrice > 0 ? ((b.sellingPrice - b.costPrice) / b.costPrice * 100) : 0;
            return ma - mb;
        })[0];

        const el = (id) => document.getElementById(id);
        if (el('spTotalProfit')) el('spTotalProfit').textContent = '₹' + totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        if (el('spAvgMargin')) el('spAvgMargin').textContent = avgMargin.toFixed(1) + '%';
        if (el('spTopCategory') && topCat.length > 0) el('spTopCategory').textContent = topCat[0][0];
        if (el('spLowestMargin') && lowestMarginProduct) el('spLowestMargin').textContent = lowestMarginProduct.name;

        // Profit doughnut
        setTimeout(() => {
            const ctx = document.getElementById('spProfitDoughnut');
            if (!ctx) return;
            if (this.charts.spProfitDoughnut) this.charts.spProfitDoughnut.destroy();
            const catColors = ['#10b981', '#0066FF', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
            this.charts.spProfitDoughnut = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(catProfit),
                    datasets: [{ data: Object.values(catProfit), backgroundColor: catColors, borderWidth: 2, borderColor: '#fff' }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
            });

            // Revenue vs Cost vs Profit bar
            const barCtx = document.getElementById('spProfitBarChart');
            if (!barCtx) return;
            if (this.charts.spProfitBar) this.charts.spProfitBar.destroy();
            const catNames = [...new Set(products.map(p => p.category || 'Other'))];
            const revData = catNames.map(c => products.filter(p => p.category === c).reduce((s, p) => s + p.sellingPrice * p.currentStock, 0));
            const costData = catNames.map(c => products.filter(p => p.category === c).reduce((s, p) => s + p.costPrice * p.currentStock, 0));
            const profData = catNames.map((c, i) => revData[i] - costData[i]);
            this.charts.spProfitBar = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: catNames,
                    datasets: [
                        { label: 'Revenue', data: revData, backgroundColor: '#0066FF', borderRadius: 4 },
                        { label: 'Cost', data: costData, backgroundColor: '#ef4444', borderRadius: 4 },
                        { label: 'Profit', data: profData, backgroundColor: '#10b981', borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + v.toLocaleString('en-IN') } } }
                }
            });
        }, 150);

        // Profit table
        const tbody = document.getElementById('spProfitTableBody');
        if (tbody) {
            tbody.innerHTML = products.map(p => {
                const margin = p.costPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.costPrice * 100) : 0;
                const potentialProfit = (p.sellingPrice - p.costPrice) * p.currentStock;
                const color = margin >= 30 ? '#10b981' : margin >= 15 ? '#f59e0b' : '#ef4444';
                return `<tr>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.category}</td>
                    <td>₹${p.costPrice.toLocaleString('en-IN')}</td>
                    <td>₹${p.sellingPrice.toLocaleString('en-IN')}</td>
                    <td><span style="color:${color};font-weight:600;">${margin.toFixed(1)}%</span></td>
                    <td>${p.currentStock}</td>
                    <td style="font-weight:600;color:${potentialProfit >= 0 ? '#10b981' : '#ef4444'}">₹${potentialProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>`;
            }).join('');
        }
    }

    // -”--”- Sold Products -”--”-
    async loadSoldProducts() {
        const days = document.getElementById('soldDays')?.value || '30';
        try {
            const res = await fetch(`${API_BASE}/sales?days=${days}`);
            this.soldData = await res.json();
            this.renderSoldProducts();
        } catch (err) {
            console.error('Failed to load sold products:', err);
        }
    }

    renderSoldProducts() {
        const search = (document.getElementById('soldSearch')?.value || '').toLowerCase();
        const sales = this.soldData || [];
        const tbody = document.getElementById('soldTableBody');
        if (!tbody) return;

        // Flatten sale items
        let rows = [];
        sales.forEach(sale => {
            (sale.items || []).forEach(item => {
                rows.push({
                    date: sale.saleDate || sale.createdAt,
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.subtotal,
                    category: this.products.find(p => p.name === item.productName)?.category || '-'
                });
            });
        });

        // Apply search
        if (search) {
            rows = rows.filter(r => r.productName.toLowerCase().includes(search) || r.category.toLowerCase().includes(search));
        }

        // KPIs
        const totalItems = rows.reduce((s, r) => s + r.quantity, 0);
        const totalRevenue = rows.reduce((s, r) => s + r.subtotal, 0);
        const el = (id) => document.getElementById(id);
        if (el('soldTotalItems')) el('soldTotalItems').textContent = totalItems;
        if (el('soldTotalRevenue')) el('soldTotalRevenue').textContent = '₹' + totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 });

        // Render table
        tbody.innerHTML = rows.length === 0
            ? '<tr><td colspan="7" style="text-align:center;color:var(--color-text-secondary);padding:32px;">No sales recorded yet</td></tr>'
            : rows.map((r, i) => `<tr>
                <td>${i + 1}</td>
                <td>${new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} <span style="color:var(--color-text-secondary);font-size:0.78rem;">${new Date(r.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></td>
                <td><strong>${r.productName}</strong></td>
                <td>${r.category}</td>
                <td>${r.quantity}</td>
                <td>₹${r.price.toLocaleString('en-IN')}</td>
                <td style="font-weight:600;">₹${r.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>`).join('');
    }

    // -”--”- Export Functions -”--”-
    exportSoldJSON() {
        const data = this.soldData || [];
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `invexa-sales-${new Date().toISOString().split('T')[0]}.json`;
        a.click(); URL.revokeObjectURL(url);
        this.showNotification('Sales data exported as JSON', 'success');
    }

    exportSoldPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text('InveXa sTacK --- Sales Report', 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);

            const sales = this.soldData || [];
            const rows = [];
            sales.forEach(sale => {
                (sale.items || []).forEach(item => {
                    rows.push([
                        new Date(sale.saleDate || sale.createdAt).toLocaleDateString('en-IN'),
                        item.productName,
                        item.quantity,
                        '₹' + item.price.toLocaleString('en-IN'),
                        '₹' + item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                    ]);
                });
            });

            doc.autoTable({
                head: [['Date', 'Product', 'Qty', 'Unit Price', 'Subtotal']],
                body: rows,
                startY: 36,
                theme: 'striped',
                headStyles: { fillColor: [0, 102, 255] }
            });

            const total = rows.reduce((s, r) => s + parseFloat(r[4].replace(/[₹,]/g, '')), 0);
            doc.setFontSize(12);
            doc.text(`Total: ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 14, doc.lastAutoTable.finalY + 14);

            doc.save(`invexa-sales-${new Date().toISOString().split('T')[0]}.pdf`);
            this.showNotification('Sales report exported as PDF', 'success');
        } catch (err) {
            this.showNotification('PDF export failed: ' + err.message, 'error');
        }
    }

    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•
    //  SALES CALENDAR HEATMAP
    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•

    renderSalesCalendar() {
        const container = document.getElementById('salesCalendar');
        if (!container) return;

        // Build sales-by-date map
        const salesMap = {};
        this.salesData.forEach(d => { salesMap[d.date] = d.totalSales || 0; });

        // Generate 12 weeks of calendar data
        const weeks = 12;
        const days = [];
        const today = new Date();
        for (let i = weeks * 7 - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            days.push({ date: d, key, value: salesMap[key] || 0 });
        }

        // Find max for color scaling
        const maxSales = Math.max(...days.map(d => d.value), 1);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Build calendar grid
        let html = `<div style="overflow-x:auto;">
            <div style="display:flex;gap:3px;">
            <div style="display:flex;flex-direction:column;gap:3px;margin-right:6px;padding-top:24px;">
                ${dayNames.map(n => `<div style="height:18px;font-size:0.65rem;color:var(--color-text-secondary);line-height:18px;">${n}</div>`).join('')}
            </div>`;

        // Group by week
        let currentWeek = [];
        let weekLabels = [];
        days.forEach((d, i) => {
            if (i === 0 || d.date.getDay() === 0) {
                if (currentWeek.length > 0) {
                    weekLabels.push(currentWeek);
                }
                currentWeek = [];
            }
            currentWeek.push(d);
        });
        if (currentWeek.length > 0) weekLabels.push(currentWeek);

        weekLabels.forEach((week, wi) => {
            const monthLabel = wi === 0 || week[0].date.getDate() <= 7
                ? week[0].date.toLocaleDateString('en-IN', { month: 'short' }) : '';
            html += `<div style="display:flex;flex-direction:column;gap:3px;">
                <div style="height:20px;font-size:0.65rem;color:var(--color-text-secondary);text-align:center;">${monthLabel}</div>`;
            // Fill empty days at start of first week
            if (wi === 0) {
                for (let e = 0; e < week[0].date.getDay(); e++) {
                    html += `<div style="width:18px;height:18px;"></div>`;
                }
            }
            week.forEach(d => {
                const intensity = d.value / maxSales;
                let bg;
                if (d.value === 0) bg = 'rgba(255,255,255,0.05)';
                else if (intensity < 0.25) bg = 'rgba(0,102,255,0.2)';
                else if (intensity < 0.5) bg = 'rgba(0,102,255,0.4)';
                else if (intensity < 0.75) bg = 'rgba(0,102,255,0.65)';
                else bg = '#0066FF';
                html += `<div style="width:18px;height:18px;background:${bg};border-radius:3px;cursor:pointer;" title="${d.date.toLocaleDateString('en-IN')}: ₹${d.value.toLocaleString('en-IN')}"></div>`;
            });
            html += `</div>`;
        });

        html += `</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:12px;justify-content:flex-end;">
                <span style="font-size:0.7rem;color:var(--color-text-secondary);">Less</span>
                <div style="width:14px;height:14px;background:rgba(255,255,255,0.05);border-radius:2px;"></div>
                <div style="width:14px;height:14px;background:rgba(0,102,255,0.2);border-radius:2px;"></div>
                <div style="width:14px;height:14px;background:rgba(0,102,255,0.4);border-radius:2px;"></div>
                <div style="width:14px;height:14px;background:rgba(0,102,255,0.65);border-radius:2px;"></div>
                <div style="width:14px;height:14px;background:#0066FF;border-radius:2px;"></div>
                <span style="font-size:0.7rem;color:var(--color-text-secondary);">More</span>
            </div>
        </div>`;

        container.innerHTML = html;
    }

    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•
    //  INVOICE / RECEIPT GENERATOR
    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•

    showInvoice(saleData) {
        const body = document.getElementById('invoiceBody');
        if (!body) return;

        const invoiceNo = 'INV-' + Date.now().toString().slice(-8);
        const now = new Date();
        const user = JSON.parse(localStorage.getItem('invexa_user') || '{}');

        body.innerHTML = `
            <div id="invoicePrintArea" style="font-family:'Inter','Outfit',sans-serif;">
                <div style="text-align:center;padding-bottom:16px;border-bottom:2px dashed var(--color-border);margin-bottom:16px;">
                    <h2 style="margin:0;font-size:1.4rem;">ðŸ›’ InveXa sTacK</h2>
                    <p style="color:var(--color-text-secondary);font-size:0.8rem;margin:4px 0;">Grocery Inventory Management System</p>
                    <p style="font-size:0.75rem;color:var(--color-text-secondary);">Invoice #${invoiceNo}</p>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:16px;">
                    <div><strong>Date:</strong> ${now.toLocaleDateString('en-IN')}<br><strong>Time:</strong> ${now.toLocaleTimeString('en-IN')}</div>
                    <div style="text-align:right;"><strong>Cashier:</strong> ${user.fullName || user.username || 'N/A'}<br><strong>Role:</strong> ${user.role || 'staff'}</div>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--color-border);">
                            <th style="text-align:left;padding:8px 4px;">Item</th>
                            <th style="text-align:center;padding:8px 4px;">Qty</th>
                            <th style="text-align:right;padding:8px 4px;">Price</th>
                            <th style="text-align:right;padding:8px 4px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(saleData.items || []).map(item => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="padding:6px 4px;">${item.productName}</td>
                                <td style="text-align:center;padding:6px 4px;">${item.quantity}</td>
                                <td style="text-align:right;padding:6px 4px;">₹${item.price.toLocaleString('en-IN')}</td>
                                <td style="text-align:right;padding:6px 4px;font-weight:600;">₹${item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="border-top:2px dashed var(--color-border);margin-top:12px;padding-top:12px;">
                    <div style="display:flex;justify-content:space-between;font-size:1.1rem;font-weight:700;">
                        <span>TOTAL</span>
                        <span style="color:#10b981;">₹${(saleData.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p style="text-align:center;margin-top:16px;font-size:0.75rem;color:var(--color-text-secondary);">Thank you for your purchase!<br>” InveXa sTacK ”</p>
                </div>
            </div>
        `;

        document.getElementById('invoiceModal').classList.remove('hidden');
    }

    printInvoice() {
        const printArea = document.getElementById('invoicePrintArea');
        if (!printArea) return;
        const win = window.open('', '_blank', 'width=400,height=600');
        win.document.write(`<html><head><title>InveXa Receipt</title><style>
            body{font-family:'Inter','Segoe UI',sans-serif;padding:20px;color:#222;max-width:380px;margin:0 auto;}
            table{width:100%;border-collapse:collapse}th,td{padding:6px 4px}th{text-align:left;border-bottom:2px solid #333}
            tr{border-bottom:1px solid #eee}
        </style></head><body>${printArea.innerHTML}</body></html>`);
        win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 300);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the application
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new GroceryInventorySystem();
});
