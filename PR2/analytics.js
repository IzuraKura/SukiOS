/* ==========================================================================
   ANALYTICS.JS (Sales Reporting, Visuals & What-If Simulator)
   ========================================================================== */

const STORE_KEYS = {
    SALES: 'apex_sales_data',
    ACCOUNTS: 'apex_accounts_data'
};

function getSales() {
    return JSON.parse(localStorage.getItem(STORE_KEYS.SALES)) || [];
}

function getAccounts() {
    return JSON.parse(localStorage.getItem(STORE_KEYS.ACCOUNTS)) || [];
}

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    renderAnalytics();
    initSimulator();

    const clearBtn = document.getElementById('clear-sales-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to clear all transaction history?")) {
                localStorage.setItem(STORE_KEYS.SALES, JSON.stringify([]));
                renderAnalytics();
                initSimulator();
            }
        });
    }
});

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    }
}

let cachedTotalRevenue = 0;

function renderAnalytics() {
    const sales = getSales();
    const accounts = getAccounts();

    let totalRevenue = 0;
    let totalProfit = 0;
    let cashRevenue = 0;
    let tabRevenue = 0;

    sales.forEach(s => {
        const rev = s.revenue || 0;
        const prof = s.profit || 0;
        totalRevenue += rev;
        totalProfit += prof;

        if (s.accountId && s.accountId !== 'walkin') {
            tabRevenue += rev;
        } else {
            cashRevenue += rev;
        }
    });

    cachedTotalRevenue = totalRevenue;

    const totalCollectibles = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Update KPIs
    document.getElementById('stat-revenue').textContent = `₱${totalRevenue.toFixed(2)}`;
    document.getElementById('stat-profit').textContent = `₱${totalProfit.toFixed(2)}`;
    document.getElementById('stat-collectibles').textContent = `₱${totalCollectibles.toFixed(2)}`;
    document.getElementById('stat-orders').textContent = sales.length.toString();

    // Render Aura Visual Bars
    renderAuraChart(cashRevenue, tabRevenue, totalRevenue);
    renderSalesTable(sales, accounts);
    updateSimulatorOutput();
}

function renderAuraChart(cash, tab, total) {
    const container = document.getElementById('aura-chart-container');
    if (!container) return;

    if (total === 0) {
        container.innerHTML = `<p class="text-muted" style="font-size: 0.85rem;">No revenue data available for breakdown.</p>`;
        return;
    }

    const cashPercent = Math.round((cash / total) * 100);
    const tabPercent = Math.round((tab / total) * 100);

    container.innerHTML = `
        <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                <span class="text-muted">Direct Cash Sales</span>
                <strong>₱${cash.toFixed(2)} (${cashPercent}%)</strong>
            </div>
            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
                <div style="width: ${cashPercent}%; height: 100%; background: var(--accent); border-radius: 4px;"></div>
            </div>
        </div>
        <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                <span class="text-muted">Charged Tab Sales</span>
                <strong>₱${tab.toFixed(2)} (${tabPercent}%)</strong>
            </div>
            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
                <div style="width: ${tabPercent}%; height: 100%; background: var(--text-danger); border-radius: 4px;"></div>
            </div>
        </div>
    `;
}

function initSimulator() {
    const slider = document.getElementById('sim-slider');
    if (!slider) return;

    slider.addEventListener('input', updateSimulatorOutput);
}

function updateSimulatorOutput() {
    const slider = document.getElementById('sim-slider');
    const label = document.getElementById('slider-label');
    const output = document.getElementById('sim-output');
    if (!slider || !label || !output) return;

    const extraCustomers = parseInt(slider.value) || 0;
    label.textContent = `Extra Daily Customers: +${extraCustomers}`;

    // Estimate average spend per customer around ₱50 over 20 operating school days a month
    const estimatedMonthlyBoost = extraCustomers * 50 * 20;
    output.textContent = `+₱${estimatedMonthlyBoost.toFixed(2)}`;
}

function renderSalesTable(sales, accounts) {
    const tableBody = document.getElementById('sales-table-body');
    if (!tableBody) return;

    if (sales.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;" class="text-muted">No transactions recorded yet.</td></tr>`;
        return;
    }

    const sortedSales = [...sales].reverse();

    tableBody.innerHTML = sortedSales.map(sale => {
        const dateStr = new Date(sale.timestamp).toLocaleString();
        const itemsSummary = (sale.items || []).map(i => `${i.name} (x${i.qty})`).join(', ') || 'N/A';

        let paymentBadge = `<span style="background: rgba(88, 101, 242, 0.15); color: var(--accent); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">Cash</span>`;
        if (sale.accountId && sale.accountId !== 'walkin') {
            const acc = accounts.find(a => a.id === sale.accountId);
            const name = acc ? acc.name : 'Account';
            paymentBadge = `<span style="background: rgba(237, 66, 69, 0.15); color: var(--text-danger); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">Tab: ${name}</span>`;
        }

        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 12px 16px;"><span class="text-muted" style="font-size: 0.85rem;">${dateStr}</span></td>
                <td style="padding: 12px 16px;">${itemsSummary}</td>
                <td style="padding: 12px 16px;"><strong>₱${(sale.revenue || 0).toFixed(2)}</strong></td>
                <td style="padding: 12px 16px;">${paymentBadge}</td>
            </tr>
        `;
    }).join('');
}