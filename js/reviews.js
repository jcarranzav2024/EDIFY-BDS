import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  getDocs,
  getDoc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { asMessage, notifyError, notifySuccess } from "./validators.js";
import { initAuthUserMenu, initMobileNav } from "./nav.js";
import { renderInteractiveStars, renderStars } from "./review-manager.js";

const form = document.getElementById("reviewForm");
const message = document.getElementById("reviewMessage");
const listEl = document.getElementById("reviewsList");
const accessNotice = document.getElementById("reviewsAccessNotice");
const protectedSections = document.querySelectorAll('[data-protected="reviews"]');
const reviewFormNotice = document.getElementById("reviewFormNotice");

const allowedViewerRoles = new Set(["admin", "contratista", "cliente"]);
let viewerAuthorized = false;
let submitAuthorized = false;
let viewRestrictionMessage = "Debes iniciar sesion con una cuenta autorizada.";
let formRestrictionMessage = "No tienes permisos para publicar resenas.";
let starButtons = [];

initMobileNav();
initAuthUserMenu();
applyAccessRestrictions();

const starsContainer = document.getElementById("starsContainer");
if (starsContainer) {
  starsContainer.innerHTML = renderInteractiveStars();
  setupStarSelection();
}

function updateStarSelectionVisual(value) {
  const numericValue = Number(value) || 0;
  starButtons.forEach((button, index) => {
    if (index < numericValue) {
      button.classList.add("selected");
    } else {
      button.classList.remove("selected");
    }
  });
}

function setupStarSelection() {
  const estrellasInput = document.getElementById("estrellas");
  starButtons = Array.from(document.querySelectorAll("#starsContainer .star-btn"));

  if (!estrellasInput || starButtons.length === 0) {
    return;
  }

  starButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      const value = Number(btn.dataset.value);
      estrellasInput.value = value;
      updateStarSelectionVisual(value);
    });

    btn.addEventListener("mouseenter", () => {
      if (btn.disabled) return;
      const value = Number(btn.dataset.value);
      starButtons.forEach((b, i) => {
        if (i < value) {
          b.classList.add("hovered");
        } else {
          b.classList.remove("hovered");
        }
      });
    });

    btn.addEventListener("mouseleave", () => {
      starButtons.forEach((b) => b.classList.remove("hovered"));
    });
  });
}

function applyAccessRestrictions() {
  protectedSections.forEach((section) => {
    section.hidden = !viewerAuthorized;
  });

  if (accessNotice) {
    accessNotice.hidden = viewerAuthorized;
    const noticeParagraph = accessNotice.querySelector("p");
    if (noticeParagraph) {
      noticeParagraph.textContent = viewRestrictionMessage;
    }
  }

  if (reviewFormNotice) {
    if (!viewerAuthorized) {
      reviewFormNotice.hidden = true;
      reviewFormNotice.textContent = "";
    } else if (!submitAuthorized) {
      reviewFormNotice.hidden = false;
      reviewFormNotice.textContent = formRestrictionMessage;
    } else {
      reviewFormNotice.hidden = true;
      reviewFormNotice.textContent = "";
    }
  }

  if (form) {
    const disableElements = !submitAuthorized;
    Array.from(form.elements).forEach((el) => {
      if (
        el instanceof HTMLButtonElement ||
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        if (el.type === "hidden") return;
        el.disabled = disableElements;
      }
    });
  }

  if (!viewerAuthorized && listEl) {
    listEl.innerHTML = "";
  }
}

function evaluateAccess(user, role) {
  const normalizedRole = role?.toLowerCase?.() || "";

  if (!user) {
    viewerAuthorized = false;
    submitAuthorized = false;
    viewRestrictionMessage = "Debes iniciar sesion con una cuenta autorizada.";
    formRestrictionMessage = viewRestrictionMessage;
    return;
  }

  if (!allowedViewerRoles.has(normalizedRole)) {
    viewerAuthorized = false;
    submitAuthorized = false;
    viewRestrictionMessage = "Tu rol no tiene permisos para ver las resenas.";
    formRestrictionMessage = viewRestrictionMessage;
    return;
  }

  if (normalizedRole === "cliente") {
    viewerAuthorized = Boolean(user.emailVerified);
    submitAuthorized = viewerAuthorized;
    if (!viewerAuthorized) {
      viewRestrictionMessage = "Debes verificar tu correo para acceder a las resenas.";
      formRestrictionMessage = viewRestrictionMessage;
      return;
    }
    viewRestrictionMessage = "";
    formRestrictionMessage = "";
    return;
  }

  viewerAuthorized = true;
  submitAuthorized = false;
  formRestrictionMessage = "Solo los clientes pueden publicar resenas.";
  viewRestrictionMessage = "";
}

async function resolveUserRole(user) {
  if (!user) return null;
  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      return data.rol || null;
    }
  } catch (error) {
    console.error("Error obteniendo rol del usuario", error);
  }
  return null;
}

async function refreshReviews() {
  if (!listEl) return;
  if (!viewerAuthorized) {
    listEl.innerHTML = "";
    return;
  }
  listEl.innerHTML = "<p>Cargando resenas...</p>";

  try {
    const q = query(collection(db, "reviews"), orderBy("fecha", "desc"), limit(20));
    const snap = await getDocs(q);
    if (snap.empty) {
      listEl.innerHTML = "<p>No hay resenas todavia.</p>";
      return;
    }

    const rows = [];
    snap.forEach((item) => {
      const r = item.data();
      const commentHtml = r.comentario ? `<p>${r.comentario}</p>` : '';
      rows.push(`
        <article class="card">
          <p><strong>Contratista:</strong> ${r.contractorId}</p>
          <p><strong>Trabajo:</strong> ${r.jobId}</p>
          <p><strong>Estrellas:</strong> ${renderStars(r.estrellas)}</p>
          ${commentHtml}
        </article>
      `);
    });

    listEl.innerHTML = rows.join("");
  } catch (error) {
    listEl.innerHTML = `<p>Error cargando resenas: ${asMessage(error)}</p>`;
  }
}

async function recalculateContractorRating(contractorId) {
  const q = query(collection(db, "reviews"), where("contractorId", "==", contractorId), limit(200));
  const snap = await getDocs(q);
  if (snap.empty) return;

  let total = 0;
  let count = 0;
  snap.forEach((item) => {
    const stars = Number(item.data().estrellas || 0);
    if (stars > 0) {
      total += stars;
      count += 1;
    }
  });

  if (count === 0) return;

  await updateDoc(doc(db, "contractors", contractorId), {
    ratingPromedio: Number((total / count).toFixed(2)),
    totalResenas: count,
    actualizadoEn: serverTimestamp()
  });
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const contractorId = document.getElementById("contractorId").value.trim();
    const jobId = document.getElementById("jobId").value.trim();
    const estrellas = Number(document.getElementById("estrellas").value);
    const comentario = document.getElementById("comentario").value.trim();

    if (!submitAuthorized) {
      const reason = formRestrictionMessage || "No tienes permisos para publicar resenas.";
      message.textContent = reason;
      message.classList.add("error");
      notifyError(reason);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Debes iniciar sesion para publicar una resena.");
      if (estrellas < 1 || estrellas > 5) throw new Error("La calificacion debe estar entre 1 y 5.");

      await addDoc(collection(db, "reviews"), {
        contractorId,
        jobId,
        clientId: user.uid,
        estrellas,
        comentario,
        fecha: serverTimestamp()
      });

      await recalculateContractorRating(contractorId);
      form.reset();
      const estrellasInput = document.getElementById("estrellas");
      if (estrellasInput) {
        estrellasInput.value = "0";
      }
      updateStarSelectionVisual(0);
      message.textContent = "Resena publicada correctamente.";
      message.classList.remove("error");
      notifySuccess("Resena publicada correctamente.");
      await refreshReviews();
    } catch (error) {
      message.textContent = asMessage(error);
      message.classList.add("error");
      notifyError(asMessage(error));
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  const role = await resolveUserRole(user);
  evaluateAccess(user, role);
  applyAccessRestrictions();
  if (viewerAuthorized) {
    refreshReviews();
  }
});
