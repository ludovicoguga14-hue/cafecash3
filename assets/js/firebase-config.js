/**
 * ═══════════════════════════════════════════════════════════════════
 * CafeCash Firebase Configuration
 * ═══════════════════════════════════════════════════════════════════
 * 
 * This file initializes Firebase for the frontend.
 * It uses the COMPAT SDK (matches firebase-app-compat.js scripts).
 * 
 * Load order in HTML must be:
 *   1. firebase-app-compat.js
 *   2. firebase-auth-compat.js
 *   3. THIS FILE (firebase-config.js)
 *   4. auth.js
 */

console.log('📄 firebase-config.js loading...');

const firebaseConfig = {
    apiKey: "AIzaSyBANi73iiBafaG-MwafnQJ2rA-eKgGkGlQ",
    authDomain: "cafecash3.firebaseapp.com",
    projectId: "cafecash3",
    storageBucket: "cafecash3.firebasestorage.app",
    messagingSenderId: "181351763700",
    appId: "1:181351763700:web:507ddd94691cd34d4d8a1"
};

// ─── Initialize Firebase ───
(function initFirebase() {
    // 1. Check that Firebase SDK loaded
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase SDK not loaded. Check script order in HTML:');
        console.error('   <script src="...firebase-app-compat.js"></script>');
        console.error('   <script src="...firebase-auth-compat.js"></script>');
        console.error('   <script src="assets/js/firebase-config.js"></script>');
        return;
    }

    // 2. Skip if already initialized (prevents duplicate-init errors)
    if (firebase.apps && firebase.apps.length > 0) {
        console.log('ℹ️  Firebase already initialized');
        return;
    }

    // 3. Initialize
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('🔥 Firebase initialized successfully');
        console.log('   Project:', firebaseConfig.projectId);
        console.log('   Auth Domain:', firebaseConfig.authDomain);
    } catch (err) {
        console.error('❌ Firebase initialization failed:', err.message);
    }
})();

// ─── Expose globally for debugging (optional) ───
window.CAFECASH_FIREBASE_CONFIG = firebaseConfig;

console.log('✅ firebase-config.js loaded successfully');
