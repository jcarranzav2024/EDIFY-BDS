/**
 * Módulo de gestión de reseñas y calificaciones
 */

import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  doc,
  updateDoc,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

/**
 * Obtiene todas las reseñas de un contratista
 * @param {string} contractorId - ID del contratista
 * @param {number} max - Cantidad máxima de reseñas
 * @returns {Promise<Array>} - Array de reseñas
 */
export async function getContractorReviews(contractorId, max = 50) {
  if (!contractorId) return [];

  const q = query(
    collection(db, "reviews"),
    where("contractorId", "==", contractorId),
    limit(max)
  );

  const snap = await getDocs(q);
  const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  
  // Ordenar por fecha de forma descendente en el cliente
  reviews.sort((a, b) => {
    const dateA = a.fecha?.toDate?.() || new Date(0);
    const dateB = b.fecha?.toDate?.() || new Date(0);
    return dateB - dateA;
  });
  
  return reviews;
}

/**
 * Obtiene el rating promedio y total de reseñas de un contratista
 * @param {string} contractorId - ID del contratista
 * @returns {Promise<Object>} - { ratingPromedio, totalResenas }
 */
export async function getContractorRating(contractorId) {
  if (!contractorId) return { ratingPromedio: 0, totalResenas: 0 };

  const q = query(
    collection(db, "reviews"),
    where("contractorId", "==", contractorId),
    limit(200)
  );

  const snap = await getDocs(q);
  if (snap.empty) return { ratingPromedio: 0, totalResenas: 0 };

  let total = 0;
  let count = 0;

  snap.forEach((item) => {
    const stars = Number(item.data().estrellas || 0);
    if (stars > 0 && stars <= 5) {
      total += stars;
      count += 1;
    }
  });

  if (count === 0) return { ratingPromedio: 0, totalResenas: 0 };

  return {
    ratingPromedio: Number((total / count).toFixed(2)),
    totalResenas: count
  };
}

/**
 * Crea una nueva reseña
 * @param {Object} reviewData - Datos de la reseña
 * @returns {Promise<DocumentReference>}
 */
export async function createReview(reviewData) {
  const user = auth.currentUser;
  if (!user) throw new Error("Debes iniciar sesión para dejar una reseña.");

  const { contractorId, estrellas, comentario, jobId } = reviewData;

  if (!contractorId) throw new Error("ID del contratista requerido.");
  if (estrellas < 1 || estrellas > 5) throw new Error("La calificación debe estar entre 1 y 5.");

  const docRef = await addDoc(collection(db, "reviews"), {
    contractorId,
    jobId: jobId || "",
    clientId: user.uid,
    estrellas: Number(estrellas),
    comentario: comentario?.trim() || "",
    fecha: serverTimestamp()
  });

  // Recalcular rating del contratista
  await updateContractorRating(contractorId);

  return docRef;
}

/**
 * Actualiza el rating promedio del contratista
 * @param {string} contractorId - ID del contratista
 */
export async function updateContractorRating(contractorId) {
  try {
    const rating = await getContractorRating(contractorId);

    await updateDoc(doc(db, "contractors", contractorId), {
      ratingPromedio: rating.ratingPromedio,
      totalResenas: rating.totalResenas,
      actualizadoEn: serverTimestamp()
    });
  } catch (error) {
    console.error("Error actualizando rating del contratista:", error);
    // No lanzar error, solo registrar en consola
    // Permitir que la reseña se guarde aunque falle la actualización del rating
  }
}

/**
 * Genera HTML para mostrar estrellas
 * @param {number} estrellas - Cantidad de estrellas (0-5)
 * @param {boolean} interactive - Si es interactivo o solo lectura
 * @returns {string} - HTML de las estrellas
 */
export function renderStars(estrellas, interactive = false) {
  const count = Math.round(estrellas);
  let html = '<div class="stars-display">';

  for (let i = 1; i <= 5; i++) {
    if (i <= count) {
      html += '<span class="star filled" data-value="' + i + '">★</span>';
    } else {
      html += '<span class="star empty" data-value="' + i + '">☆</span>';
    }
  }

  html += "</div>";
  return html;
}

/**
 * Genera HTML interactivo para seleccionar estrellas
 * @returns {string} - HTML de selector de estrellas
 */
export function renderInteractiveStars() {
  let html = '<div class="stars-interactive">';

  for (let i = 1; i <= 5; i++) {
    html += `
      <button 
        type="button" 
        class="star-btn" 
        data-value="${i}" 
        title="${i} estrella${i > 1 ? 's' : ''}"
        aria-label="${i} estrella${i > 1 ? 's' : ''}"
      >
        ★
      </button>
    `;
  }

  html += "</div>";
  return html;
}
