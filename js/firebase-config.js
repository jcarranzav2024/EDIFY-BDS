import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

// Reemplaza los valores con la configuracion real de tu proyecto Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyAuE63GmuZMmbXMN_wQkxDWkMsZJOwKNAc",
  authDomain: "edify-bds.firebaseapp.com",
  projectId: "edify-bds",
  storageBucket: "edify-bds.firebasestorage.app",
  messagingSenderId: "402442852702",
  appId: "1:402442852702:web:47f0ee9131ca06edf9d7cf"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
