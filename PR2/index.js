/* ==========================================================================
   INDEX.JS (Dashboard & Global Init)
   ========================================================================== */

const STORE_KEYS = {
    INVENTORY: 'apex_inventory_data',
    SALES: 'apex_sales_data',
    DAILY_HISTORY: 'apex_daily_history'
};

function getInventory() {
    return JSON.parse(localStorage.getItem(STORE_KEYS.INVENTORY)) || [];
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

/* --- Toast Notifications --- */
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

/* --- Global Initialization --- */
document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    if (document.getElementById('revenueChart')) initDashboard();
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

/* --- Dashboard & End-Of-Day System --- */
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
    const badgeStock = document.getElementById('badge-stock');

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

    if (badgeStock) {
        const totalSKUs = inventory.length;
        badgeStock.textContent = `${totalSKUs} SKUs`;
        badgeStock.className = totalSKUs > 0 ? 'badge badge-success' : 'badge badge-neutral';
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

    // Graph Assembly
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
        saveSales([]); // Reset active shift

        modal.classList.remove('active');
        showToast(`Day #${dayRecord.dayNumber} closed! ₱${totalRevenue.toFixed(2)} archived.`, 'success');

        initDashboard();
    };
}