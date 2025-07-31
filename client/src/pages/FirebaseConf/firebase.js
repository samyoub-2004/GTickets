// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD6eAjN5-JXoCs8tPgoMwAbLD-bCfJxKRA",
  authDomain: "rewardsoft-4825e.firebaseapp.com",
  projectId: "rewardsoft-4825e",
  storageBucket: "rewardsoft-4825e.appspot.com", // Corrigé
  messagingSenderId: "357171218149",
  appId: "1:357171218149:web:125e0ceca2834ea5e6360c",
  measurementId: "G-13QDXYQSEY"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };