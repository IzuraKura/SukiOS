/* ==========================================================================
   INVENTORY.JS
   ========================================================================== */

const STORE_KEYS = {
    INVENTORY: 'apex_inventory_data'
};

function getInventory() {
    return JSON.parse(localStorage.getItem(STORE_KEYS.INVENTORY)) || [];
}

function saveInventory(data) {
    localStorage.setItem(STORE_KEYS.INVENTORY, JSON.stringify(data));
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
    if (document.getElementById('inventory-table-body')) {
        initInventoryPage();
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

/* --- Inventory Page Logic --- */
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
    if (!tableBody) return;

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

// Attach globally for inline HTML template triggers
window.quickRestock = quickRestock;
window.deleteItem = deleteItem;