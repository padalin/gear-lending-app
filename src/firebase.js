// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig_dev = {//測試用
  apiKey: "AIzaSyDrhgVSPy-7zQy_GZtyVDCOlr6beO5F52U",
  authDomain: "gear-lending-dev2.firebaseapp.com",
  projectId: "gear-lending-dev2",
  storageBucket: "gear-lending-dev2.firebasestorage.app",
  messagingSenderId: "80960948339",
  appId: "1:80960948339:web:5247606df5dde5ee7d4206"
};

const firebaseConfig_prod = {//正式用
  apiKey: "AIzaSyANHn3PUZWqz9_s3YBRudz7A1ywl7_omyU",
  authDomain: "gear-lending.firebaseapp.com",
  projectId: "gear-lending",
  storageBucket: "gear-lending.firebasestorage.app",
  messagingSenderId: "960970998033",
  appId: "1:960970998033:web:66aef98b45351621bcccb0"
};

const firebaseEnv = import.meta.env.VITE_FIREBASE_ENV || "prod";
const config = firebaseEnv === "dev" ? firebaseConfig_dev : firebaseConfig_prod;

const app = initializeApp(config);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };