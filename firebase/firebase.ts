import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADzCfkcUPxByxz8bPzNmYu4z2WFcstKRE",
  authDomain: "emotion-f5cdc.firebaseapp.com",
  projectId: "emotion-f5cdc",
  storageBucket: "emotion-f5cdc.firebasestorage.app",
  messagingSenderId: "780484619373",
  appId: "1:780484619373:web:b62d219a69c7501f052364",
  measurementId: "G-E2XZCPH18H",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
