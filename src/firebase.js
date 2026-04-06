import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA1mJcntVt3Lp7r3leywTOtuxTl2FW5Y8s",
  authDomain: "labb-wwork.firebaseapp.com",
  projectId: "labb-wwork",
  storageBucket: "labb-wwork.firebasestorage.app",
  messagingSenderId: "172590704667",
  appId: "1:172590704667:web:153668039fa051931c30be",
  measurementId: "G-0J0D9J3PZ6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };