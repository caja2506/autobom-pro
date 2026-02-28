// --- CONFIGURACIÓN DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDGUTnCBWhPpyOrjAf5eQbQaQz0Dm18NXc",
    authDomain: "bom-ame-cr.firebaseapp.com",
    projectId: "bom-ame-cr",
    storageBucket: "bom-ame-cr.firebasestorage.app",
    messagingSenderId: "865326401984",
    appId: "1:865326401984:web:ebad6ca9ee666eaec3a025",
    measurementId: "G-XNN4RBPK2Y"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
