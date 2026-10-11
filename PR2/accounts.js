/* ==========================================================================
   ACCOUNTS.JS (Admin Account & Utang Manager)
   ========================================================================== */

const STORE_KEYS = {
    ACCOUNTS: 'apex_accounts_data'
};

function getAccounts() {
    return JSON.parse(localStorage.getItem(STORE_KEYS.ACCOUNTS)) || [];
}

function saveAccounts(data) {
    localStorage.setItem(STORE_KEYS.ACCOUNTS, JSON.stringify(data));
}

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initAccountsPage();
    initPaymentModal();
});

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    }
}

function initAccountsPage() {
    renderAccountsTable();

    const modal = document.getElementById('account-modal');
    const openBtn = document.getElementById('open-account-modal-btn');
    const closeBtn = document.getElementById('close-account-modal-btn');
    const cancelBtn = document.getElementById('cancel-account-modal-btn');
    const form = document.getElementById('account-form');
    const searchInput = document.getElementById('account-search');

    const openModal = () => { if (modal) modal.classList.add('active'); };
    const closeModal = () => { 
        if (modal) modal.classList.remove('active'); 
        if (form) form.reset(); 
    };

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('acc-name').value.trim();
            const balance = parseFloat(document.getElementById('acc-balance').value) || 0;

            if (!name) return;

            let accounts = getAccounts();
            accounts.push({
                id: `acc_${Date.now()}`,
                name: name,
                balance: balance
            });

            saveAccounts(accounts);
            renderAccountsTable();
            closeModal();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderAccountsTable);
    }
}

function initPaymentModal() {
    const modal = document.getElementById('payment-modal');
    const closeBtn = document.getElementById('close-payment-modal-btn');
    const cancelBtn = document.getElementById('cancel-payment-modal-btn');
    const form = document.getElementById('payment-form');

    const closeModal = () => {
        if (modal) modal.classList.remove('active');
        if (form) form.reset();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('pay-account-id').value;
            const amount = parseFloat(document.getElementById('pay-amount').value) || 0;

            let accounts = getAccounts();
            const acc = accounts.find(a => a.id === id);
            if (acc) {
                acc.balance = Math.max(0, acc.balance - amount);
                saveAccounts(accounts);
                renderAccountsTable();
            }
            closeModal();
        });
    }
}

function renderAccountsTable() {
    const tableBody = document.getElementById('accounts-table-body');
    if (!tableBody) return;

    const searchVal = document.getElementById('account-search')?.value.toLowerCase() || '';
    const accounts = getAccounts();

    const filtered = accounts.filter(acc => acc.name.toLowerCase().includes(searchVal));

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;" class="text-muted">No accounts registered yet.</td></tr>`;
        return;
    }

    tableBody.innerHTML = filtered.map(acc => `
        <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 12px 16px;"><strong>${acc.name}</strong></td>
            <td style="padding: 12px 16px;"><span class="text-muted" style="font-size: 0.85rem;">${acc.id}</span></td>
            <td style="padding: 12px 16px;"><strong class="${acc.balance > 0 ? 'text-danger' : 'text-success'}">₱${acc.balance.toFixed(2)}</strong></td>
            <td style="padding: 12px 16px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn-primary" onclick="openPaymentModal('${acc.id}')" style="padding: 12px 12px; font-size: 0.8rem; border-radius: 10px;">Record Payment</button>
                    <button class="btn-icon text-danger" onclick="deleteAccount('${acc.id}')" title="Delete Account" style="background: rgba(230, 223, 223, 0.1); border-radius: 6px; padding: 6px; display: inline-flex; align-items: center; justify-content: center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openPaymentModal(id) {
    const accounts = getAccounts();
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;

    document.getElementById('pay-account-id').value = acc.id;
    document.getElementById('pay-account-label').textContent = `Customer: ${acc.name}`;
    document.getElementById('pay-account-balance-display').textContent = `Current Balance: ₱${acc.balance.toFixed(2)}`;
    
    const modal = document.getElementById('payment-modal');
    if (modal) modal.classList.add('active');
}

function deleteAccount(id) {
    if (!confirm("Are you sure you want to delete this account?")) return;
    let accounts = getAccounts();
    accounts = accounts.filter(a => a.id !== id);
    saveAccounts(accounts);
    renderAccountsTable();
}

window.openPaymentModal = openPaymentModal;
window.deleteAccount = deleteAccount;