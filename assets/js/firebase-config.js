/**
 * CafeCash Firebase Configuration
 */
const firebaseConfig = {
    apiKey: "AIzaSyBANi73iiBafaG-MwafnQJ2rA-eKgGkGlQ",
    authDomain: "cafecash3.firebaseapp.com",
    projectId: "cafecash3",
    storageBucket: "cafecash3.firebasestorage.app",
    messagingSenderId: "181351763700",
    appId: "1:181351763700:web:507ddd94691cd34d4d8a1"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('🔥 Firebase initialized:', firebaseConfig.projectId);
}

window.CAFECASH_FIREBASE_CONFIG = firebaseConfig;
