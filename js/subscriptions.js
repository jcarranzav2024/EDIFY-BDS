import { collection, getDocs, limit, query, where } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

export async function getActiveSubscription() {
  const user = auth.currentUser;
  if (!user) return null;

  const q = query(collection(db, "subscriptions"), where("userId", "==", user.uid), where("estado", "==", "activa"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return { planId: "gratis", estado: "activa" };
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}
