// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyANHn3PUZWqz9_s3YBRudz7A1ywl7_omyU",
    authDomain: "gear-lending.firebaseapp.com",
    projectId: "gear-lending",
    storageBucket: "gear-lending.firebasestorage.app",
    messagingSenderId: "960970998033",
    appId: "1:960970998033:web:66aef98b45351621bcccb0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
