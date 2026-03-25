import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  getDocs,
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

initMobileNav();
initAuthUserMenu();

const starsContainer = document.getElementById("starsContainer");
if (starsContainer) {
  starsContainer.innerHTML = renderInteractiveStars();
  setupStarSelection();
}

function setupStarSelection() {
  const starBtns = document.querySelectorAll("#starsContainer .star-btn");
  const estrellasInput = document.getElementById("estrellas");

  starBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = Number(btn.dataset.value);
      estrellasInput.value = value;

      // Actualizar visualización
      starBtns.forEach((b, i) => {
        if (i < value) {
          b.classList.add("selected");
        } else {
          b.classList.remove("selected");
        }
      });
    });

    btn.addEventListener("mouseenter", () => {
      const value = Number(btn.dataset.value);
      starBtns.forEach((b, i) => {
        if (i < value) {
          b.classList.add("hovered");
        } else {
          b.classList.remove("hovered");
        }
      });
    });

    btn.addEventListener("mouseleave", () => {
      starBtns.forEach((b) => b.classList.remove("hovered"));
    });
  });
}

async function refreshReviews() {
  if (!listEl) return;
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

refreshReviews();

onAuthStateChanged(auth, () => {
  refreshReviews();
});
