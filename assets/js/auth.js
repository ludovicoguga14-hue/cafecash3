/**
 * ═══════════════════════════════════════════════════════════════════
 * CafeCash Authentication
 * Handles: Login, Register, Google, Apple, Backend sync
 * ═══════════════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // CONFIG
    // ═══════════════════════════════════════════════════════════════

    const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:8080/api'
        : 'https://cafecash3-backend-3.onrender.com/api';

    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════

    let mode = 'login';

    // ═══════════════════════════════════════════════════════════════
    // DOM HELPERS
    // ═══════════════════════════════════════════════════════════════

    const $ = (id) => document.getElementById(id);

    function showError(message) {
        const el = $('authError');

        if (!el) {
            console.error('Auth error:', message);
            return;
        }

        el.textContent = message;
        el.classList.add('show');
    }

    function hideError() {
        const el = $('authError');

        if (!el) return;

        el.classList.remove('show');
    }

    function setLoading(loading) {
        const btn = $('authSubmit');

        if (!btn) return;

        btn.disabled = loading;

        if (loading) {
            btn.textContent = mode === 'login'
                ? 'Signing in…'
                : 'Creating…';
        } else {
            btn.textContent = mode === 'login'
                ? 'Sign in'
                : 'Create account';
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MODE SWITCH
    // ═══════════════════════════════════════════════════════════════

    window.switchAuthMode = function (newMode) {
        mode = newMode;

        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.toggle(
                'active',
                t.dataset.mode === newMode
            );
        });

        const isRegister = newMode === 'register';

        const nameField = $('nameField');
        const universityField = $('universityField');
        const cafeteriaField = $('cafeteriaField');
        const titleEl = $('authTitle');
        const subtitleEl = $('authSubtitle');
        const submitBtn = $('authSubmit');
        const passwordEl = $('password');

        if (nameField) {
            nameField.style.display = isRegister ? '' : 'none';
        }

        if (universityField) {
            universityField.style.display = isRegister ? '' : 'none';
        }

        if (cafeteriaField) {
            cafeteriaField.style.display = isRegister ? '' : 'none';
        }

        if (titleEl) {
            titleEl.textContent = isRegister
                ? 'Create your account'
                : 'Welcome back';
        }

        if (subtitleEl) {
            subtitleEl.textContent = isRegister
                ? 'Set up your café workspace in under 30 seconds'
                : 'Sign in to your CafeCash account';
        }

        if (submitBtn) {
            submitBtn.textContent = isRegister
                ? 'Create account'
                : 'Sign in';
        }

        if (passwordEl) {
            passwordEl.autocomplete = isRegister
                ? 'new-password'
                : 'current-password';
        }

        hideError();

        const url = new URL(location.href);

        if (isRegister) {
            url.hash = 'register';
        } else {
            url.hash = '';
        }

        history.replaceState(null, '', url);
    };

    // ═══════════════════════════════════════════════════════════════
    // BACKEND SYNC
    // ═══════════════════════════════════════════════════════════════

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

        try {
            data = await res.json();
        } catch {
            throw new Error(
                'Backend returned an invalid response. Is the backend running?'
            );
        }

        if (!res.ok || data.success === false) {
            throw new Error(
                data.error || `Backend error: HTTP ${res.status}`
            );
        }

        return data;
    }

    // ═══════════════════════════════════════════════════════════════
    // SAVE SESSION
    // ═══════════════════════════════════════════════════════════════

    function saveSession(idToken, user) {
        if (!idToken) {
            throw new Error('Firebase did not provide an ID token.');
        }

        localStorage.setItem(
            'cafecash_token',
            idToken
        );

        sessionStorage.setItem(
            'cafecash_user',
            JSON.stringify(user)
        );

        console.log('✅ CafeCash session saved');
        console.log('Token length:', idToken.length);
    }

    // ═══════════════════════════════════════════════════════════════
    // REDIRECT
    // ═══════════════════════════════════════════════════════════════

    function redirectToDashboard() {
        window.location.href = 'dashboard.html';
    }

    // ═══════════════════════════════════════════════════════════════
    // GET FRESH FIREBASE TOKEN
    // ═══════════════════════════════════════════════════════════════

    async function getFreshFirebaseToken(user) {
        if (!user) {
            throw new Error('Firebase user was not found.');
        }

        // Force Firebase to refresh the token.
        const idToken = await user.getIdToken(true);

        if (!idToken) {
            throw new Error('Firebase did not return an ID token.');
        }

        console.log('✅ Fresh Firebase ID token obtained');
        console.log('Firebase UID:', user.uid);
        console.log('Token length:', idToken.length);

        return idToken;
    }

    // ═══════════════════════════════════════════════════════════════
    // MAIN SUBMIT
    // ═══════════════════════════════════════════════════════════════

    function handleSubmit(e) {
        e.preventDefault();
        e.stopPropagation();

        hideError();

        const email = ($('email')?.value || '').trim();
        const password = $('password')?.value || '';
        const name = ($('name')?.value || '').trim();
        const universityName =
            ($('universityName')?.value || '').trim();
        const cafeteriaName =
            ($('cafeteriaName')?.value || '').trim();

        // ═══════════════════════════════════════════════════════════
        // VALIDATION
        // ═══════════════════════════════════════════════════════════

        if (!email || !password) {
            showError('Email and password are required');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        if (mode === 'register' && !name) {
            showError('Please enter your full name');
            return;
        }

        // ═══════════════════════════════════════════════════════════
        // FIREBASE CHECK
        // ═══════════════════════════════════════════════════════════

        if (
            typeof firebase === 'undefined' ||
            !firebase.auth
        ) {
            showError(
                'Firebase is not loaded. Please refresh the page.'
            );
            return;
        }

        setLoading(true);

        (async () => {
            try {
                let userCredential;

                // ═══════════════════════════════════════════════════
                // REGISTER
                // ═══════════════════════════════════════════════════

                if (mode === 'register') {

                    userCredential =
                        await firebase.auth()
                            .createUserWithEmailAndPassword(
                                email,
                                password
                            );

                    const firebaseUser =
                        userCredential.user;

                    if (name) {
                        await firebaseUser.updateProfile({
                            displayName: name
                        });
                    }

                }

                // ═══════════════════════════════════════════════════
                // LOGIN
                // ═══════════════════════════════════════════════════

                else {

                    userCredential =
                        await firebase.auth()
                            .signInWithEmailAndPassword(
                                email,
                                password
                            );
                }

                const firebaseUser =
                    userCredential.user;

                // ═══════════════════════════════════════════════════
                // IMPORTANT:
                // ALWAYS GET A FRESH FIREBASE ID TOKEN
                // ═══════════════════════════════════════════════════

                const idToken =
                    await getFreshFirebaseToken(firebaseUser);

                // ═══════════════════════════════════════════════════
                // BACKEND SYNC
                // ═══════════════════════════════════════════════════

                const syncPayload = {
                    name:
                        name ||
                        firebaseUser.displayName ||
                        undefined
                };

                if (mode === 'register') {

                    if (universityName) {
                        syncPayload.universityName =
                            universityName;
                    }

                    if (cafeteriaName) {
                        syncPayload.cafeteriaName =
                            cafeteriaName;
                    }
                }

                let syncData;

                try {

                    syncData =
                        await syncWithBackend(
                            idToken,
                            syncPayload
                        );

                    console.log(
                        '✅ Backend sync successful'
                    );

                } catch (syncErr) {

                    console.error(
                        '❌ Backend sync failed:',
                        syncErr
                    );

                    /*
                     * IMPORTANT:
                     * Do NOT pretend the backend sync succeeded.
                     *
                     * The dashboard requires a valid backend session,
                     * so stop here instead of saving a token that will
                     * immediately fail /api/auth/me.
                     */

                    throw new Error(
                        'Your Firebase login worked, but CafeCash could not connect to the backend. Please try again.'
                    );
                }

                // ═══════════════════════════════════════════════════
                // SAVE VALID SESSION
                // ═══════════════════════════════════════════════════

                console.log(
                    'Firebase UID:',
                    firebaseUser.uid
                );

                console.log(
                    'Firebase token obtained:',
                    !!idToken
                );

                console.log(
                    'Firebase token length:',
                    idToken.length
                );

                saveSession(
                    idToken,
                    syncData.data
                );

                // ═══════════════════════════════════════════════════
                // DASHBOARD
                // ═══════════════════════════════════════════════════

                redirectToDashboard();

            } catch (err) {

                console.error(
                    '❌ Auth error:',
                    err
                );

                let msg =
                    err.message ||
                    'Authentication failed';

                // ═══════════════════════════════════════════════════
                // FRIENDLY FIREBASE ERRORS
                // ═══════════════════════════════════════════════════

                if (
                    msg.includes('email-already-in-use')
                ) {
                    msg =
                        'This email is already registered. Try signing in instead.';

                } else if (
                    msg.includes('wrong-password') ||
                    msg.includes('invalid-credential') ||
                    msg.includes('INVALID_LOGIN_CREDENTIALS')
                ) {
                    msg =
                        'Incorrect email or password';

                } else if (
                    msg.includes('user-not-found')
                ) {
                    msg =
                        'No account found with this email. Create one instead?';

                } else if (
                    msg.includes('weak-password')
                ) {
                    msg =
                        'Password is too weak. Use at least 6 characters.';

                } else if (
                    msg.includes('invalid-email')
                ) {
                    msg =
                        'Please enter a valid email address';

                } else if (
                    msg.includes('network-request-failed')
                ) {
                    msg =
                        'Network error. Check your internet connection.';

                } else if (
                    msg.includes('api-key-not-valid') ||
                    msg.includes('invalid-api-key')
                ) {
                    msg =
                        'Firebase config is missing or invalid. Check firebase-config.js';

                } else if (
                    msg.includes('operation-not-allowed')
                ) {
                    msg =
                        'Email/Password sign-in is not enabled in Firebase Console.';

                } else if (
                    msg.includes('too-many-requests')
                ) {
                    msg =
                        'Too many attempts. Wait a moment and try again.';

                } else if (
                    msg.includes('backend')
                ) {
                    msg =
                        'Firebase login worked, but CafeCash could not connect to the backend. Please try again.';
                }

                showError(msg);
                setLoading(false);
            }
        })();
    }

    // ═══════════════════════════════════════════════════════════════
    // GOOGLE SIGN IN
    // ═══════════════════════════════════════════════════════════════

    window.handleGoogleSignIn = async function () {

        hideError();

        if (
            typeof firebase === 'undefined' ||
            !firebase.auth
        ) {
            showError(
                'Firebase is not loaded. Please refresh the page.'
            );
            return;
        }

        try {

            const provider =
                new firebase.auth.GoogleAuthProvider();

            const result =
                await firebase.auth()
                    .signInWithPopup(provider);

            const firebaseUser = result.user;

            // Always get a fresh token.
            const idToken =
                await getFreshFirebaseToken(
                    firebaseUser
                );

            const syncData =
                await syncWithBackend(
                    idToken,
                    {
                        name:
                            firebaseUser.displayName
                    }
                );

            saveSession(
                idToken,
                syncData.data
            );

            redirectToDashboard();

        } catch (err) {

            if (
                err.code ===
                'auth/popup-closed-by-user'
            ) {
                return;
            }

            console.error(
                'Google sign-in error:',
                err
            );

            showError(
                err.message ||
                'Google sign-in failed'
            );
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // APPLE SIGN IN
    // ═══════════════════════════════════════════════════════════════

    window.handleAppleSignIn = async function () {

        hideError();

        if (
            typeof firebase === 'undefined' ||
            !firebase.auth
        ) {
            showError(
                'Firebase is not loaded. Please refresh the page.'
            );
            return;
        }

        try {

            const provider =
                new firebase.auth.OAuthProvider(
                    'apple.com'
                );

            const result =
                await firebase.auth()
                    .signInWithPopup(provider);

            const firebaseUser = result.user;

            // Always get a fresh token.
            const idToken =
                await getFreshFirebaseToken(
                    firebaseUser
                );

            const syncData =
                await syncWithBackend(
                    idToken,
                    {
                        name:
                            firebaseUser.displayName
                    }
                );

            saveSession(
                idToken,
                syncData.data
            );

            redirectToDashboard();

        } catch (err) {

            if (
                err.code ===
                'auth/popup-closed-by-user'
            ) {
                return;
            }

            console.error(
                'Apple sign-in error:',
                err
            );

            showError(
                err.message ||
                'Apple sign-in failed'
            );
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════

    function init() {

        const form = $('authForm');

        if (form) {

            form.addEventListener(
                'submit',
                handleSubmit
            );

        } else {

            console.error(
                '❌ authForm not found in DOM'
            );
        }

        // ═══════════════════════════════════════════════════════════
        // URL HASH → MODE
        // ═══════════════════════════════════════════════════════════

        if (location.hash === '#register') {
            window.switchAuthMode('register');
        }

        /*
         * IMPORTANT:
         *
         * Do NOT automatically redirect just because a token exists.
         *
         * An old/expired/invalid token could otherwise send the user
         * straight back to dashboard.html and create the 403 loop.
         *
         * The user must authenticate through Firebase again.
         */

        console.log(
            '✅ CafeCash auth.js loaded'
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // START
    // ═══════════════════════════════════════════════════════════════

    if (document.readyState === 'loading') {

        document.addEventListener(
            'DOMContentLoaded',
            init
        );

    } else {

        init();
    }

})();
