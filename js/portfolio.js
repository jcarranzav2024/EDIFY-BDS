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
import {
  getDownloadURL,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { auth, db, storage } from "./firebase-config.js";

const MB = 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = 8 * MB;

function sanitizeFileName(name) {
  return String(name || "imagen")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "imagen";
}

export async function uploadPortfolioImages(files = []) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado en Firebase Storage.");

  const validFiles = Array.from(files || []).filter(Boolean);
  if (!validFiles.length) return [];

  const uploadedUrls = [];

  for (const file of validFiles) {
    if (!file.type || !file.type.startsWith("image/")) {
      throw new Error(`Archivo invalido (${file.name || "sin nombre"}). Solo se permiten imagenes.`);
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`La imagen "${file.name || "seleccionada"}" supera el limite de 8 MB.`);
    }

    try {
      const safeFileName = sanitizeFileName(file.name || `imagen-${Date.now()}.jpg`);
      const uniqueId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `portfolio_jobs/${user.uid}/${Date.now()}-${uniqueId}-${safeFileName}`;
      const fileRef = ref(storage, path);

      await uploadBytes(fileRef, file, {
        contentType: file.type,
        customMetadata: {
          contractorId: user.uid
        }
      });

      uploadedUrls.push(await getDownloadURL(fileRef));
    } catch (uploadError) {
      const errorMsg = uploadError?.message || String(uploadError);
      if (errorMsg.includes("permission") || errorMsg.includes("Permission")) {
        throw new Error(`Sin permisos para subir imagenes. Verifica tu cuenta o contacta soporte. (${errorMsg})`);
      }
      throw new Error(`Error al subir "${file.name}": ${errorMsg}`);
    }
  }

  return uploadedUrls;
}

export async function createPortfolioJob(payload) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado en Firestore.");
  
  try {
    return await addDoc(collection(db, "portfolio_jobs"), {
      contractorId: user.uid,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      fechaTrabajo: payload.fechaTrabajo,
      imagenes: payload.imagenes || [],
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp()
    });
  } catch (error) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes("permission") || errorMsg.includes("Permission")) {
      throw new Error(`Sin permisos para crear trabajos. Verifica tu rol o contacta soporte. (${errorMsg})`);
    }
    throw error;
  }
}

export async function updatePortfolioJob(jobId, payload) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado en Firestore.");
  if (!jobId) throw new Error("ID de trabajo invalido.");

  try {
    return await updateDoc(doc(db, "portfolio_jobs", jobId), {
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      fechaTrabajo: payload.fechaTrabajo,
      imagenes: payload.imagenes || [],
      actualizadoEn: serverTimestamp()
    });
  } catch (error) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes("permission") || errorMsg.includes("Permission")) {
      throw new Error(`Sin permisos para actualizar este trabajo. Verifica tu rol o contacta soporte. (${errorMsg})`);
    }
    throw error;
  }
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
