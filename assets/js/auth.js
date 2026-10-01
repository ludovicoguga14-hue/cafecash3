/**
 * CafeCash Authentication
 * Handles: Login, Register, Google, Apple, Backend sync
 */

(function () {
    'use strict';

    const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:8080/api'
        : 'https://cafecash3-backend-3.onrender.com/api';

    let mode = 'login';

    const $ = (id) => document.getElementById(id);

    function showError(message) {
        const el = $('authError');
        if (!el) { console.error('Auth error:', message); return; }
        el.textContent = message;
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
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.mode === newMode);
        });

        const isRegister = newMode === 'register';
        $('nameField').style.display = isRegister ? '' : 'none';
        $('universityField').style.display = isRegister ? '' : 'none';
        $('cafeteriaField').style.display = isRegister ? '' : 'none';
        $('authTitle').textContent = isRegister ? 'Create your account' : 'Welcome back';
        $('authSubtitle').textContent = isRegister
            ? 'Set up your café workspace in under 30 seconds'
            : 'Sign in to your CafeCash account';
        $('authSubmit').textContent = isRegister ? 'Create account' : 'Sign in';

        hideError();
    };

    // ═══════════════════════════════════════════════════════════════
    // ALWAYS GET FRESH TOKEN — verified fix from AI insight
    // ═══════════════════════════════════════════════════════════════
    async function getFreshFirebaseToken(user) {
        if (!user) throw new Error('Firebase user was not found.');
        const idToken = await user.getIdToken(true);
        if (!idToken) throw new Error('Firebase did not return an ID token.');
        console.log('✅ Fresh Firebase ID token obtained');
        console.log('Firebase UID:', user.uid);
        console.log('Token length:', idToken.length);
        return idToken;
    }

    async function syncWithBackend(idToken, payload) {
        console.log('📤 Sending to backend with token length:', idToken.length);

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
        catch { throw new Error('Backend returned invalid response.'); }

        if (!res.ok || data.success === false) {
            console.error('❌ Backend responded:', res.status, data);
            throw new Error(data.error || 'Backend error: HTTP ' + res.status);
        }
        return data;
    }

    function saveSession(idToken, user) {
        if (!idToken) throw new Error('No ID token to save.');
        localStorage.setItem('cafecash_token', idToken);
        sessionStorage.setItem('cafecash_user', JSON.stringify(user));
        console.log('✅ Session saved');
    }

    function handleSubmit(e) {
        e.preventDefault();
        e.stopPropagation();
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
                console.log('✅ Firebase login worked');

                // Always get a fresh token
                const idToken = await getFreshFirebaseToken(firebaseUser);

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
                else if (msg.includes('Failed to fetch') || msg.includes('backend')) {
                    msg = 'Firebase login worked, but CafeCash could not connect to the backend. Please try again.';
                }

                showError(msg);
                setLoading(false);
            }
        })();
    }

    window.handleGoogleSignIn = async function () {
        hideError();
        if (typeof firebase === 'undefined' || !firebase.auth) {
            return showError('Firebase not loaded.');
        }
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const firebaseUser = result.user;
            const idToken = await getFreshFirebaseToken(firebaseUser);
            const syncData = await syncWithBackend(idToken, { name: firebaseUser.displayName });
            saveSession(idToken, syncData.data);
            window.location.href = 'dashboard.html';
        } catch (err) {
            if (err.code === 'auth/popup-closed-by-user') return;
            console.error('Google sign-in error:', err);
            showError(err.message || 'Google sign-in failed');
        }
    };

    window.handleAppleSignIn = async function () {
        hideError();
        if (typeof firebase === 'undefined' || !firebase.auth) {
            return showError('Firebase not loaded.');
        }
        try {
            const provider = new firebase.auth.OAuthProvider('apple.com');
            const result = await firebase.auth().signInWithPopup(provider);
            const firebaseUser = result.user;
            const idToken = await getFreshFirebaseToken(firebaseUser);
            const syncData = await syncWithBackend(idToken, { name: firebaseUser.displayName });
            saveSession(idToken, syncData.data);
            window.location.href = 'dashboard.html';
        } catch (err) {
            if (err.code === 'auth/popup-closed-by-user') return;
            console.error('Apple sign-in error:', err);
            showError(err.message || 'Apple sign-in failed');
        }
    };

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
