/**
 * CafeCash Page Renderers
 * Each page fetches data and renders into #appContent.
 */

(function () {
    'use strict';

    const { api, toast, state, formatMoney, formatNumber, formatDate, timeAgo, escapeHtml } = window.CafeCash;

    const Pages = {};

    // ═══════════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════════
    Pages.dashboard = async function (container) {
        const [dashRes, chartRes, insightsRes] = await Promise.allSettled([
            api('/dashboard'),
            api(`/dashboard/chart?range=${state.chartRange}`),
            api('/ai/insights')
        ]);

        const dash = dashRes.status === 'fulfilled' ? dashRes.value.data : null;
        const chart = chartRes.status === 'fulfilled' ? chartRes.value.data : [];
        const insights = insightsRes.status === 'fulfilled' ? insightsRes.value.data : [];

        const hour = new Date().getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        const name = (state.user?.name || 'there').split(' ')[0];

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-row">
                    <div>
                        <h1 class="page-title">${greet}, ${escapeHtml(name)}</h1>
                        <p class="page-subtitle">Here's what needs your attention today</p>
                    </div>
                    <div class="row row-2">
                        <button class="btn btn-secondary btn-sm" onclick="navigateTo('sales')">＋ Quick sale</button>
                        <button class="btn btn-primary btn-sm" onclick="openAIPanel()">🤖 Ask CafeCash</button>
                    </div>
                </div>
            </div>

            <div class="stats-grid">
                ${statCard('Revenue', formatMoney(dash?.totalRevenue || 0), '💰', dash?.revenueGrowth, 'var(--brand-amber)')}
                ${statCard('Orders', formatNumber(dash?.totalOrders || 0), '📋', dash?.orderGrowth, 'var(--info)')}
                ${statCard('Profit', formatMoney(dash?.totalProfit || 0), '📈', dash?.profitGrowth, 'var(--success)')}
                ${statCard('Stock value', formatMoney(dash?.inventoryValue || 0), '📦', null, 'var(--brand-rose)')}
            </div>

            <div class="dash-grid">
                <div class="content-card">
                    <div class="content-card-header">
                        <div>
                            <div class="content-card-title">📊 Revenue overview</div>
                            <div class="content-card-subtitle">Revenue and profit trends</div>
                        </div>
                        <div class="row row-2" id="chartRangeBtns">
                            ${['7d', '15d', '1m', '1y'].map(r => `
                                <button class="btn btn-secondary btn-sm ${r === state.chartRange ? 'active' : ''}"
                                        data-range="${r}" onclick="setChartRange('${r}')">${r.toUpperCase()}</button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="dash-chart-wrap">
                        <canvas id="dashChart"></canvas>
                    </div>
                </div>

                <div class="content-card">
                    <div class="content-card-header">
                        <div>
                            <div class="content-card-title">🚨 Attention center</div>
                            <div class="content-card-subtitle">${insights.length ? insights.length + ' item(s) need review' : 'All clear'}</div>
                        </div>
                    </div>
                    ${insights.length ? `
                        <div class="attention-list">
                            ${insights.map(i => attentionItem(i)).join('')}
                        </div>
                    ` : `
                        <div class="empty-state" style="padding:32px 12px;">
                            <div class="empty-icon">✨</div>
                            <div class="empty-title">All caught up</div>
                            <div class="empty-desc">Nothing needs your attention right now.</div>
                        </div>
                    `}
                </div>
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div>
                        <div class="content-card-title">⚡ Quick actions</div>
                        <div class="content-card-subtitle">Get things done in one click</div>
                    </div>
                </div>
                <div class="quick-actions">
                    <button class="quick-action" onclick="navigateTo('sales')">
                        <span class="quick-action-icon">💰</span>
                        <span class="quick-action-label">Add Sale</span>
                    </button>
                    <button class="quick-action" onclick="navigateTo('inventory')">
                        <span class="quick-action-icon">📦</span>
                        <span class="quick-action-label">Add Stock</span>
                    </button>
                    <button class="quick-action" onclick="navigateTo('waste')">
                        <span class="quick-action-icon">🗑️</span>
                        <span class="quick-action-label">Record Waste</span>
                    </button>
                    <button class="quick-action" onclick="navigateTo('recipes')">
                        <span class="quick-action-icon">🍳</span>
                        <span class="quick-action-label">Create Recipe</span>
                    </button>
                    <button class="quick-action" onclick="navigateTo('suppliers')">
                        <span class="quick-action-icon">🚚</span>
                        <span class="quick-action-label">Add Supplier</span>
                    </button>
                    <button class="quick-action" onclick="navigateTo('reports')">
                        <span class="quick-action-icon">📈</span>
                        <span class="quick-action-label">View Reports</span>
                    </button>
                </div>
            </div>
        `;

        // Chart
        renderDashboardChart(chart);
    };

    function statCard(label, value, icon, trend, color) {
        let trendHtml = '';
        if (trend != null) {
            const up = trend > 0;
            const down = trend < 0;
            trendHtml = `
                <span class="stat-card-trend ${up ? 'up' : down ? 'down' : 'neutral'}">
                    ${up ? '▲' : down ? '▼' : '–'} ${Math.abs(trend).toFixed(1)}%
                </span>
            `;
        }
        return `
            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-label">${label}</span>
                    <div class="stat-card-icon" style="background:${color}1A;color:${color};">${icon}</div>
                </div>
                <div class="stat-card-value">${value}</div>
                ${trendHtml}
            </div>
        `;
    }

    function attentionItem(i) {
        const actions = {
            critical: 'Review Inventory',
            warning: 'Investigate',
            info: 'View'
        };
        return `
            <div class="attention-item ${i.type || 'info'}" onclick="openAIPanel(); window.aiAsk && window.aiAsk('${escapeHtml(i.title)}')">
                <div class="attention-icon">${i.icon}</div>
                <div class="attention-content">
                    <div class="attention-title">${escapeHtml(i.title)}</div>
                    <div class="attention-desc">${escapeHtml(i.text || '')}</div>
                    <div class="attention-action">${actions[i.type] || 'View'} →</div>
                </div>
            </div>
        `;
    }

    let dashChartInstance = null;

    function renderDashboardChart(series) {
        const canvas = document.getElementById('dashChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (dashChartInstance) dashChartInstance.destroy();

        const styles = getComputedStyle(document.documentElement);
        const accent = styles.getPropertyValue('--brand-amber').trim() || '#E8A93B';
        const textMuted = styles.getPropertyValue('--text-tertiary').trim() || '#9C8977';
        const border = styles.getPropertyValue('--border').trim() || 'rgba(0,0,0,0.08)';

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
        gradient.addColorStop(0, 'rgba(232, 169, 59, 0.35)');
        gradient.addColorStop(1, 'rgba(232, 169, 59, 0.02)');

        dashChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: series.map(s => s.date.slice(5)),
                datasets: [
                    {
                        label: 'Revenue',
                        data: series.map(s => s.revenue || 0),
                        borderColor: accent,
                        backgroundColor: gradient,
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: accent,
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2
                    },
                    {
                        label: 'Profit',
                        data: series.map(s => s.profit || 0),
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16,185,129,0.05)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: textMuted,
                            font: { size: 11, weight: '600' },
                            usePointStyle: true,
                            padding: 16,
                            boxWidth: 8,
                            boxHeight: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15,11,8,0.95)',
                        padding: 12,
                        borderColor: accent,
                        borderWidth: 1,
                        displayColors: false,
                        callbacks: {
                            label: ctx => ctx.dataset.label + ': ' + formatMoney(ctx.parsed.y)
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: textMuted, font: { size: 10 }, maxRotation: 0, autoSkipPadding: 16 },
                        grid: { color: border, drawBorder: false }
                    },
                    y: {
                        ticks: { color: textMuted, font: { size: 10 }, callback: v => formatMoney(v).replace(/\.00$/, '') },
                        grid: { color: border, drawBorder: false },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    window.setChartRange = async function (range) {
        state.chartRange = range;
        document.querySelectorAll('#chartRangeBtns button').forEach(b => {
            b.classList.toggle('active', b.dataset.range === range);
        });
        const chart = await api(`/dashboard/chart?range=${range}`);
        renderDashboardChart(chart.data);
    };

    // ═══════════════════════════════════════════════════════════════
    // SALES
    // ═══════════════════════════════════════════════════════════════
    Pages.sales = async function (container) {
        const [salesRes, itemsRes] = await Promise.allSettled([
            api('/sales?limit=100'),
            api('/inventory')
        ]);

        const sales = salesRes.status === 'fulfilled' ? salesRes.value.data : [];
        const items = itemsRes.status === 'fulfilled' ? itemsRes.value.data : [];

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-row">
                    <div>
                        <h1 class="page-title">Sales</h1>
                        <p class="page-subtitle">Record sales and track performance</p>
                    </div>
                    <button class="btn btn-primary" onclick="openSaleModal()">＋ New sale</button>
                </div>
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div>
                        <div class="content-card-title">Recent sales</div>
                        <div class="content-card-subtitle">${sales.length} record(s)</div>
                    </div>
                </div>
                ${sales.length ? `
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Revenue</th>
                                    <th>Profit</th>
                                    <th>Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sales.slice(0, 50).map(s => `
                                    <tr>
                                        <td>${formatDate(s.date)}</td>
                                        <td><strong>${escapeHtml(s.itemName || s.item || '—')}</strong></td>
                                        <td>${s.qty || 0}</td>
                                        <td>${formatMoney(s.revenue || 0)}</td>
                                        <td class="${(s.profit || 0) >= 0 ? 'profit-positive' : 'profit-negative'}">
                                            ${(s.profit || 0) >= 0 ? '+' : ''}${formatMoney(s.profit || 0)}
                                        </td>
                                        <td>${(s.margin || 0).toFixed(1)}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">💰</div>
                        <div class="empty-title">No sales recorded yet</div>
                        <div class="empty-desc">Record your first sale to start tracking revenue and profit.</div>
                        <button class="btn btn-primary" onclick="openSaleModal()">Record your first sale</button>
                    </div>
                `}
            </div>
        `;

        window.__salesItems = items;
    };

    window.openSaleModal = function () {
        const items = window.__salesItems || [];
        if (!items.length) {
            toast('No items yet', 'Add products to inventory first', 'warning');
            return navigateTo('inventory');
        }

        const root = document.getElementById('modalRoot');
        root.innerHTML = `
            <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('modalRoot').innerHTML=''">
                <div class="modal">
                    <div style="padding:24px;">
                        <h3 style="font-family:var(--font-display);font-size:1.35rem;margin-bottom:16px;">Record new sale</h3>
                        <div class="stack stack-4">
                            <div class="auth-field">
                                <label>Product</label>
                                <select class="select" id="saleItem">
                                    <option value="">Select a product…</option>
                                    ${items.map(i => `
                                        <option value="${i.id}" data-price="${i.price}" data-stock="${i.qty}">
                                            ${escapeHtml(i.icon)} ${escapeHtml(i.name)} — ${formatMoney(i.price)} (${i.qty} in stock)
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="auth-field">
                                <label>Quantity</label>
                                <input type="number" class="input" id="saleQty" value="1" min="1" step="1" />
                            </div>
                            <div class="auth-field">
                                <label>Discount (optional)</label>
                                <input type="number" class="input" id="saleDiscount" value="0" min="0" step="0.01" />
                            </div>
                        </div>
                        <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end;">
                            <button class="btn btn-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">Cancel</button>
                            <button class="btn btn-primary" onclick="confirmSale()">Record sale</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    window.confirmSale = async function () {
        const itemId = document.getElementById('saleItem').value;
        const qty = parseInt(document.getElementById('saleQty').value) || 1;
        const discount = parseFloat(document.getElementById('saleDiscount').value) || 0;

        if (!itemId) return toast('Please select a product', '', 'warning');

        try {
            await api('/sales', {
                method: 'POST',
                body: JSON.stringify({ item_id: itemId, qty, discount })
            });
            document.getElementById('modalRoot').innerHTML = '';
            toast('Sale recorded', qty + ' item(s) sold', 'success');
            navigateTo('sales');
        } catch (err) {
            toast('Could not record sale', err.message, 'error');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // INVENTORY
    // ═══════════════════════════════════════════════════════════════
    Pages.inventory = async function (container) {
        const res = await api('/inventory');
        const items = res.data || [];
        const summary = res.summary || {};

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-row">
                    <div>
                        <h1 class="page-title">Inventory</h1>
                        <p class="page-subtitle">${items.length} product(s) · ${formatMoney(summary.inventoryValue || 0)} in stock</p>
                    </div>
                    <button class="btn btn-primary" onclick="openAddItemModal()">＋ Add product</button>
                </div>
            </div>

            ${summary.lowStockCount > 0 ? `
                <div class="content-card" style="border-left:3px solid var(--danger);">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="font-size:24px;">⚠️</span>
                        <div>
                            <strong>${summary.lowStockCount} item(s) low on stock</strong>
                            <p class="body-sm" style="margin-top:4px;">Review and reorder soon.</p>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="content-card">
                ${items.length ? `
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Category</th>
                                    <th>Stock</th>
                                    <th>Cost</th>
                                    <th>Price</th>
                                    <th>Value</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(i => `
                                    <tr>
                                        <td>
                                            <div style="display:flex;align-items:center;gap:10px;">
                                                <span style="font-size:18px;">${i.icon || '📦'}</span>
                                                <strong>${escapeHtml(i.name)}</strong>
                                            </div>
                                        </td>
                                        <td>${escapeHtml(i.category || '—')}</td>
                                        <td>${i.qty || 0}</td>
                                        <td>${formatMoney(i.cost || 0)}</td>
                                        <td>${formatMoney(i.price || 0)}</td>
                                        <td>${formatMoney((i.cost || 0) * (i.qty || 0))}</td>
                                        <td>
                                            ${i.qty <= 0 ? '<span class="badge badge-danger">Out</span>' :
                                              i.isLowStock ? '<span class="badge badge-warning">Low</span>' :
                                              '<span class="badge badge-success">OK</span>'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <div class="empty-title">No products yet</div>
                        <div class="empty-desc">Add your first product to start tracking stock, sales and margins.</div>
                        <button class="btn btn-primary" onclick="openAddItemModal()">Add your first product</button>
                    </div>
                `}
            </div>
        `;
    };

    window.openAddItemModal = function () {
        const root = document.getElementById('modalRoot');
        root.innerHTML = `
            <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('modalRoot').innerHTML=''">
                <div class="modal">
                    <div style="padding:24px;">
                        <h3 style="font-family:var(--font-display);font-size:1.35rem;margin-bottom:16px;">Add new product</h3>
                        <div class="stack stack-4">
                            <div style="display:grid;grid-template-columns:80px 1fr;gap:12px;">
                                <div class="auth-field">
                                    <label>Icon</label>
                                    <input type="text" class="input" id="iIcon" value="📦" maxlength="2" style="text-align:center;font-size:20px;" />
                                </div>
                                <div class="auth-field">
                                    <label>Product name</label>
                                    <input type="text" class="input" id="iName" placeholder="Cappuccino" />
                                </div>
                            </div>
                            <div class="auth-field">
                                <label>Category</label>
                                <select class="select" id="iCategory">
                                    <option>Beverages</option>
                                    <option>Food</option>
                                    <option>Bakery</option>
                                    <option>Snacks</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                <div class="auth-field">
                                    <label>Cost price</label>
                                    <input type="number" class="input" id="iCost" placeholder="0.00" step="0.01" min="0" />
                                </div>
                                <div class="auth-field">
                                    <label>Selling price</label>
                                    <input type="number" class="input" id="iPrice" placeholder="0.00" step="0.01" min="0" />
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                <div class="auth-field">
                                    <label>Initial stock</label>
                                    <input type="number" class="input" id="iQty" placeholder="0" min="0" value="0" />
                                </div>
                                <div class="auth-field">
                                    <label>Low stock threshold</label>
                                    <input type="number" class="input" id="iThreshold" placeholder="5" min="1" value="5" />
                                </div>
                            </div>
                        </div>
                        <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end;">
                            <button class="btn btn-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">Cancel</button>
                            <button class="btn btn-primary" onclick="confirmAddItem()">Add product</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    window.confirmAddItem = async function () {
        const name = document.getElementById('iName').value.trim();
        const icon = document.getElementById('iIcon').value.trim() || '📦';
        const category = document.getElementById('iCategory').value;
        const cost = parseFloat(document.getElementById('iCost').value) || 0;
        const price = parseFloat(document.getElementById('iPrice').value) || 0;
        const qty = parseInt(document.getElementById('iQty').value) || 0;
        const threshold = parseInt(document.getElementById('iThreshold').value) || 5;

        if (!name) return toast('Name required', '', 'warning');
        if (cost < 0 || price < 0) return toast('Prices cannot be negative', '', 'warning');
        if (cost > price) return toast('Selling price must be ≥ cost', '', 'warning');

        try {
            await api('/inventory', {
                method: 'POST',
                body: JSON.stringify({
                    name, icon, category, cost, price, qty,
                    low_stock_threshold: threshold
                })
            });
            document.getElementById('modalRoot').innerHTML = '';
            toast('Product added', name, 'success');
            navigateTo('inventory');
        } catch (err) {
            if (err.upgrade) return toast('Premium required', 'Upgrade to add more products', 'warning');
            toast('Could not add product', err.message, 'error');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // RECIPES
    // ═══════════════════════════════════════════════════════════════
    Pages.recipes = async function (container) {
        const res = await api('/recipes');
        const recipes = res.data || [];

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-row">
                    <div>
                        <h1 class="page-title">Recipes</h1>
                        <p class="page-subtitle">${recipes.length} recipe(s) saved</p>
                    </div>
                    <button class="btn btn-primary" onclick="openAddRecipeModal()">＋ New recipe</button>
                </div>
            </div>

            <div class="content-card">
                ${recipes.length ? `
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
                        ${recipes.map(r => `
                            <div class="card card-hover" style="cursor:pointer;" onclick="viewRecipe('${r.id}')">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                                    <div>
                                        <strong style="font-size:15px;">${escapeHtml(r.name)}</strong>
                                        <div class="caption">${escapeHtml(r.category || 'Other')}</div>
                                    </div>
                                    <span class="badge badge-info">${(r.ingredients || []).length} items</span>
                                </div>
                                <div style="font-family:var(--font-display);font-size:1.35rem;font-weight:600;">
                                    ${formatMoney(r.sellingPrice || 0)}
                                </div>
                                <div class="caption" style="margin-top:4px;">Selling price</div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">🍳</div>
                        <div class="empty-title">No recipes yet</div>
                        <div class="empty-desc">Create recipes to track ingredient costs and calculate margins.</div>
                        <button class="btn btn-primary" onclick="openAddRecipeModal()">Create first recipe</button>
                    </div>
                `}
            </div>
        `;
    };

    window.openAddRecipeModal = function () {
        const root = document.getElementById('modalRoot');
        root.innerHTML = `
            <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('modalRoot').innerHTML=''">
                <div class="modal">
                    <div style="padding:24px;">
                        <h3 style="font-family:var(--font-display);font-size:1.35rem;margin-bottom:16px;">New recipe</h3>
                        <div class="stack stack-4">
                            <div class="auth-field">
                                <label>Recipe name</label>
                                <input type="text" class="input" id="rName" placeholder="Chocolate Cake" />
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                <div class="auth-field">
                                    <label>Category</label>
                                    <select class="select" id="rCategory">
                                        <option>Beverages</option>
                                        <option>Food</option>
                                        <option>Bakery</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div class="auth-field">
                                    <label>Selling price</label>
                                    <input type="number" class="input" id="rPrice" placeholder="0.00" step="0.01" min="0" />
                                </div>
                            </div>
                            <div class="auth-field">
                                <label>Yield (servings/units)</label>
                                <input type="number" class="input" id="rYield" value="1" min="1" />
                            </div>
                        </div>
                        <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end;">
                            <button class="btn btn-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">Cancel</button>
                            <button class="btn btn-primary" onclick="confirmAddRecipe()">Create recipe</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    window.confirmAddRecipe = async function () {
        const name = document.getElementById('rName').value.trim();
        const category = document.getElementById('rCategory').value;
        const sellingPrice = parseFloat(document.getElementById('rPrice').value) || 0;
        const yieldQty = parseInt(document.getElementById('rYield').value) || 1;

        if (!name) return toast('Name required', '', 'warning');

        try {
            await api('/recipes', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    category,
                    sellingPrice,
                    yieldQty,
                    ingredients: []
                })
            });
            document.getElementById('modalRoot').innerHTML = '';
            toast('Recipe created', name, 'success');
            navigateTo('recipes');
        } catch (err) {
            toast('Could not create recipe', err.message, 'error');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // WASTE
    // ═══════════════════════════════════════════════════════════════
    Pages.waste = async function (container) {
        const [wasteRes, sumRes] = await Promise.allSettled([
            api('/waste?days=30'),
            api('/waste/summary')
        ]);

        const waste = wasteRes.status === 'fulfilled' ? wasteRes.value.data : [];
        const summary = sumRes.status === 'fulfilled' ? sumRes.value.data : { total: 0, byItem: [] };

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-row">
                    <div>
                        <h1 class="page-title">Waste</h1>
                        <p class="page-subtitle">Track what's being thrown away and why</p>
                    </div>
                    <button class="btn btn-primary" onclick="openWasteModal()">＋ Record waste</button>
                </div>
            </div>

            <div class="stats-grid">
                ${statCard('30-day waste cost', formatMoney(summary.total || 0), '🗑️', null, 'var(--danger)')}
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div>
                        <div class="content-card-title">Waste log</div>
                        <div class="content-card-subtitle">${waste.length} record(s)</div>
                    </div>
                </div>
                ${waste.length ? `
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Item</th>
                                    <th>Quantity</th>
                                    <th>Cost</th>
                                    <th>Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${waste.slice(0, 50).map(w => `
                                    <tr>
                                        <td>${formatDate(w.date)}</td>
                                        <td><strong>${escapeHtml(w.itemName || w.item || '—')}</strong></td>
                                        <td>${w.qty || 0}</td>
                                        <td class="profit-negative">${formatMoney(w.cost || 0)}</td>
                                        <td><span class="badge badge-warning">${escapeHtml(w.reason || 'expired')}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">✨</div>
                        <div class="empty-title">No waste recorded</div>
                        <div class="empty-desc">That's excellent! Log waste when it happens to understand patterns.</div>
                        <button class="btn btn-primary" onclick="openWasteModal()">Record waste</button>
                    </div>
                `}
            </div>
        `;
    };

    window.openWasteModal = async function () {
        let items = [];
        try {
            const res = await api('/inventory');
            items = res.data || [];
        } catch {}

        const root = document.getElementById('modalRoot');
        root.innerHTML = `
            <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('modalRoot').innerHTML=''">
                <div class="modal">
                    <div style="padding:24px;">
                        <h3 style="font-family:var(--font-display);font-size:1.35rem;margin-bottom:16px;">Record waste</h3>
                        <div class="stack stack-4">
                            <div class="auth-field">
                                <label>Item</label>
                                <select class="select" id="wItem">
                                    <option value="">Select or type manually…</option>
                                    ${items.map(i => `<option value="${i.id}">${escapeHtml(i.icon)} ${escapeHtml(i.name)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="auth-field">
                                <label>Or item name (if not listed)</label>
                                <input type="text" class="input" id="wName" placeholder="e.g. Milk" />
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                <div class="auth-field">
                                    <label>Quantity</label>
                                    <input type="number" class="input" id="wQty" value="1" min="0.1" step="0.1" />
                                </div>
                                <div class="auth-field">
                                    <label>Reason</label>
                                    <select class="select" id="wReason">
                                        <option value="expired">Expired</option>
                                        <option value="damaged">Damaged</option>
                                        <option value="overproduction">Overproduction</option>
                                        <option value="customer-return">Customer return</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end;">
                            <button class="btn btn-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">Cancel</button>
                            <button class="btn btn-primary" onclick="confirmWaste()">Record waste</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    window.confirmWaste = async function () {
        const itemId = document.getElementById('wItem').value;
        const name = document.getElementById('wName').value.trim();
        const qty = parseFloat(document.getElementById('wQty').value) || 1;
        const reason = document.getElementById('wReason').value;

        if (!itemId && !name) return toast('Select or enter an item', '', 'warning');

        try {
            const body = { qty, reason };
            if (itemId) body.item_id = itemId;
            else body.item = name;

            await api('/waste', { method: 'POST', body: JSON.stringify(body) });
            document.getElementById('modalRoot').innerHTML = '';
            toast('Waste recorded', qty + ' unit(s)', 'success');
            navigateTo('waste');
        } catch (err) {
            toast('Could not record waste', err.message, 'error');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // SUPPLIERS
    // ═══════════════════════════════════════════════════════════════
    Pages.suppliers = async function (container) {
        const res = await api('/suppliers');
        const suppliers = res.data || [];

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-row">
                    <div>
                        <h1 class="page-title">Suppliers</h1>
                        <p class="page-subtitle">${suppliers.length} supplier(s)</p>
                    </div>
                    <button class="btn btn-primary" onclick="openAddSupplierModal()">＋ Add supplier</button>
                </div>
            </div>

            <div class="content-card">
                ${suppliers.length ? `
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Contact</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${suppliers.map(s => `
                                    <tr>
                                        <td><strong>${escapeHtml(s.name)}</strong></td>
                                        <td>${escapeHtml(s.contact || '—')}</td>
                                        <td>${escapeHtml(s.email || '—')}</td>
                                        <td>${escapeHtml(s.phone || '—')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">🚚</div>
                        <div class="empty-title">No suppliers yet</div>
                        <div class="empty-desc">Add your suppliers to track invoices and outstanding balances.</div>
                        <button class="btn btn-primary" onclick="openAddSupplierModal()">Add your first supplier</button>
                    </div>
                `}
            </div>
        `;
    };

    window.openAddSupplierModal = function () {
        const root = document.getElementById('modalRoot');
        root.innerHTML = `
            <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('modalRoot').innerHTML=''">
                <div class="modal">
                    <div style="padding:24px;">
                        <h3 style="font-family:var(--font-display);font-size:1.35rem;margin-bottom:16px;">Add supplier</h3>
                        <div class="stack stack-4">
                            <div class="auth-field">
                                <label>Supplier name</label>
                                <input type="text" class="input" id="sName" placeholder="ABC Coffee Roasters" />
                            </div>
                            <div class="auth-field">
                                <label>Contact person</label>
                                <input type="text" class="input" id="sContact" placeholder="Jane Smith" />
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                <div class="auth-field">
                                    <label>Email</label>
                                    <input type="email" class="input" id="sEmail" placeholder="jane@abc.com" />
                                </div>
                                <div class="auth-field">
                                    <label>Phone</label>
                                    <input type="tel" class="input" id="sPhone" placeholder="+27 11 123 4567" />
                                </div>
                            </div>
                        </div>
                        <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end;">
                            <button class="btn btn-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">Cancel</button>
                            <button class="btn btn-primary" onclick="confirmAddSupplier()">Add supplier</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    window.confirmAddSupplier = async function () {
        const name = document.getElementById('sName').value.trim();
        const contact = document.getElementById('sContact').value.trim();
        const email = document.getElementById('sEmail').value.trim();
        const phone = document.getElementById('sPhone').value.trim();

        if (!name) return toast('Name required', '', 'warning');

        try {
            await api('/suppliers', {
                method: 'POST',
                body: JSON.stringify({ name, contact, email, phone })
            });
            document.getElementById('modalRoot').innerHTML = '';
            toast('Supplier added', name, 'success');
            navigateTo('suppliers');
        } catch (err) {
            toast('Could not add supplier', err.message, 'error');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // REPORTS
    // ═══════════════════════════════════════════════════════════════
    Pages.reports = async function (container) {
        const res = await api('/reports/analytics');
        const a = res.data || {};

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-row">
                    <div>
                        <h1 class="page-title">Reports</h1>
                        <p class="page-subtitle">Last 30 days · ${formatDate(new Date(Date.now() - 30 * 86400000))} to ${formatDate(new Date())}</p>
                    </div>
                    <button class="btn btn-secondary" onclick="exportCSV()">📥 Export CSV</button>
                </div>
            </div>

            <div class="stats-grid">
                ${statCard('Revenue', formatMoney(a.revenue || 0), '💰', null, 'var(--brand-amber)')}
                ${statCard('Profit', formatMoney(a.profit || 0), '📈', null, 'var(--success)')}
                ${statCard('Items sold', formatNumber(a.itemsSold || 0), '📦', null, 'var(--info)')}
                ${statCard('Avg margin', (a.avgMargin || 0).toFixed(1) + '%', '📊', null, 'var(--brand-rose)')}
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div class="content-card-title">🏆 Top selling products</div>
                </div>
                ${(a.topItems || []).length ? `
                    ${a.topItems.map((i, idx) => `
                        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
                            <span style="font-size:20px;width:32px;text-align:center;">${['🥇','🥈','🥉','4️⃣','5️⃣'][idx] || '•'}</span>
                            <div style="flex:1;">
                                <strong>${escapeHtml(i.name)}</strong>
                                <div class="caption">${i.units} sold</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:600;">${formatMoney(i.revenue)}</div>
                                <div class="caption" style="color:var(--success);">+${formatMoney(i.profit)}</div>
                            </div>
                        </div>
                    `).join('')}
                ` : '<div class="empty-state" style="padding:32px;"><div class="empty-icon">📊</div><div class="empty-title">No sales data</div></div>'}
            </div>
        `;
    };

    window.exportCSV = async function () {
        const token = localStorage.getItem('cafecash_token');
        const url = (location.hostname === 'localhost' ? 'http://localhost:8080/api' : '/api') + '/reports/export/sales.csv';
        try {
            const res = await fetch(url, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `cafecash-sales-${Date.now()}.csv`;
            link.click();
            toast('Export started', 'Your CSV is downloading', 'success');
        } catch (err) {
            toast('Export failed', err.message, 'error');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // INTELLIGENCE
    // ═══════════════════════════════════════════════════════════════
    Pages.intelligence = async function (container) {
        const insRes = await api('/ai/insights').catch(() => ({ data: [], forecast: [] }));
        const insights = insRes.data || [];
        const forecast = insRes.forecast || [];

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-row">
                    <div>
                        <h1 class="page-title">Intelligence</h1>
                        <p class="page-subtitle">What's happening, what matters, what to do</p>
                    </div>
                    <button class="btn btn-primary" onclick="openAIPanel()">🤖 Ask CafeCash</button>
                </div>
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div>
                        <div class="content-card-title">💡 Today's insights</div>
                        <div class="content-card-subtitle">Generated from your real business data</div>
                    </div>
                </div>
                ${insights.length ? `
                    <div class="attention-list">
                        ${insights.map(i => `
                            <div class="attention-item ${i.type || 'info'}" onclick="openAIPanel(); window.aiAsk && window.aiAsk('${escapeHtml(i.title)}')">
                                <div class="attention-icon">${i.icon}</div>
                                <div class="attention-content">
                                    <div class="attention-title">${escapeHtml(i.title)}</div>
                                    <div class="attention-desc">${escapeHtml(i.text || '')}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="empty-state" style="padding:32px;">
                        <div class="empty-icon">✨</div>
                        <div class="empty-title">No insights yet</div>
                        <div class="empty-desc">Record sales and stock data to unlock business insights.</div>
                    </div>
                `}
            </div>

            ${forecast.length ? `
                <div class="content-card">
                    <div class="content-card-header">
                        <div class="content-card-title">📦 Stock forecast</div>
                        <div class="content-card-subtitle">Predicted stock depletion</div>
                    </div>
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Current stock</th>
                                    <th>Daily usage</th>
                                    <th>Days left</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${forecast.map(f => `
                                    <tr>
                                        <td><strong>${escapeHtml(f.name)}</strong></td>
                                        <td>${f.qty}</td>
                                        <td>~${f.dailyUse}/day</td>
                                        <td>${f.daysLeft == null ? '—' : f.daysLeft + 'd'}</td>
                                        <td>
                                            ${f.status === 'critical' ? '<span class="badge badge-danger">Critical</span>' :
                                              f.status === 'warning' ? '<span class="badge badge-warning">Low</span>' :
                                              f.status === 'out' ? '<span class="badge badge-danger">Out</span>' :
                                              '<span class="badge badge-success">OK</span>'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        `;
    };

    // ═══════════════════════════════════════════════════════════════
    // SMART CONTROL PAGE
    // ═══════════════════════════════════════════════════════════════
    Pages.smart = async function (container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Smart Control</h1>
                    <p class="page-subtitle">Everything you need, one shortcut away</p>
                </div>
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div class="content-card-title">⚡ Quick actions</div>
                </div>
                <div class="quick-actions" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));">
                    <button class="quick-action" onclick="openSmartControl()">
                        <span class="quick-action-icon">🔍</span>
                        <span class="quick-action-label">Open command palette</span>
                    </button>
                    <button class="quick-action" onclick="navigateTo('sales');setTimeout(openSaleModal,300)">
                        <span class="quick-action-icon">💰</span>
                        <span class="quick-action-label">Add Sale</span>
                    </button>
                    <button class="quick-action" onclick="navigateTo('inventory');setTimeout(openAddItemModal,300)">
                        <span class="quick-action-icon">📦</span>
                        <span class="quick-action-label">Add Stock</span>
                    </button>
                    <button class="quick-action" onclick="navigateTo('waste');setTimeout(openWasteModal,300)">
                        <span class="quick-action-icon">🗑️</span>
                        <span class="quick-action-label">Record Waste</span>
                    </button>
                    <button class="quick-action" onclick="navigateTo('recipes');setTimeout(openAddRecipeModal,300)">
                        <span class="quick-action-icon">🍳</span>
                        <span class="quick-action-label">Create Recipe</span>
                    </button>
                    <button class="quick-action" onclick="openAIPanel()">
                        <span class="quick-action-icon">🤖</span>
                        <span class="quick-action-label">Ask CafeCash</span>
                    </button>
                </div>
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div class="content-card-title">⌨️ Keyboard shortcuts</div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
                    ${[
                        ['⌘ K', 'Open command palette'],
                        ['⌘ /', 'Open Smart Control'],
                        ['⌘ \\', 'Toggle sidebar'],
                        ['Ctrl + 1-8', 'Navigate between pages'],
                        ['⌘ ⇧ A', 'Accessibility Center'],
                        ['⌘ ⇧ T', 'Cycle theme'],
                        ['ESC', 'Close any panel']
                    ].map(([k, label]) => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-sunken);border-radius:var(--r-md);">
                            <span style="font-size:13px;color:var(--text-secondary);">${label}</span>
                            <kbd class="sc-palette-shortcut">${k}</kbd>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    // ═══════════════════════════════════════════════════════════════
    // ACCESSIBILITY
    // ═══════════════════════════════════════════════════════════════
    Pages.accessibility = async function (container) {
        const s = window.CafeCashA11y.settings;

        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Accessibility</h1>
                    <p class="page-subtitle">Make CafeCash work the way you need it to</p>
                </div>
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div class="content-card-title">🎨 Theme</div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
                    ${[
                        { id: 'auto', label: 'Auto', icon: '🌗' },
                        { id: 'light', label: 'Light', icon: '☀️' },
                        { id: 'dark', label: 'Dark', icon: '🌙' },
                        { id: 'cafe', label: 'Café', icon: '☕' }
                    ].map(t => `
                        <button class="quick-action" onclick="setThemeSetting('${t.id}')" style="${s.theme === t.id ? 'border-color:var(--brand-amber);background:rgba(232,169,59,0.08);' : ''}">
                            <span class="quick-action-icon">${t.icon}</span>
                            <span class="quick-action-label">${t.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div class="content-card-title">📏 Text size</div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
                    ${[
                        { id: 'normal', label: 'Normal', size: '15px' },
                        { id: 'large', label: 'Large', size: '18px' },
                        { id: 'xlarge', label: 'Extra large', size: '21px' }
                    ].map(t => `
                        <button class="quick-action" onclick="setTextSizeSetting('${t.id}')" style="${s.textSize === t.id ? 'border-color:var(--brand-amber);background:rgba(232,169,59,0.08);' : ''}">
                            <span class="quick-action-label" style="font-size:${t.size};">Aa</span>
                            <span class="quick-action-label">${t.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div class="content-card-title">♿ Additional options</div>
                </div>
                <div class="stack stack-2">
                    ${toggleRow('High contrast', 'highContrast', 'Increase contrast for better visibility')}
                    ${toggleRow('Reduced motion', 'reducedMotion', 'Minimize animations throughout the app')}
                    ${toggleRow('Dyslexia-friendly font', 'dyslexicFont', 'Use a font designed for easier reading')}
                    ${toggleRow('Large touch targets', 'largeTargets', 'Enlarge buttons and inputs for touch')}
                </div>
            </div>

            <div class="content-card">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <strong>Reset all accessibility settings</strong>
                        <p class="body-sm" style="margin-top:4px;">Restore CafeCash to default appearance</p>
                    </div>
                    <button class="btn btn-secondary" onclick="resetA11y()">Reset</button>
                </div>
            </div>
        `;
    };

    function toggleRow(label, key, desc) {
        const on = window.CafeCashA11y.settings[key];
        return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--bg-sunken);border-radius:var(--r-md);cursor:pointer;" onclick="toggleA11y('${key}')">
                <div>
                    <div style="font-weight:600;font-size:14px;">${label}</div>
                    <div class="caption" style="margin-top:2px;">${desc}</div>
                </div>
                <div class="ln-access-toggle ${on ? 'on' : ''}" style="flex-shrink:0;"></div>
            </div>
        `;
    }

    window.setThemeSetting = function (theme) {
        window.CafeCashA11y.set('theme', theme);
        navigateTo('accessibility');
    };

    window.setTextSizeSetting = function (size) {
        window.CafeCashA11y.set('textSize', size);
        navigateTo('accessibility');
    };

    window.toggleA11y = function (key) {
        window.CafeCashA11y.toggle(key);
        navigateTo('accessibility');
    };

    window.resetA11y = function () {
        window.CafeCashA11y.reset();
        navigateTo('accessibility');
        toast('Accessibility reset', '', 'success');
    };

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════
    Pages.settings = async function (container) {
        const u = state.user;
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Settings</h1>
                    <p class="page-subtitle">Manage your account and preferences</p>
                </div>
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div class="content-card-title">👤 Profile</div>
                </div>
                <div style="display:flex;align-items:center;gap:16px;padding:16px 0;">
                    <div class="app-user-avatar" style="width:64px;height:64px;font-size:24px;">${(u?.name || 'U')[0].toUpperCase()}</div>
                    <div>
                        <div style="font-weight:600;font-size:16px;">${escapeHtml(u?.name || 'User')}</div>
                        <div class="caption">${escapeHtml(u?.email || '')}</div>
                    </div>
                </div>
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div class="content-card-title">⭐ Subscription</div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:var(--bg-sunken);border-radius:var(--r-md);">
                    <div>
                        <div style="font-weight:600;font-size:15px;">${u?.plan === 'premium' ? '👑 Premium Plan' : '⭐ Basic Plan'}</div>
                        <div class="caption" style="margin-top:4px;">${u?.plan === 'premium' ? 'All features unlocked' : 'Manage your café with core features'}</div>
                    </div>
                    ${u?.plan !== 'premium' ? `
                        <button class="btn btn-amber" onclick="openUpgradeModal()">Upgrade</button>
                    ` : ''}
                </div>
            </div>

            <div class="content-card">
                <div class="content-card-header">
                    <div class="content-card-title">🔒 Security</div>
                </div>
                <button class="sc-palette-item" onclick="changePassword()" style="width:100%;text-align:left;">
                    <span class="sc-palette-icon-sm">🔑</span>
                    <span class="sc-palette-title">Change password</span>
                </button>
                <button class="sc-palette-item" onclick="viewActivity()" style="width:100%;text-align:left;">
                    <span class="sc-palette-icon-sm">📋</span>
                    <span class="sc-palette-title">Activity log</span>
                </button>
            </div>

            <div class="content-card">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <strong style="color:var(--danger);">Sign out</strong>
                        <p class="body-sm" style="margin-top:4px;">Sign out of CafeCash on this device</p>
                    </div>
                    <button class="btn btn-danger" onclick="signOut()">Sign out</button>
                </div>
            </div>
        `;
    };

    window.changePassword = async function () {
        const current = prompt('Current password:');
        if (!current) return;
        const newPw = prompt('New password (min 6 characters):');
        if (!newPw || newPw.length < 6) return toast('Password too short', '', 'warning');

        try {
            if (window.firebase?.auth) {
                const user = firebase.auth().currentUser;
                const cred = firebase.auth.EmailAuthProvider.credential(user.email, current);
                await user.reauthenticateWithCredential(cred);
                await user.updatePassword(newPw);
                toast('Password updated', '', 'success');
            }
        } catch (err) {
            toast('Could not update password', err.message, 'error');
        }
    };

    window.viewActivity = async function () {
        try {
            const res = await api('/users/activity');
            const items = res.data || [];
            alert(items.length
                ? items.slice(0, 20).map(i => `• ${timeAgo(i.createdAt)} — ${i.action}`).join('\n')
                : 'No activity yet.');
        } catch (err) {
            toast('Could not load activity', err.message, 'error');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════
    window.CafeCashPages = {
        async render(page, container) {
            const fn = Pages[page] || Pages.dashboard;
            await fn(container);
        }
    };

    console.log('✅ CafeCash pages ready');
})();
