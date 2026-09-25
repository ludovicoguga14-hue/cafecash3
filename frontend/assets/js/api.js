/**
 * CafeCash API Client
 * Central place for auth, requests, and state.
 */

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:8080/api'
    : '/api';

window.CafeCash = window.CafeCash || {};

CafeCash.state = {
    user: null,
    cafe: null,
    universities: [],
    cafes: [],
    items: [],
    sales: [],
    expenses: null,
    analytics: null,
    dashboard: null,
    chartRange: '15d'
};

CafeCash.api = async function (path, options = {}) {
    const token = localStorage.getItem('cafecash_token');
    if (!token) {
        location.href = 'login.html';
        throw new Error('No auth token');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    };

    // Active café context
    if (CafeCash.state.cafe?.id) headers['X-Cafe-Id'] = CafeCash.state.cafe.id;
    if (CafeCash.state.university?.id) headers['X-University-Id'] = CafeCash.state.university.id;

    const res = await fetch(API_BASE + path, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) }
    });

    if (res.status === 401) {
        localStorage.removeItem('cafecash_token');
        sessionStorage.removeItem('cafecash_user');
        location.href = 'login.html';
        throw new Error('Session expired');
    }

    let data;
    try { data = await res.json(); }
    catch { throw new Error(`HTTP ${res.status}`); }

    if (!res.ok || data.success === false) {
        const err = new Error(data.error || `HTTP ${res.status}`);
        err.upgrade = data.upgrade;
        err.status = res.status;
        throw err;
    }
    return data;
};

CafeCash.toast = function (title, message = '', type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Close">✕</button>
    `;

    const close = () => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 200);
    };

    toast.querySelector('.toast-close').onclick = close;
    container.appendChild(toast);

    setTimeout(close, duration);
};

CafeCash.confirm = function (title, message, confirmLabel = 'Confirm', danger = false) {
    return new Promise((resolve) => {
        const root = document.getElementById('modalRoot');
        root.innerHTML = `
            <div class="modal-overlay">
                <div class="modal">
                    <div style="padding:24px;">
                        <h3 style="font-family:var(--font-display);font-size:1.35rem;margin-bottom:8px;">${escapeHtml(title)}</h3>
                        <p style="color:var(--text-secondary);line-height:1.55;font-size:14px;">${escapeHtml(message)}</p>
                        <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end;">
                            <button class="btn btn-secondary" id="modalCancel">Cancel</button>
                            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modalConfirm">${escapeHtml(confirmLabel)}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        const cleanup = (val) => { root.innerHTML = ''; resolve(val); };
        document.getElementById('modalCancel').onclick = () => cleanup(false);
        document.getElementById('modalConfirm').onclick = () => cleanup(true);
        root.querySelector('.modal-overlay').onclick = (e) => {
            if (e.target.classList.contains('modal-overlay')) cleanup(false);
        };
    });
};

CafeCash.loadUser = async function () {
    const me = await CafeCash.api('/auth/me');
    CafeCash.state.user = me.data;
    sessionStorage.setItem('cafecash_user', JSON.stringify(me.data));
    return me.data;
};

CafeCash.loadCafes = async function () {
    const res = await CafeCash.api('/cafes');
    CafeCash.state.cafes = res.data || [];
    CafeCash.state.cafe = CafeCash.state.cafes.find(c => c.isActive === 1)
        || CafeCash.state.cafes[0]
        || null;
    return CafeCash.state.cafes;
};

function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

CafeCash.escapeHtml = escapeHtml;

CafeCash.formatMoney = function (value, currency) {
    const cur = currency || CafeCash.state.cafe?.currency || 'ZAR';
    const sym = cur === 'ZAR' ? 'R' : cur === 'USD' ? '$' : cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : 'R';
    const n = Number(value) || 0;
    return sym + ' ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

CafeCash.formatNumber = function (value) {
    return Number(value || 0).toLocaleString('en-ZA');
};

CafeCash.formatDate = function (date) {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
};

CafeCash.timeAgo = function (date) {
    if (!date) return '';
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return CafeCash.formatDate(date);
};

console.log('✅ CafeCash API client ready');
