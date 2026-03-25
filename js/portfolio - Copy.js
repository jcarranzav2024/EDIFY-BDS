import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

export async function createPortfolioJob(payload) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado.");

  return addDoc(collection(db, "portfolio_jobs"), {
    contractorId: user.uid,
    titulo: payload.titulo,
    descripcion: payload.descripcion,
    fechaTrabajo: payload.fechaTrabajo,
    imagenes: payload.imagenes || [],
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp()
  });
}

export async function updatePortfolioJob(jobId, payload) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado.");
  if (!jobId) throw new Error("ID de trabajo invalido.");

  return updateDoc(doc(db, "portfolio_jobs", jobId), {
    titulo: payload.titulo,
    descripcion: payload.descripcion,
    fechaTrabajo: payload.fechaTrabajo,
    imagenes: payload.imagenes || [],
    actualizadoEn: serverTimestamp()
  });
}

export async function deletePortfolioJob(jobId) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado.");
  if (!jobId) throw new Error("ID de trabajo invalido.");

  return deleteDoc(doc(db, "portfolio_jobs", jobId));
}

export async function getMyPortfolioJobs(max = 30) {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, "portfolio_jobs"),
    where("contractorId", "==", user.uid),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getPublicPortfolioJobs(contractorId, max = 30) {
  if (!contractorId) return [];

  const q = query(
    collection(db, "portfolio_jobs"),
    where("contractorId", "==", contractorId),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
