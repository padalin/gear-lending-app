// copyFirestoreData.js
import { initializeApp as initAppProd } from "firebase/app";
import {
  getFirestore as getFirestoreProd,
  collection as collectionProd,
  getDocs as getDocsProd,
} from "firebase/firestore";

import { initializeApp as initAppDev } from "firebase/app";
import {
  getFirestore as getFirestoreDev,
  setDoc,
  doc,
} from "firebase/firestore";

const prodConfig = {
  apiKey: "AIzaSyANHn3PUZWqz9_s3YBRudz7A1ywl7_omyU",
  authDomain: "gear-lending.firebaseapp.com",
  projectId: "gear-lending",
  storageBucket: "gear-lending.firebasestorage.app",
  messagingSenderId: "960970998033",
  appId: "1:960970998033:web:66aef98b45351621bcccb0",
};

const devConfig = {
  apiKey: "AIzaSyDrhgVSPy-7zQy_GZtyVDCOlr6beO5F52U",
  authDomain: "gear-lending-dev2.firebaseapp.com",
  projectId: "gear-lending-dev2",
  storageBucket: "gear-lending-dev2.firebasestorage.app",
  messagingSenderId: "80960948339",
  appId: "1:80960948339:web:5247606df5dde5ee7d4206",
};

const copyCollection = async (colName, prodDb, devDb) => {
  const prodSnap = await getDocsProd(collectionProd(prodDb, colName));
  console.log(`📦 [${colName}] 抓到 ${prodSnap.size} 筆資料`);

  for (const docSnap of prodSnap.docs) {
    const data = docSnap.data();
    await setDoc(doc(devDb, colName, docSnap.id), data);
    console.log(`✅ [${colName}] 已寫入：${docSnap.id}`);
  }
};

const copyData = async () => {
  const prodApp = initAppProd(prodConfig, "prod");
  const devApp = initAppDev(devConfig, "dev");

  const prodDb = getFirestoreProd(prodApp);
  const devDb = getFirestoreDev(devApp);

  await copyCollection("items", prodDb, devDb);
  await copyCollection("borrowRequests", prodDb, devDb);
  await copyCollection("returnRecords", prodDb, devDb);
  await copyCollection("presets", prodDb, devDb);

  console.log("🎉 所有資料複製完成！");
};

copyData();