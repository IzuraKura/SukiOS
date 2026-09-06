/* ==========================================================================
   1. DATA STORE & LOCALSTORAGE HANDLERS
   ========================================================================== */
const STORE_KEYS = {
    INVENTORY: 'apex_inventory_data',
    SALES: 'apex_sales_data',
    DAILY_HISTORY: 'apex_daily_history'
};

function getInventory() {
    return JSON.parse(localStorage.getItem(STORE_KEYS.INVENTORY)) || [];
}

function saveInventory(data) {
    localStorage.setItem(STORE_KEYS.INVENTORY, JSON.stringify(data));
}

function getSales() {
    return JSON.parse(localStorage.getItem(STORE_KEYS.SALES)) || [];
}

function saveSales(data) {
    localStorage.setItem(STORE_KEYS.SALES, JSON.stringify(data));
}

function getDailyHistory() {
    return JSON.parse(localStorage.getItem(STORE_KEYS.DAILY_HISTORY)) || [];
}

function saveDailyHistory(data) {
    localStorage.setItem(STORE_KEYS.DAILY_HISTORY, JSON.stringify(data));
}

let cart = [];
let activePOSCategory = 'all';

/* ==========================================================================
   2. UI HELPER: TOAST NOTIFICATIONS
   ========================================================================== */
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

/* ==========================================================================
   3. GLOBAL INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    
    if (document.getElementById('revenueChart')) initDashboard();
    if (document.getElementById('inventory-table-body')) initInventoryPage();
    if (document.getElementById('pos-product-grid')) initPOSPage();
    if (document.getElementById('price-slider')) initAnalyticsPage();
});

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
}

/* ==========================================================================
   4. INVENTORY PAGE LOGIC
   ========================================================================== */
function initInventoryPage() {
    renderInventoryTable();

    const modal = document.getElementById('item-modal');
    const openBtn = document.getElementById('open-modal-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-modal-btn');
    const itemForm = document.getElementById('item-form');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');

    const openModal = () => modal.classList.add('active');
    const closeModal = () => {
        modal.classList.remove('active');
        itemForm.reset();
    };

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('item-name').value.trim();
        const categoryInput = document.getElementById('item-category').value;
        const stockInput = parseInt(document.getElementById('item-stock').value, 10) || 0;
        const costInput = parseFloat(document.getElementById('item-cost').value) || 0;
        const priceInput = parseFloat(document.getElementById('item-price').value) || 0;

        let inventory = getInventory();
        
        // Auto-detect if item is an ulam/meal (disables stock limits)
        const isMeal = categoryInput.toLowerCase().includes('meal') || categoryInput.toLowerCase().includes('ulam');

        const existingIndex = inventory.findIndex(item => item.name.toLowerCase() === nameInput.toLowerCase());

        if (existingIndex !== -1) {
            if (!isMeal) {
                inventory[existingIndex].stock += stockInput;
            }
            inventory[existingIndex].cost = costInput;
            inventory[existingIndex].price = priceInput;
            inventory[existingIndex].category = categoryInput;

            showToast(`Updated ${inventory[existingIndex].name}!`, 'success');
        } else {
            const newItem = {
                id: Date.now().toString(),
                name: nameInput,
                category: categoryInput,
                stock: isMeal ? 0 : stockInput,
                cost: costInput,
                price: priceInput,
                trackStock: !isMeal
            };
            inventory.push(newItem);
            showToast(`Added ${nameInput} to menu!`, 'success');
        }

        saveInventory(inventory);
        renderInventoryTable();
        closeModal();
    });

    if (searchInput) searchInput.addEventListener('input', renderInventoryTable);
    if (categoryFilter) categoryFilter.addEventListener('change', renderInventoryTable);
}

function renderInventoryTable() {
    const tableBody = document.getElementById('inventory-table-body');
    const searchVal = document.getElementById('search-input')?.value.toLowerCase() || '';
    const filterVal = document.getElementById('category-filter')?.value || 'all';
    
    const inventory = getInventory();
    
    const filtered = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchVal);
        const matchesCategory = filterVal === 'all' || item.category === filterVal;
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <p class="text-muted">No inventory items found. Add products to populate.</p>
                </td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = filtered.map(item => {
        let statusBadge = '<span class="badge badge-success">In Stock</span>';
        let displayStock = item.stock;

        if (item.trackStock === false) {
            statusBadge = '<span class="badge badge-neutral">Uncounted Meal</span>';
            displayStock = '∞ (Portions)';
        } else if (item.stock === 0) {
            statusBadge = '<span class="badge badge-danger">Out of Stock</span>';
        } else if (item.stock <= 5) {
            statusBadge = '<span class="badge badge-warning">Low Stock</span>';
        }

        return `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td><span class="text-muted">${item.category}</span></td>
                <td>₱${item.cost.toFixed(2)}</td>
                <td>₱${item.price.toFixed(2)}</td>
                <td>${displayStock}</td>
                <td>${statusBadge}</td>
                <td>
                    ${item.trackStock !== false ? `
                    <button class="btn-icon text-accent" onclick="quickRestock('${item.id}')" title="Add 10 Units" style="margin-right: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>` : ''}
                    <button class="btn-icon text-danger" onclick="deleteItem('${item.id}')" title="Delete Item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

function quickRestock(id) {
    let inventory = getInventory();
    const item = inventory.find(i => i.id === id);
    if (item && item.trackStock !== false) {
        item.stock += 10;
        saveInventory(inventory);
        renderInventoryTable();
        showToast(`Added +10 stock to ${item.name}`, 'success');
    }
}

function deleteItem(id) {
    let inventory = getInventory();
    inventory = inventory.filter(item => item.id !== id);
    saveInventory(inventory);
    renderInventoryTable();
    showToast('Item deleted.', 'danger');
}

/* ==========================================================================
   5. POS KIOSK & CUSTOM ITEM LOGIC
   ========================================================================== */
function initPOSPage() {
    renderPOSGrid();
    setupCustomPriceModal();

    const checkoutBtn = document.getElementById('checkout-btn');
    const clearBtn = document.getElementById('clear-cart-btn');
    const searchInput = document.getElementById('pos-search');
    const categoryPills = document.getElementById('pos-category-pills');

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            cart = [];
            renderCart();
        });
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', processCheckout);
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderPOSGrid);
    }

    if (categoryPills) {
        categoryPills.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            categoryPills.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            activePOSCategory = button.getAttribute('data-category') || 'all';
            renderPOSGrid();
        });
    }
}

function renderPOSGrid() {
    const grid = document.getElementById('pos-product-grid');
    if (!grid) return;

    const searchVal = document.getElementById('pos-search')?.value.toLowerCase() || '';
    
    const inventory = getInventory().filter(item => {
        const isAvailable = item.trackStock === false || item.stock > 0;
        const matchesSearch = item.name.toLowerCase().includes(searchVal);
        const matchesCategory = activePOSCategory === 'all' || item.category === activePOSCategory;
        
        return isAvailable && matchesSearch && matchesCategory;
    });

    const customTile = `
        <div class="pos-product-card" onclick="document.getElementById('custom-price-modal').classList.add('active')" style="border: 2px dashed var(--accent);">
            <div>
                <strong class="text-accent">+ Custom Item / Charge</strong>
                <p class="text-muted" style="font-size: 0.8rem;">Flexible amount/discount</p>
            </div>
            <strong class="text-accent">₱ Flexible</strong>
        </div>
    `;

    const productTiles = inventory.map(item => `
        <div class="pos-product-card" onclick="addToCart('${item.id}')">
            <div>
                <strong>${item.name}</strong>
                <p class="text-muted" style="font-size: 0.8rem;">
                    ${item.trackStock === false ? 'Fresh Portion' : `Stock: ${item.stock}`}
                </p>
            </div>
            <strong class="text-accent">₱${item.price.toFixed(2)}</strong>
        </div>
    `).join('');

    grid.innerHTML = customTile + productTiles;
}

function setupCustomPriceModal() {
    const modal = document.getElementById('custom-price-modal');
    const priceInput = document.getElementById('custom-item-price');
    const cancelBtn = document.getElementById('cancel-custom-price-btn');
    const confirmBtn = document.getElementById('confirm-custom-price-btn');

    if (!modal) return;

    cancelBtn.onclick = () => modal.classList.remove('active');

    confirmBtn.onclick = () => {
        const val = parseFloat(priceInput.value);
        if (isNaN(val) || val <= 0) {
            showToast('Enter a valid price!', 'warning');
            return;
        }

        const customItem = {
            id: `custom_${Date.now()}`,
            name: `Custom Charge (₱${val.toFixed(2)})`,
            price: val,
            cost: val * 0.6,
            qty: 1,
            trackStock: false
        };

        cart.push(customItem);
        renderCart();
        showToast(`Added Custom Charge (₱${val.toFixed(2)})`, 'success');
        priceInput.value = '';
        modal.classList.remove('active');
    };
}

function addToCart(itemId) {
    const inventory = getInventory();
    const product = inventory.find(i => i.id === itemId);

    if (!product) return;

    const cartItem = cart.find(c => c.id === itemId);
    if (cartItem) {
        if (product.trackStock === false || cartItem.qty < product.stock) {
            cartItem.qty += 1;
        } else {
            showToast('Stock limit reached for this item.', 'warning');
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            cost: product.cost,
            qty: 1,
            trackStock: product.trackStock
        });
    }

    renderCart();
}

function renderCart() {
    const cartList = document.getElementById('cart-list');
    const totalEl = document.getElementById('cart-total');
    const subtotalEl = document.getElementById('cart-subtotal');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (cart.length === 0) {
        cartList.innerHTML = `<li class="empty-state"><p class="text-muted">Cart is empty. Tap products to add.</p></li>`;
        totalEl.textContent = '₱0.00';
        subtotalEl.textContent = '₱0.00';
        checkoutBtn.disabled = true;
        return;
    }

    let subtotal = 0;
    cartList.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        return `
            <li class="cart-item">
                <div>
                    <strong>${item.name}</strong>
                    <p class="text-muted" style="font-size: 0.8rem;">₱${item.price.toFixed(2)} x ${item.qty}</p>
                </div>
                <strong>₱${itemTotal.toFixed(2)}</strong>
            </li>`;
    }).join('');

    subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
    totalEl.textContent = `₱${subtotal.toFixed(2)}`;
    checkoutBtn.disabled = false;
}

function processCheckout() {
    if (cart.length === 0) return;

    let inventory = getInventory();
    let sales = getSales();

    let totalRevenue = 0;
    let totalCost = 0;

    cart.forEach(cartItem => {
        const invItem = inventory.find(i => i.id === cartItem.id);
        if (invItem && invItem.trackStock !== false) {
            invItem.stock = Math.max(0, invItem.stock - cartItem.qty);
        }
        totalRevenue += cartItem.price * cartItem.qty;
        totalCost += cartItem.cost * cartItem.qty;
    });

    const saleRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        revenue: totalRevenue,
        profit: totalRevenue - totalCost,
        items: [...cart]
    };

    sales.push(saleRecord);

    saveInventory(inventory);
    saveSales(sales);

    showToast('Sale completed successfully!', 'success');
    cart = [];
    renderCart();
    renderPOSGrid();
}

/* ==========================================================================
   6. DASHBOARD & END-OF-DAY SYSTEM
   ========================================================================== */
let activeChart = null;

function initDashboard() {
    const inventory = getInventory();
    const currentSales = getSales();
    const dailyHistory = getDailyHistory();

    const totalRevenue = currentSales.reduce((sum, s) => sum + s.revenue, 0);
    const totalProfit = currentSales.reduce((sum, s) => sum + s.profit, 0);
    const trackedItems = inventory.filter(i => i.trackStock !== false);
    const totalStockCount = trackedItems.reduce((sum, i) => sum + i.stock, 0);
    const criticalItems = trackedItems.filter(i => i.stock <= 5);

    const marginPercent = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    document.getElementById('val-revenue').textContent = `₱${totalRevenue.toFixed(2)}`;
    document.getElementById('val-profit').textContent = `₱${totalProfit.toFixed(2)}`;
    document.getElementById('val-stock').textContent = totalStockCount;
    document.getElementById('val-alerts').textContent = `${criticalItems.length} Items`;

    const badgeRevenue = document.getElementById('badge-revenue');
    const badgeProfit = document.getElementById('badge-profit');
    const badgeAlerts = document.getElementById('badge-alerts');

    if (badgeRevenue) {
        badgeRevenue.textContent = currentSales.length === 0 ? 'No sales yet today' : `${currentSales.length} Today`;
        badgeRevenue.className = currentSales.length > 0 ? 'badge badge-success' : 'badge badge-neutral';
    }

    if (badgeProfit) {
        badgeProfit.textContent = `${marginPercent}% Margin`;
        badgeProfit.className = marginPercent > 0 ? 'badge badge-success' : 'badge badge-neutral';
    }

    if (badgeAlerts) {
        if (criticalItems.length > 0) {
            badgeAlerts.textContent = 'Needs Reorder';
            badgeAlerts.className = 'badge badge-danger';
        } else {
            badgeAlerts.textContent = 'Stock Healthy';
            badgeAlerts.className = 'badge badge-success';
        }
    }

    const alertList = document.getElementById('depletion-list');
    if (alertList) {
        if (criticalItems.length === 0) {
            alertList.innerHTML = `<li class="empty-state"><p class="text-muted">Stock healthy. No low stock warnings.</p></li>`;
        } else {
            alertList.innerHTML = criticalItems.map(i => `
                <li class="alert-item">
                    <div>
                        <strong>${i.name}</strong>
                        <p class="text-muted">${i.stock} units remaining</p>
                    </div>
                    <span class="badge badge-danger">Low Stock</span>
                </li>
            `).join('');
        }
    }

    // Graph Assembly: Past Closed Days + Active Shift Day
    const chartLabels = dailyHistory.map(d => `Day #${d.dayNumber}`);
    const chartRevenue = dailyHistory.map(d => d.revenue);
    const chartProfit = dailyHistory.map(d => d.profit);

    chartLabels.push(`Day #${dailyHistory.length + 1} (Active)`);
    chartRevenue.push(totalRevenue);
    chartProfit.push(totalProfit);

    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    if (activeChart) activeChart.destroy();

    activeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Revenue (₱)',
                    data: chartRevenue,
                    borderColor: '#5865f2',
                    backgroundColor: 'rgba(88, 101, 242, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Net Profit (₱)',
                    data: chartProfit,
                    borderColor: '#57f287',
                    backgroundColor: 'rgba(87, 242, 135, 0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    setupEndDayControls();
}

function setupEndDayControls() {
    const endDayBtn = document.getElementById('end-day-btn');
    const modal = document.getElementById('end-day-modal');
    const cancelBtn = document.getElementById('cancel-end-day-btn');
    const confirmBtn = document.getElementById('confirm-end-day-btn');

    if (!endDayBtn || !modal) return;

    endDayBtn.onclick = () => modal.classList.add('active');
    cancelBtn.onclick = () => modal.classList.remove('active');

    confirmBtn.onclick = () => {
        const sales = getSales();
        
        if (sales.length === 0) {
            showToast('No sales recorded today to summarize!', 'warning');
            modal.classList.remove('active');
            return;
        }

        const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
        const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
        const dailyHistory = getDailyHistory();

        const dayRecord = {
            dayNumber: dailyHistory.length + 1,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            totalSalesCount: sales.length,
            revenue: totalRevenue,
            profit: totalProfit
        };

        dailyHistory.push(dayRecord);
        saveDailyHistory(dailyHistory);

        // Reset active sales register for next business day
        saveSales([]);

        modal.classList.remove('active');
        showToast(`Day #${dayRecord.dayNumber} closed! ₱${totalRevenue.toFixed(2)} archived.`, 'success');

        initDashboard();
    };
}

/* ==========================================================================
   7. ANALYTICS SIMULATION
   ========================================================================== */
function initAnalyticsPage() {
    const priceSlider = document.getElementById('price-slider');
    const costSlider = document.getElementById('cost-slider');

    const updateSimulation = () => {
        const priceAdj = parseFloat(priceSlider.value);
        const costAdj = parseFloat(costSlider.value);

        document.getElementById('price-adj-val').textContent = `${priceAdj >= 0 ? '+' : ''}${priceAdj}%`;
        document.getElementById('cost-adj-val').textContent = `${costAdj >= 0 ? '+' : ''}${costAdj}%`;

        const inventory = getInventory();
        let projectedRev = 0;
        let projectedProfit = 0;

        inventory.forEach(item => {
            const count = item.trackStock !== false ? item.stock : 20;
            const newPrice = item.price * (1 + priceAdj / 100);
            const newCost = item.cost * (1 + costAdj / 100);
            projectedRev += newPrice * count;
            projectedProfit += (newPrice - newCost) * count;
        });

        document.getElementById('sim-revenue').textContent = `₱${projectedRev.toFixed(2)}`;
        document.getElementById('sim-profit').textContent = `₱${projectedProfit.toFixed(2)}`;
    };

    if (priceSlider && costSlider) {
        priceSlider.addEventListener('input', updateSimulation);
        costSlider.addEventListener('input', updateSimulation);
        updateSimulation();
    }
}