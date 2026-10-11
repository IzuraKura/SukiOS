/* ==========================================================================
   POS.JS (Point of Sale & Checkout)
   ========================================================================== */

const STORE_KEYS = {
    INVENTORY: 'apex_inventory_data',
    SALES: 'apex_sales_data'
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

let cart = [];
let activePOSCategory = 'all';

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
    if (document.getElementById('pos-product-grid')) {
        initPOSPage();
    }
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

/* --- POS Page Logic --- */
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

    if (!cartList) return;

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
    let accounts = JSON.parse(localStorage.getItem('apex_accounts_data')) || [];

    // Get selected customer from the POS dropdown
    const customerSelect = document.getElementById('pos-customer-select');
    const selectedAccountId = customerSelect ? customerSelect.value : 'walkin';

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

    // If they chose a registered account instead of walk-in, charge it to their tab
    if (selectedAccountId !== 'walkin') {
        const targetAccount = accounts.find(acc => acc.id === selectedAccountId);
        if (targetAccount) {
            targetAccount.balance = (targetAccount.balance || 0) + totalRevenue;
            localStorage.setItem('apex_accounts_data', JSON.stringify(accounts));
        }
    }

    const saleRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        revenue: totalRevenue,
        profit: totalRevenue - totalCost,
        accountId: selectedAccountId !== 'walkin' ? selectedAccountId : null, // Ties purchase to their ledger!
        items: [...cart]
    };

    sales.push(saleRecord);

    saveInventory(inventory);
    saveSales(sales);

    showToast('Sale completed successfully!', 'success');
    cart = [];
    renderCart();
    renderPOSGrid();
    
    // Refresh dropdown balances so they update live
    if (typeof loadPOSAccounts === 'function') {
        loadPOSAccounts();
    }
}

// Load registered accounts into the POS customer dropdown
function loadPOSAccounts() {
    const select = document.getElementById('pos-customer-select');
    if (!select) return;

    const accounts = JSON.parse(localStorage.getItem('apex_accounts_data')) || [];

    // Keep the walk-in default option, then append registered accounts
    let optionsHtml = `<option value="walkin">Walk-in Customer (General Cash)</option>`;
    
    accounts.forEach(acc => {
        optionsHtml += `<option value="${acc.id}">${acc.name} (Tab Balance: ₱${(acc.balance || 0).toFixed(2)})</option>`;
    });

    select.innerHTML = optionsHtml;
}

// Call loadPOSAccounts when the POS page loads (inside your DOMContentLoaded or init block)
document.addEventListener('DOMContentLoaded', () => {
    loadPOSAccounts();
});

// Attach globally for template triggers
window.addToCart = addToCart;