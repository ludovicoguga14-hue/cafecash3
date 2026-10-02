/**
 * CafeCash API client
 */
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:8080/api'
    : 'https://cafecash3-backend-3.onrender.com/api';

window.CafeCash = window.CafeCash || {};
CafeCash.state = { user: null, cafe: null };

CafeCash.api = async function (path, options = {}) {
    const token = localStorage.getItem('cafecash_token');
    if (!token) {
        window.location.href = 'login.html';
        throw new Error('No auth token');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    };

    if (CafeCash.state.cafe?.id) headers['X-Cafe-Id'] = CafeCash.state.cafe.id;

    const res = await fetch(API_BASE + path, { ...options, headers: { ...headers, ...(options.headers || {}) } });

    if (res.status === 401) {
        localStorage.removeItem('cafecash_token');
        sessionStorage.removeItem('cafecash_user');
        window.location.href = 'login.html';
        throw new Error('Session expired');
    }

    let data;
    try { data = await res.json(); }
    catch { throw new Error('HTTP ' + res.status); }

    if (!res.ok || data.success === false) {
        const err = new Error(data.error || 'HTTP ' + res.status);
        err.upgrade = data.upgrade;
        throw err;
    }
    return data;
};

CafeCash.formatMoney = function (value) {
    const cur = CafeCash.state.cafe?.currency || 'ZAR';
    const sym = cur === 'ZAR' ? 'R' : cur === 'USD' ? '$' : cur === 'EUR' ? '€' : 'R';
    return sym + ' ' + (Number(value) || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

CafeCash.escapeHtml = function (str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
};
