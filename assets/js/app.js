(function () {
    'use strict';

    const { api, formatMoney, escapeHtml } = window.CafeCash;

    async function init() {
        if (!localStorage.getItem('cafecash_token')) {
            window.location.href = 'login.html';
            return;
        }

        try {
            // Load user
            const me = await api('/auth/me');
            window.CafeCash.state.user = me.data;
            window.CafeCash.state.cafe = me.data.activeCafe;

            // Update UI
            document.getElementById('userName').textContent = me.data.name || 'User';
            document.getElementById('userAvatar').textContent = (me.data.name || 'U')[0].toUpperCase();

            // Load initial page
            await renderPage('dashboard');

            // Handle navigation
            document.querySelectorAll('.app-nav-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelectorAll('.app-nav-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    renderPage(item.dataset.page);
                });
            });

            console.log('✅ Dashboard loaded');
        } catch (err) {
            console.error('Init error:', err);
            if (err.message === 'Session expired') return;
            document.getElementById('appContent').innerHTML =
                '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">' +
                escapeHtml(err.message) + '</div></div>';
        }
    }

    async function renderPage(page) {
        const content = document.getElementById('appContent');
        content.innerHTML = '<div style="padding:40px;text-align:center;">Loading…</div>';

        try {
            if (page === 'dashboard') {
                const dash = await api('/dashboard');
                const d = dash.data;

                content.innerHTML = `
                    <div class="page-header">
                        <h1 class="page-title">Dashboard</h1>
                        <p class="page-subtitle">Welcome back to ${escapeHtml(window.CafeCash.state.cafe?.name || 'your café')}</p>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-card-label">Revenue</div>
                            <div class="stat-card-value">${formatMoney(d.totalRevenue)}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card-label">Profit</div>
                            <div class="stat-card-value">${formatMoney(d.totalProfit)}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card-label">Orders</div>
                            <div class="stat-card-value">${d.totalOrders}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card-label">Items</div>
                            <div class="stat-card-value">${d.totalItems}</div>
                        </div>
                    </div>
                `;
            } else if (page === 'inventory') {
                const res = await api('/inventory');
                const items = res.data || [];

                content.innerHTML = `
                    <div class="page-header">
                        <h1 class="page-title">Inventory</h1>
                        <p class="page-subtitle">${items.length} product(s)</p>
                    </div>
                    ${items.length ? `
                        <div class="content-card">
                            <table class="data-table">
                                <thead><tr><th>Product</th><th>Stock</th><th>Cost</th><th>Price</th></tr></thead>
                                <tbody>
                                    ${items.map(i => `
                                        <tr>
                                            <td>${escapeHtml(i.icon || '📦')} ${escapeHtml(i.name)}</td>
                                            <td>${i.qty || 0}</td>
                                            <td>${formatMoney(i.cost)}</td>
                                            <td>${formatMoney(i.price)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">No products yet</div></div>'}
                `;
            } else if (page === 'sales') {
                const res = await api('/sales?limit=50');
                const sales = res.data || [];

                content.innerHTML = `
                    <div class="page-header">
                        <h1 class="page-title">Sales</h1>
                        <p class="page-subtitle">${sales.length} record(s)</p>
                    </div>
                    ${sales.length ? `
                        <div class="content-card">
                            <table class="data-table">
                                <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Revenue</th></tr></thead>
                                <tbody>
                                    ${sales.map(s => `
                                        <tr>
                                            <td>${escapeHtml(s.date)}</td>
                                            <td>${escapeHtml(s.itemName)}</td>
                                            <td>${s.qty}</td>
                                            <td>${formatMoney(s.revenue)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<div class="empty-state"><div class="empty-icon">💰</div><div class="empty-title">No sales yet</div></div>'}
                `;
            } else {
                content.innerHTML = `
                    <div class="page-header">
                        <h1 class="page-title">${page.charAt(0).toUpperCase() + page.slice(1)}</h1>
                    </div>
                    <div class="empty-state">
                        <div class="empty-icon">🚧</div>
                        <div class="empty-title">Coming soon</div>
                    </div>
                `;
            }
        } catch (err) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <div class="empty-title">Could not load ${page}</div>
                    <div class="empty-desc">${escapeHtml(err.message)}</div>
                </div>
            `;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
