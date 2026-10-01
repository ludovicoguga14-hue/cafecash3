(function () {
    'use strict';

    const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:8080/api'
        : 'https://cafecash3-backend-3.onrender.com/api';

    let mode = 'login';

    const $ = (id) => document.getElementById(id);

    function showError(msg) {
        const el = $('authError');
        if (!el) { console.error(msg); return; }
        el.textContent = msg;
        el.classList.add('show');
    }

    function hideError() {
        $('authError')?.classList.remove('show');
    }

    function setLoading(loading) {
        const btn = $('authSubmit');
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = loading
            ? (mode === 'login' ? 'Signing in…' : 'Creating…')
            : (mode === 'login' ? 'Sign in' : 'Create account');
    }

    window.switchAuthMode = function (newMode) {
        mode = newMode;
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === newMode));

        const isRegister = newMode === 'register';
        $('nameField').style.display = isRegister ? '' : 'none';
        $('universityField').style.display = isRegister ? '' : 'none';
        $('cafeteriaField').style.display = isRegister ? '' : 'none';
        $('authTitle').textContent = isRegister ? 'Create your account' : 'Welcome back';
        $('authSubtitle').textContent = isRegister ? 'Set up your café in 30 seconds' : 'Sign in to CafeCash';
        $('authSubmit').textContent = isRegister ? 'Create account' : 'Sign in';
        hideError();
    };

    async function syncWithBackend(idToken, payload) {
        const res = await fetch(API_BASE + '/auth/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + idToken
            },
            body: JSON.stringify(payload)
        });

        let data;
        try { data = await res.json(); }
        catch { throw new Error('Backend did not respond correctly'); }

        if (!res.ok || data.success === false) {
            throw new Error(data.error || 'Backend error: HTTP ' + res.status);
        }
        return data;
    }

    function saveSession(idToken, user) {
        localStorage.setItem('cafecash_token', idToken);
        sessionStorage.setItem('cafecash_user', JSON.stringify(user));
    }

    function handleSubmit(e) {
        e.preventDefault();

        hideError();

        const email = ($('email')?.value || '').trim();
        const password = $('password')?.value || '';
        const name = ($('name')?.value || '').trim();
        const universityName = ($('universityName')?.value || '').trim();
        const cafeteriaName = ($('cafeteriaName')?.value || '').trim();

        if (!email || !password) return showError('Email and password are required');
        if (password.length < 6) return showError('Password must be 6+ characters');
        if (mode === 'register' && !name) return showError('Please enter your name');

        if (typeof firebase === 'undefined' || !firebase.auth) {
            return showError('Firebase not loaded. Refresh the page.');
        }

        setLoading(true);

        (async () => {
            try {
                let credential;

                if (mode === 'register') {
                    credential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                    if (name) await credential.user.updateProfile({ displayName: name });
                } else {
                    credential = await firebase.auth().signInWithEmailAndPassword(email, password);
                }

                const firebaseUser = credential.user;
                const idToken = await firebaseUser.getIdToken(true);

                console.log('✅ Firebase login worked');
                console.log('UID:', firebaseUser.uid);
                console.log('Token length:', idToken.length);

                const payload = { name: name || firebaseUser.displayName };
                if (mode === 'register') {
                    if (universityName) payload.universityName = universityName;
                    if (cafeteriaName) payload.cafeteriaName = cafeteriaName;
                }

                const syncData = await syncWithBackend(idToken, payload);

                saveSession(idToken, syncData.data);
                window.location.href = 'dashboard.html';

            } catch (err) {
                console.error('❌ Auth error:', err);
                let msg = err.message || 'Authentication failed';

                if (msg.includes('email-already-in-use')) msg = 'Email already registered. Try signing in.';
                else if (msg.includes('wrong-password') || msg.includes('invalid-credential')) msg = 'Incorrect email or password';
                else if (msg.includes('user-not-found')) msg = 'No account found. Create one instead.';
                else if (msg.includes('weak-password')) msg = 'Password too weak.';
                else if (msg.includes('invalid-email')) msg = 'Invalid email address';
                else if (msg.includes('network')) msg = 'Network error. Check internet connection.';
                else if (msg.includes('Failed to fetch') || msg.includes('Backend')) {
                    msg = 'Could not reach backend. Make sure it is running.';
                }

                showError(msg);
                setLoading(false);
            }
        })();
    }

    function init() {
        $('authForm')?.addEventListener('submit', handleSubmit);
        if (location.hash === '#register') window.switchAuthMode('register');
        console.log('✅ CafeCash auth.js loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
