// config/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAs4csHgNdwGa_4dqwwNQrAwkWJwoe1f-U",
  authDomain: "voltvault-c1ba3.firebaseapp.com",
  projectId: "voltvault-c1ba3",
  storageBucket: "voltvault-c1ba3.firebasestorage.app",
  messagingSenderId: "990271563269",
  appId: "1:990271563269:web:c0cc05aaebfee2d72cde6c",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth (persistence is automatic in React Native)
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);
