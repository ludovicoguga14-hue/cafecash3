/**
 * CafeCash Dashboard Core
 */

(function () {
    'use strict';

    const { api, toast, loadUser, loadCafes, state } = window.CafeCash;

    // ═══════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════
    async function init() {
        if (!localStorage.getItem('cafecash_token')) {
            location.href = 'login.html';
            return;
        }

        try {
            await loadUser();
            await loadCafes();
            renderUser();
            renderCafes();
            renderSidebar();

            // Handle hash route
            const page = (location.hash || '#dashboard').slice(1);
            navigateTo(page);
        } catch (err) {
            console.error('Init error:', err);
            if (err.message === 'Session expired') return;
            toast('Could not load dashboard', err.message, 'error');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDER USER
    // ═══════════════════════════════════════════════════════════════
    function renderUser() {
        const u = state.user;
        if (!u) return;

        document.getElementById('userName').textContent = u.name || 'User';
        document.getElementById('userAvatar').textContent = (u.name || 'U')[0].toUpperCase();
        document.getElementById('userCafe').textContent = state.cafe?.name || '—';

        const planName = u.plan === 'premium' ? 'Premium' : 'Basic Plan';
        const planHint = u.plan === 'premium' ? 'All features unlocked' : 'Upgrade for more';
        document.getElementById('planName').textContent = planName;
        document.getElementById('planHint').textContent = planHint;
        document.getElementById('planIcon').textContent = u.plan === 'premium' ? '👑' : '⭐';
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDER CAFES
    // ═══════════════════════════════════════════════════════════════
    function renderCafes() {
        const list = document.getElementById('cafeBarList');
        if (!list) return;

        if (!state.cafes.length) {
            list.innerHTML = '<span style="color:var(--text-tertiary);font-size:13px;">No cafés yet</span>';
            return;
        }

        list.innerHTML = state.cafes.map(c => `
            <button class="app-cafe-pill ${c.id === state.cafe?.id ? 'active' : ''}"
                    onclick="switchCafe('${c.id}')">
                <span class="app-cafe-pill-icon">${c.icon || '🏪'}</span>
                <span>${escapeHtml(c.name)}</span>
            </button>
        `).join('');
    }

    // ═══════════════════════════════════════════════════════════════
    // SIDEBAR NAV
    // ═══════════════════════════════════════════════════════════════
    function renderSidebar() {
        document.querySelectorAll('.app-nav-item').forEach(item => {
            item.onclick = (e) => {
                e.preventDefault();
                navigateTo(item.dataset.page);
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════
    window.navigateTo = async function (page) {
        location.hash = '#' + page;

        document.querySelectorAll('.app-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        const content = document.getElementById('appContent');
        content.innerHTML = renderPageSkeleton();

        try {
            await window.CafeCashPages.render(page, content);
        } catch (err) {
            console.error(`Failed to render ${page}:`, err);
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <div class="empty-title">Could not load ${escapeHtml(page)}</div>
                    <div class="empty-desc">${escapeHtml(err.message)}</div>
                    <button class="btn btn-primary" onclick="navigateTo('${page}')">Retry</button>
                </div>
            `;
        }

        // Close sidebar on mobile
        document.getElementById('appSidebar').classList.remove('open');
    };

    function renderPageSkeleton() {
        return `
            <div class="page-header">
                <div class="skeleton" style="height:36px;width:240px;margin-bottom:8px;"></div>
                <div class="skeleton" style="height:16px;width:320px;"></div>
            </div>
            <div class="stats-grid">
                ${[1,2,3,4].map(() => `
                    <div class="stat-card">
                        <div class="skeleton" style="height:14px;width:60%;margin-bottom:12px;"></div>
                        <div class="skeleton" style="height:32px;width:70%;margin-bottom:8px;"></div>
                        <div class="skeleton" style="height:14px;width:40%;"></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // CAFÉ SWITCH
    // ═══════════════════════════════════════════════════════════════
    window.switchCafe = async function (cafeId) {
        if (state.cafe?.id === cafeId) return;

        const cafe = state.cafes.find(c => c.id === cafeId);
        if (!cafe) return;

        try {
            await api(`/cafes/${cafeId}/switch`, { method: 'POST' });
            state.cafe = cafe;
            state.cafes.forEach(c => c.isActive = c.id === cafeId ? 1 : 0);
            renderUser();
            renderCafes();
            // Re-render current page with new café data
            const page = (location.hash || '#dashboard').slice(1);
            navigateTo(page);
            toast('Switched workspace', `Now viewing ${cafe.name}`, 'success');
        } catch (err) {
            toast('Could not switch café', err.message, 'error');
        }
    };

    window.openAddCafe = async function () {
        if (state.user?.plan !== 'premium') {
            return openUpgradeModal();
        }

        const root = document.getElementById('modalRoot');
        root.innerHTML = `
            <div class="modal-overlay">
                <div class="modal">
                    <div style="padding:24px;">
                        <h3 style="font-family:var(--font-display);font-size:1.35rem;margin-bottom:16px;">Add a new café</h3>
                        <div class="stack stack-4">
                            <div class="auth-field">
                                <label>Café name</label>
                                <input type="text" class="input" id="newCafeName" placeholder="Main Street Café" />
                            </div>
                            <div class="auth-field">
                                <label>Icon (emoji)</label>
                                <input type="text" class="input" id="newCafeIcon" value="☕" maxlength="2" />
                            </div>
                            <div class="auth-field">
                                <label>Type</label>
                                <select class="select" id="newCafeType">
                                    <option value="café">Café</option>
                                    <option value="bakery">Bakery</option>
                                    <option value="restaurant">Restaurant</option>
                                    <option value="food_truck">Food Truck</option>
                                    <option value="cafeteria">Cafeteria</option>
                                </select>
                            </div>
                        </div>
                        <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end;">
                            <button class="btn btn-secondary" onclick="document.getElementById('modalRoot').innerHTML=''">Cancel</button>
                            <button class="btn btn-primary" onclick="confirmAddCafe()">Create café</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    window.confirmAddCafe = async function () {
        const name = document.getElementById('newCafeName').value.trim();
        const icon = document.getElementById('newCafeIcon').value.trim() || '☕';
        const type = document.getElementById('newCafeType').value;

        if (!name) return toast('Name required', '', 'warning');

        try {
            await api('/cafes', {
                method: 'POST',
                body: JSON.stringify({ name, icon, type })
            });
            document.getElementById('modalRoot').innerHTML = '';
            await loadCafes();
            renderCafes();
            toast('Café created', name + ' is ready', 'success');
        } catch (err) {
            if (err.upgrade) {
                document.getElementById('modalRoot').innerHTML = '';
                return openUpgradeModal();
            }
            toast('Could not create café', err.message, 'error');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // THEME
    // ═══════════════════════════════════════════════════════════════
    window.toggleTheme = function () {
        const current = window.CafeCashA11y.get('theme') || 'auto';
        const next = current === 'auto' ? 'dark' : current === 'dark' ? 'cafe' : current === 'cafe' ? 'light' : 'auto';
        window.CafeCashA11y.set('theme', next);
        const icons = { auto: '🌙', light: '☀️', dark: '🌙', cafe: '☕' };
        document.getElementById('themeToggle').textContent = icons[next] || '🌙';
        toast('Theme changed', next.charAt(0).toUpperCase() + next.slice(1), 'info', 2000);
    };

    // ═══════════════════════════════════════════════════════════════
    // SIDEBAR TOGGLE
    // ═══════════════════════════════════════════════════════════════
    window.toggleSidebar = function () {
        document.getElementById('appSidebar').classList.toggle('open');
    };

    // ═══════════════════════════════════════════════════════════════
    // UPGRADE
    // ═══════════════════════════════════════════════════════════════
    window.openUpgradeModal = function () {
        const root = document.getElementById('modalRoot');
        root.innerHTML = `
            <div class="modal-overlay">
                <div class="modal" style="max-width:520px;">
                    <div style="padding:32px;text-align:center;">
                        <div style="font-size:56px;margin-bottom:16px;">👑</div>
                        <h2 style="font-family:var(--font-display);font-size:1.75rem;margin-bottom:8px;">Upgrade to Premium</h2>
                        <p style="color:var(--text-secondary);margin-bottom:24px;">Understand your café, not just manage it.</p>
                        <ul style="text-align:left;display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
                            ${[
                                'Full Intelligence assistant',
                                'Stock forecasting',
                                'Multi-café workspace',
                                'Advanced reports',
                                'Priority support'
                            ].map(f => `
                                <li style="display:flex;align-items:center;gap:12px;font-size:14px;">
                                    <span style="width:22px;height:22px;background:var(--success-soft);color:var(--success);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;">✓</span>
                                    ${f}
                                </li>
                            `).join('')}
                        </ul>
                        <div style="display:flex;gap:10px;">
                            <button class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('modalRoot').innerHTML=''">Later</button>
                            <button class="btn btn-amber" style="flex:1;" onclick="doUpgrade()">Upgrade — R299/mo</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    window.doUpgrade = async function () {
        try {
            const res = await api('/billing/upgrade', { method: 'POST' });
            state.user = res.data;
            sessionStorage.setItem('cafecash_user', JSON.stringify(res.data));
            renderUser();
            document.getElementById('modalRoot').innerHTML = '';
            toast('Welcome to Premium 👑', 'All features are now unlocked', 'success');
            const page = (location.hash || '#dashboard').slice(1);
            navigateTo(page);
        } catch (err) {
            toast('Upgrade failed', err.message, 'error');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════
    window.openNotifications = function () {
        toast('Notifications', 'You have no new notifications', 'info', 3000);
    };

    window.openUserMenu = function () {
        const root = document.getElementById('modalRoot');
        root.innerHTML = `
            <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('modalRoot').innerHTML=''">
                <div class="modal" style="max-width:340px;margin-left:auto;margin-top:60px;margin-right:24px;">
                    <div style="padding:20px;">
                        <div style="display:flex;align-items:center;gap:12px;padding-bottom:16px;border-bottom:1px solid var(--border);margin-bottom:16px;">
                            <div class="app-user-avatar" style="width:48px;height:48px;font-size:18px;">${(state.user?.name || 'U')[0].toUpperCase()}</div>
                            <div>
                                <div style="font-weight:600;">${escapeHtml(state.user?.name || 'User')}</div>
                                <div style="font-size:12px;color:var(--text-tertiary);">${escapeHtml(state.user?.email || '')}</div>
                            </div>
                        </div>
                        <button class="sc-palette-item" onclick="navigateTo('settings');document.getElementById('modalRoot').innerHTML=''" style="width:100%;text-align:left;">
                            <span class="sc-palette-icon-sm">⚙️</span>
                            <span class="sc-palette-title">Settings</span>
                        </button>
                        <button class="sc-palette-item" onclick="navigateTo('accessibility');document.getElementById('modalRoot').innerHTML=''" style="width:100%;text-align:left;">
                            <span class="sc-palette-icon-sm">♿</span>
                            <span class="sc-palette-title">Accessibility</span>
                        </button>
                        <button class="sc-palette-item" onclick="signOut()" style="width:100%;text-align:left;color:var(--danger);">
                            <span class="sc-palette-icon-sm">🚪</span>
                            <span class="sc-palette-title">Sign out</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    };

    window.signOut = function () {
        localStorage.removeItem('cafecash_token');
        sessionStorage.removeItem('cafecash_user');
        if (window.firebase?.auth) firebase.auth().signOut();
        location.href = 'landing.html';
    };

    // ═══════════════════════════════════════════════════════════════
    // GLOBAL SEARCH
    // ═══════════════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', () => {
        const search = document.getElementById('globalSearch');
        if (search) {
            search.addEventListener('focus', () => {
                openSmartControl();
                search.blur();
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // ROUTE ON HASH CHANGE
    // ═══════════════════════════════════════════════════════════════
    window.addEventListener('hashchange', () => {
        const page = (location.hash || '#dashboard').slice(1);
        navigateTo(page);
    });

    // ═══════════════════════════════════════════════════════════════
    // BOOT
    // ═══════════════════════════════════════════════════════════════
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
