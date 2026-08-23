/**
 * Firebase Configuration Module
 * Extracted from inline script in RDI-Indirect-Inventory_v6_65.html
 * Provides centralized Firebase app initialization and service access.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Firebase config from the application (project: rdi-indirect-scanner)
const firebaseConfig = {
  apiKey: "AIzaSyDC4HsfqZv6-_Bq9D8QlNba0EkAyUkMe9c",
  authDomain: "rdi-indirect-scanner.firebaseapp.com",
  projectId: "rdi-indirect-scanner",
  storageBucket: "rdi-indirect-scanner.firebasestorage.app",
  messagingSenderId: "732879631441",
  appId: "1:732879631441:web:df166edf7842a502303470",
  measurementId: "G-Y2K1YXRTZV"
};

/**
 * Initialize primary Firebase app instance
 * @returns {import('firebase/app').FirebaseApp} initialized app
 */
export function initFirebaseApp() {
  return initializeApp(firebaseConfig);
}

/**
 * Initialize App Check (v6.58+) - adds defense layer before Firestore rules
 * @param {import('firebase/app').FirebaseApp} app - Firebase app instance
 * @param {string} recaptchaSiteKey - reCAPTCHA V3 site key (public, not secret)
 */
export function initAppCheck(app, recaptchaSiteKey = "6LfE15AtAAAAABCXuEztZPg3D75oqSldiyj5egL0") {
  import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-check.js").then(firebase => {
    const { initializeAppCheck, ReCaptchaV3Provider } = firebase;
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  });
}

/**
 * Get authenticated Firebase Auth instance
 * @param {import('firebase/app').FirebaseApp} [app] - Optional app instance (uses default)
 * @returns {import('firebase/auth').Auth} auth instance
 */
export function getAuthInstance(app) {
  return getAuth(app);
}

/**
 * Get Firestore instance
 * @param {import('firebase/app').FirebaseApp} [app] - Optional app instance (uses default)
 * @returns {import('firebase/firestore').Firestore} firestore instance
 */
export function getFirestoreInstance(app) {
  return getFirestore(app);
}

// Initialize secondary Firebase App for admin operations (v6.59 — Manajemen Akun Opsi 2)
const secondaryAppConfig = {
  ...firebaseConfig,
  name: 'secondary'
};

let secondaryApp;

export function initSecondaryApp() {
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, 'secondary');
  }
  return secondaryApp;
}

export function getSecondaryAuth() {
  return getAuth(initSecondaryApp());
}

export { firebaseConfig };