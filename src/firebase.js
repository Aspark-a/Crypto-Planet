import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { isSupported, getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDLtgZeB5xaeUVYuAzbXsCsIlwrtIIz4k8",
  authDomain: "crypto-a6b3a.firebaseapp.com",
  projectId: "crypto-a6b3a",
  storageBucket: "crypto-a6b3a.firebasestorage.app",
  messagingSenderId: "1006250907255",
  appId: "1:1006250907255:web:fbd212082cc4c4e1f61872",
  measurementId: "G-LCYYE7RT2B"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use long-polling instead of WebChannel streaming. Many corporate
// networks, VPNs, and some browser extensions block the streaming
// connection Firestore uses by default, which surfaces as the
// misleading "client is offline" error even though the network is fine.
// Long-polling is slightly slower per-request but works almost
// everywhere WebChannel doesn't.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

// Analytics can fail silently in some browsers (ad blockers, Safari ITP) —
// never let it break app boot.
export let analytics = null;
isSupported().then((ok) => { if (ok) analytics = getAnalytics(app) }).catch(() => {});

export default app;

