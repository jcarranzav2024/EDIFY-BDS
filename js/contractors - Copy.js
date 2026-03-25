import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import {
  asMessage,
  notifyError,
  notifyInfo,
  notifySuccess
} from "./validators.js";
import { initAuthUserMenu, initMobileNav } from "./nav.js";
import {
  createPortfolioJob,
  deletePortfolioJob,
  getMyPortfolioJobs,
  getPublicPortfolioJobs,
  updatePortfolioJob
} from "./portfolio.js";
import { searchContractors } from "./search.js";
import { getContractorReviews, createReview, renderStars, renderInteractiveStars } from "./review-manager.js";

const listEl = document.getElementById("contractorsList");
const filterBtn = document.getElementById("filterBtn");

const userProfileForm = document.getElementById("userProfileForm");
const userProfileMessage = document.getElementById("userProfileMessage");
const userRoleBadge = document.getElementById("userRoleBadge");

const profileForm = document.getElementById("profileForm");
const profileMessage = document.getElementById("profileMessage");
const subscriptionInfo = document.getElementById("subscriptionInfo");
const roleNotice = document.getElementById("roleNotice");
const contractorProfileSection = document.getElementById("contractorProfileSection");
const contractorCatalogSection = document.getElementById("contractorCatalogSection");
const subscriptionSection = document.getElementById("subscriptionSection");

const portfolioForm = document.getElementById("portfolioForm");
const portfolioMessage = document.getElementById("portfolioMessage");
const portfolioList = document.getElementById("portfolioList");
const openPortfolioModalBtn = document.getElementById("openPortfolioModalBtn");
const portfolioModal = document.getElementById("portfolioModal");
const portfolioModalBackdrop = document.getElementById("portfolioModalBackdrop");
const portfolioModalDialog = document.getElementById("portfolioModalDialog");
const portfolioModalTitle = document.getElementById("portfolioModalTitle");
const portfolioModalCloseBtn = document.getElementById("portfolioModalCloseBtn");
const portfolioTitulo = document.getElementById("portfolioTitulo");
const portfolioFecha = document.getElementById("portfolioFecha");
const portfolioDescripcion = document.getElementById("portfolioDescripcion");
const portfolioImagenes = document.getElementById("portfolioImagenes");
const portfolioSaveBtn = document.getElementById("portfolioSaveBtn");
const portfolioCancelEditBtn = document.getElementById("portfolioCancelEditBtn");

const reviewModal = document.getElementById("reviewModal");
const reviewModalBackdrop = document.getElementById("reviewModalBackdrop");
const reviewModalDialog = document.getElementById("reviewModalDialog");
const reviewModalTitle = document.getElementById("reviewModalTitle");
const reviewModalCloseBtn = document.getElementById("reviewModalCloseBtn");
const reviewForm = document.getElementById("reviewForm");
const reviewMessage = document.getElementById("reviewMessage");
const reviewStarsContainer = document.getElementById("reviewStarsContainer");
const reviewStars = document.getElementById("reviewStars");
const reviewComment = document.getElementById("reviewComment");
const reviewContractorId = document.getElementById("reviewContractorId");
const reviewJobId = document.getElementById("reviewJobId");
const reviewSubmitBtn = document.getElementById("reviewSubmitBtn");
const reviewCancelBtn = document.getElementById("reviewCancelBtn");
const reviewInfoText = document.getElementById("reviewInfoText");

// Modal para ver reseñas
const viewReviewsModal = document.getElementById("viewReviewsModal");
const viewReviewsModalBackdrop = document.getElementById("viewReviewsModalBackdrop");
const viewReviewsModalCloseBtn = document.getElementById("viewReviewsModalCloseBtn");
const viewReviewsContainer = document.getElementById("viewReviewsContainer");

// Modal de detalles del contratista
const contractorDetailModal = document.getElementById("contractorDetailModal");
const contractorDetailBackdrop = document.getElementById("contractorDetailBackdrop");
const contractorDetailDialog = document.getElementById("contractorDetailDialog");
const contractorDetailCloseBtn = document.getElementById("contractorDetailCloseBtn");
const contractorDetailName = document.getElementById("contractorDetailName");
const contractorDetailEspecialidad = document.getElementById("contractorDetailEspecialidad");
const contractorDetailServicios = document.getElementById("contractorDetailServicios");
const contractorDetailZona = document.getElementById("contractorDetailZona");
const contractorDetailDescripcion = document.getElementById("contractorDetailDescripcion");
const contractorDetailRating = document.getElementById("contractorDetailRating");
const contractorDetailTotalReviews = document.getElementById("contractorDetailTotalReviews");
const contractorDetailPortfolio = document.getElementById("contractorDetailPortfolio");
const contractorDetailGallery = document.getElementById("contractorDetailGallery");
const contractorDetailViewReviewsBtn = document.getElementById("contractorDetailViewReviewsBtn");
const contractorDetailLeaveReviewBtn = document.getElementById("contractorDetailLeaveReviewBtn");
const contractorDetailContactBtn = document.getElementById("contractorDetailContactBtn");
const contractorDetailContactOptions = document.getElementById("contractorDetailContactOptions");
const contractorDetailContactButtonsContainer = document.getElementById("contractorDetailContactButtonsContainer");

const requestMessage = document.getElementById("requestMessage");

let currentUser = null;
let currentRole = "guest";
let editingPortfolioId = null;
let myPortfolioJobs = [];

let imageViewer = null;
let imageViewerMain = null;
let imageViewerTitle = null;
let imageViewerCounter = null;
let imageViewerPrevBtn = null;
let imageViewerNextBtn = null;
let imageViewerCloseBtn = null;
let viewerImages = [];
let viewerIndex = 0;

initMobileNav();
initAuthUserMenu();

async function getCurrentUserRole(user) {
  if (!user) return "guest";
  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (!userSnap.exists()) return "guest";
    return userSnap.data().rol || "guest";
  } catch (error) {
    return "guest";
  }
}

function setProfileAvailabilityByRole() {
  if (!profileForm && !userProfileForm) return;

  const isGuest = currentRole === "guest";
  const isContractor = currentRole === "contratista";

  if (userRoleBadge) {
    const label = {
      guest: "Invitado",
      cliente: "Cliente",
      contratista: "Contratista",
      admin: "Administrador"
    }[currentRole] || currentRole;
    userRoleBadge.textContent = label;
  }

  if (userProfileForm) {
    const userControls = userProfileForm.querySelectorAll("input, select, button");
    userControls.forEach((el) => {
      if (el.id === "userEmail") return;
      el.disabled = isGuest;
    });

    if (userProfileMessage) {
      userProfileMessage.textContent = isGuest ? "Inicia sesion para completar tu perfil." : "";
      userProfileMessage.classList.remove("error");
    }
  }

  if (profileForm) {
    const contractorControls = profileForm.querySelectorAll("input, select, textarea, button");
    contractorControls.forEach((el) => {
      el.disabled = !isContractor;
    });
  }

  if (!isContractor) {
    if (roleNotice) {
      roleNotice.hidden = false;
      roleNotice.textContent = isGuest
        ? "Debes iniciar sesion para editar un perfil de contratista."
        : currentRole === "admin"
          ? "Tu cuenta es administrador. Usa el Dashboard Admin para la gestion global."
          : "Tu cuenta es de cliente. No puedes editar el perfil de contratista.";
    }
    if (profileMessage) {
      profileMessage.textContent = isGuest
        ? "Inicia sesion para continuar."
        : "Como usuario no contratista, este bloque solo es de lectura.";
      profileMessage.classList.remove("error");
    }
    if (contractorProfileSection) contractorProfileSection.hidden = true;
    if (contractorCatalogSection) contractorCatalogSection.hidden = true;
    if (subscriptionSection) subscriptionSection.hidden = true;
    return;
  }

  if (roleNotice) roleNotice.hidden = true;
  if (contractorProfileSection) contractorProfileSection.hidden = false;
  if (contractorCatalogSection) contractorCatalogSection.hidden = false;
  if (subscriptionSection) subscriptionSection.hidden = false;
}

function setPortfolioMessage(text, isError = false) {
  if (!portfolioMessage) return;
  portfolioMessage.textContent = text;
  portfolioMessage.classList.toggle("error", isError);

  if (isError) {
    notifyError(text);
    return;
  }
  notifyInfo(text);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setPortfolioModalOpen(isOpen) {
  if (!portfolioModal) return;
  portfolioModal.hidden = !isOpen;
  document.body.style.overflow = isOpen ? "hidden" : "";

  if (isOpen) {
    window.setTimeout(() => {
      portfolioTitulo?.focus();
    }, 0);
  }
}

function setImageViewerOpen(isOpen) {
  if (!imageViewer) return;
  imageViewer.hidden = !isOpen;
  document.body.style.overflow = isOpen ? "hidden" : "";
}

function normalizeUrl(url) {
  try {
    return new URL(url).toString();
  } catch (error) {
    return String(url || "").trim();
  }
}

function setReviewModalOpen(isOpen, contractorId = null, contractorName = null) {
  if (!reviewModal) return;
  reviewModal.hidden = !isOpen;
  document.body.style.overflow = isOpen ? "hidden" : "";

  if (isOpen) {
    if (contractorId) {
      reviewContractorId.value = contractorId;
      reviewJobId.value = "";
      reviewStars.value = "0";
      reviewComment.value = "";
      reviewMessage.textContent = "";
      reviewMessage.classList.remove("error");
      if (reviewInfoText) {
        reviewInfoText.textContent = `Dejar reseña a: ${contractorName || "Contratista"}`;
      }

      // Renderizar selector de estrellas interactivo
      if (reviewStarsContainer) {
        reviewStarsContainer.innerHTML = renderInteractiveStars();
        setupStarSelection();
      }
    }

    window.setTimeout(() => {
      reviewComment?.focus();
    }, 0);
  }
}

function setupStarSelection() {
  const starBtns = document.querySelectorAll(".stars-interactive .star-btn");
  starBtns.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      const value = Number(btn.dataset.value);
      reviewStars.value = value;

      // Actualizar visualización de estrellas seleccionadas
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
  });

  const container = document.querySelector(".stars-interactive");
  if (container) {
    container.addEventListener("mouseleave", () => {
      starBtns.forEach((btn) => {
        btn.classList.remove("hovered");
      });
    });
  }
}

function setContractorDetailModalOpen(isOpen, contractor = null) {
  if (!contractorDetailModal) return;
  contractorDetailModal.hidden = !isOpen;
  document.body.style.overflow = isOpen ? "hidden" : "";

  if (isOpen && contractor) {
    // Información básica
    contractorDetailName.textContent = contractor.nombreVisible || "Sin nombre";
    contractorDetailEspecialidad.textContent = contractor.especialidad || "N/A";
    contractorDetailServicios.textContent = contractor.servicios || contractor.especialidad || "N/A";
    contractorDetailZona.textContent = contractor.zona || "N/A";
    contractorDetailDescripcion.textContent = contractor.descripcion || "Sin descripción";
    
    // Rating
    const starsHtml = renderStars(contractor.ratingPromedio || 0);
    contractorDetailRating.innerHTML = starsHtml + ` ${contractor.ratingPromedio || 0}`;
    contractorDetailTotalReviews.textContent = `(${contractor.totalResenas || 0} reseña${contractor.totalResenas !== 1 ? 's' : ''})`;

    // Botones de acción
    contractorDetailViewReviewsBtn.dataset.contractorId = contractor.id;
    contractorDetailViewReviewsBtn.dataset.contractorName = contractor.nombreVisible || "Contratista";
    contractorDetailLeaveReviewBtn.dataset.contractorId = contractor.id;
    contractorDetailLeaveReviewBtn.dataset.contractorName = contractor.nombreVisible || "Contratista";
    contractorDetailContactBtn.dataset.contractorId = contractor.id;
    contractorDetailContactBtn.dataset.contractorName = contractor.nombreVisible || "Contratista";
    contractorDetailContactBtn.dataset.servicio = contractor.servicios || contractor.especialidad || "Servicio general";

    // Galería de trabajos
    if (contractor.jobs && contractor.jobs.length > 0) {
      contractorDetailPortfolio.style.display = "block";
      contractorDetailGallery.innerHTML = contractor.jobs.map(job => {
        const mainImage = job.imagenes?.length > 0 ? job.imagenes[0] : "";
        return mainImage ? `
          <div class="gallery-item">
            <img src="${mainImage}" alt="${escapeHtml(job.titulo)}" />
            <p class="gallery-item-title">${escapeHtml(job.titulo)}</p>
            <p class="gallery-item-date">${new Date(job.fechaTrabajo).toLocaleDateString("es-ES")}</p>
          </div>
        ` : "";
      }).join("");
    } else {
      contractorDetailPortfolio.style.display = "none";
    }

    // Opciones de contacto
    if (contractor.telefono && currentRole !== "guest") {
      contractorDetailContactOptions.style.display = "block";
      contractorDetailContactButtonsContainer.innerHTML = `
        <a href="https://wa.me/${contractor.telefono.replace(/[^0-9]/g, "")}?text=Hola,%20me%20interesa%20tu%20servicio%20de%20${encodeURIComponent(contractor.especialidad || "contratación")}" 
           target="_blank" 
           rel="noopener noreferrer"
           class="btn small"
           style="margin-right: 8px;"
           title="Contactar por WhatsApp">
          📱 WhatsApp
        </a>
        <a href="tel:${contractor.telefono.replace(/[^0-9+]/g, "")}" 
           class="btn small"
           title="Llamar directamente">
          ☎️ Llamar
        </a>
      `;
    } else {
      contractorDetailContactOptions.style.display = "none";
    }

    // Adaptar botones según rol
    if (currentRole === "guest") {
      contractorDetailLeaveReviewBtn.disabled = true;
      contractorDetailLeaveReviewBtn.title = "Inicia sesión para dejar reseña";
      contractorDetailLeaveReviewBtn.textContent = "⭐ Inicia sesión";
      contractorDetailContactBtn.hidden = true;
      contractorDetailViewReviewsBtn.disabled = false;
    } else {
      contractorDetailLeaveReviewBtn.disabled = false;
      contractorDetailLeaveReviewBtn.title = "Dejar tu opinión";
      contractorDetailLeaveReviewBtn.textContent = "⭐ Dejar reseña";
      contractorDetailContactBtn.hidden = false;
      contractorDetailViewReviewsBtn.disabled = false;
    }
  }
}

function renderImageViewer() {
  if (!imageViewerMain || !imageViewerCounter || !viewerImages.length) return;
  const currentUrl = viewerImages[viewerIndex];
  imageViewerMain.src = currentUrl;
  imageViewerMain.alt = `Imagen ${viewerIndex + 1} de ${viewerImages.length}`;
  imageViewerCounter.textContent = `${viewerIndex + 1} / ${viewerImages.length}`;
}

function ensureImageViewer() {
  if (imageViewer) return;

  imageViewer = document.createElement("div");
  imageViewer.id = "portfolioImageViewer";
  imageViewer.className = "app-modal image-viewer";
  imageViewer.hidden = true;
  imageViewer.innerHTML = `
    <div class="app-modal-backdrop"></div>
    <section class="app-modal-dialog card image-viewer-dialog" role="dialog" aria-modal="true" aria-labelledby="imageViewerTitle">
      <div class="app-modal-header">
        <h3 id="imageViewerTitle">Tamano real</h3>
        <button id="imageViewerCloseBtn" class="btn secondary" type="button" aria-label="Cerrar">X</button>
      </div>
      <div class="image-viewer-stage">
        <button id="imageViewerPrevBtn" class="image-viewer-nav prev" type="button" aria-label="Imagen anterior">&#8249;</button>
        <img id="imageViewerMain" class="image-viewer-main" src="" alt="Imagen en tamano real" loading="lazy" />
        <button id="imageViewerNextBtn" class="image-viewer-nav next" type="button" aria-label="Imagen siguiente">&#8250;</button>
      </div>
      <p id="imageViewerCounter" class="image-viewer-counter"></p>
    </section>
  `;

  document.body.appendChild(imageViewer);

  imageViewerMain = document.getElementById("imageViewerMain");
  imageViewerTitle = document.getElementById("imageViewerTitle");
  imageViewerCounter = document.getElementById("imageViewerCounter");
  imageViewerPrevBtn = document.getElementById("imageViewerPrevBtn");
  imageViewerNextBtn = document.getElementById("imageViewerNextBtn");
  imageViewerCloseBtn = document.getElementById("imageViewerCloseBtn");

  imageViewerCloseBtn?.addEventListener("click", () => {
    setImageViewerOpen(false);
  });

  imageViewerPrevBtn?.addEventListener("click", () => {
    if (!viewerImages.length) return;
    viewerIndex = (viewerIndex - 1 + viewerImages.length) % viewerImages.length;
    renderImageViewer();
  });

  imageViewerNextBtn?.addEventListener("click", () => {
    if (!viewerImages.length) return;
    viewerIndex = (viewerIndex + 1) % viewerImages.length;
    renderImageViewer();
  });
}

function openImageViewer(images, startUrl, title) {
  const normalized = (images || [])
    .map((item) => normalizeUrl(item))
    .filter(Boolean);

  if (!normalized.length) return;

  ensureImageViewer();
  viewerImages = normalized;

  const start = normalizeUrl(startUrl);
  const startIndex = normalized.findIndex((img) => normalizeUrl(img) === start);
  viewerIndex = startIndex >= 0 ? startIndex : 0;

  if (imageViewerTitle) {
    imageViewerTitle.textContent = title || "Tamano real";
  }

  renderImageViewer();
  setImageViewerOpen(true);
}

function parseImageUrls(rawText) {
  const rawLines = String(rawText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  function normalizeImageUrl(line) {
    const parsed = new URL(line);

    // Google Images result links are not direct images; use imgurl when present.
    if (parsed.hostname.includes("google.") && parsed.pathname === "/imgres") {
      const embeddedImageUrl = parsed.searchParams.get("imgurl");
      if (embeddedImageUrl) {
        return new URL(embeddedImageUrl).toString();
      }
    }

    return parsed.toString();
  }

  const urls = [];
  for (const line of rawLines) {
    try {
      const normalized = normalizeImageUrl(line);
      const u = new URL(normalized);
      if (!["http:", "https:"].includes(u.protocol)) {
        throw new Error("URL no valida");
      }
      urls.push(u.toString());
    } catch (error) {
      throw new Error(`URL de imagen invalida: ${line}`);
    }
  }
  return urls;
}

function resetPortfolioForm() {
  if (!portfolioForm) return;
  editingPortfolioId = null;
  portfolioForm.reset();
  if (portfolioSaveBtn) portfolioSaveBtn.textContent = "Guardar trabajo";
  if (portfolioCancelEditBtn) portfolioCancelEditBtn.hidden = true;
  if (portfolioModalTitle) portfolioModalTitle.textContent = "Nuevo trabajo";
}

function renderPortfolioJobs() {
  if (!portfolioList) return;
  if (!myPortfolioJobs.length) {
    portfolioList.innerHTML = "<p>Aun no tienes trabajos cargados en el catalogo.</p>";
    return;
  }

  const html = myPortfolioJobs
    .sort((a, b) => String(b.fechaTrabajo || "").localeCompare(String(a.fechaTrabajo || "")))
    .map((job) => {
      const safeTitle = escapeHtml(job.titulo || "Trabajo");
      const safeDate = escapeHtml(job.fechaTrabajo || "N/A");
      const safeDescription = escapeHtml(job.descripcion || "Sin descripcion");
      const jobImages = Array.isArray(job.imagenes) ? job.imagenes.filter(Boolean) : [];
      const galleryPreview = jobImages.slice(0, 6).map((url, index) => {
        const safeUrl = escapeHtml(url);
        const alt = `${safeTitle} - imagen ${index + 1}`;
        return `
          <button
            class="portfolio-thumb-btn"
            type="button"
            data-thumb-url="${safeUrl}"
            data-thumb-alt="${escapeHtml(alt)}"
            title="Usar imagen ${index + 1} como principal"
          >
            <img class="portfolio-thumb-mini" src="${safeUrl}" alt="${alt}" loading="lazy" />
          </button>
        `;
      }).join("");

      const remainingCount = jobImages.length > 6 ? jobImages.length - 6 : 0;
      const galleryHtml = jobImages.length
        ? `
          <div class="portfolio-gallery" aria-label="Galeria de imagenes de ${safeTitle}">
            <div class="portfolio-main-media">
              <img
                class="portfolio-main-image"
                src="${escapeHtml(jobImages[0])}"
                alt="Imagen principal de ${safeTitle}"
                loading="lazy"
              />
              <button
                class="portfolio-view-original-btn"
                type="button"
                data-open-original-url="${escapeHtml(jobImages[0])}"
              >Tamano real</button>
            </div>
            <div class="portfolio-thumbs">
              ${galleryPreview}
              ${remainingCount ? `<span class="portfolio-more">+${remainingCount}</span>` : ""}
            </div>
          </div>
        `
        : "<p class=\"portfolio-no-images\">Sin imagenes cargadas.</p>";

      return `
        <article class="card portfolio-item" data-job-id="${job.id}">
          ${galleryHtml}
          <h3>${safeTitle}</h3>
          <p><strong>Fecha:</strong> ${safeDate}</p>
          <p>${safeDescription}</p>
          <div class="inline-actions">
            <button class="btn secondary portfolio-edit-btn" type="button" data-edit-id="${job.id}">Editar</button>
            <button class="btn portfolio-delete-btn" type="button" data-delete-id="${job.id}">Eliminar</button>
          </div>
        </article>
      `;
    })
    .join("");

  portfolioList.innerHTML = html;
}

async function loadPortfolioJobs() {
  if (!portfolioList) return;
  if (currentRole !== "contratista") {
    portfolioList.innerHTML = "<p>Solo cuentas de contratista pueden gestionar catalogo.</p>";
    return;
  }

  portfolioList.innerHTML = "<p>Cargando trabajos...</p>";
  try {
    myPortfolioJobs = await getMyPortfolioJobs(100);
    renderPortfolioJobs();
  } catch (error) {
    portfolioList.innerHTML = `<p>No se pudo cargar tu catalogo: ${asMessage(error)}</p>`;
  }
}

function startEditPortfolioJob(jobId) {
  const job = myPortfolioJobs.find((item) => item.id === jobId);
  if (!job || !portfolioForm) return;

  editingPortfolioId = job.id;
  portfolioTitulo.value = job.titulo || "";
  portfolioFecha.value = job.fechaTrabajo || "";
  portfolioDescripcion.value = job.descripcion || "";
  portfolioImagenes.value = Array.isArray(job.imagenes) ? job.imagenes.join("\n") : "";
  if (portfolioSaveBtn) portfolioSaveBtn.textContent = "Actualizar trabajo";
  if (portfolioCancelEditBtn) portfolioCancelEditBtn.hidden = false;
  if (portfolioModalTitle) portfolioModalTitle.textContent = "Editar trabajo";
  setPortfolioModalOpen(true);
  setPortfolioMessage("Editando trabajo seleccionado.");
}

async function loadUserProfileData(user) {
  if (!user || !userProfileForm) return;

  const nombreInput = document.getElementById("userNombre");
  const emailInput = document.getElementById("userEmail");
  const cedulaInput = document.getElementById("userCedula");
  const telefonoInput = document.getElementById("userTelefono");
  const zonaInput = document.getElementById("userZona");

  emailInput.value = user.email || "";

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const data = userSnap.exists() ? userSnap.data() : {};

    nombreInput.value = data.nombre || "";
    cedulaInput.value = data.cedula || "";
    telefonoInput.value = data.telefono || "";
    zonaInput.value = data.zona || "";
  } catch (error) {
    if (userProfileMessage) {
      userProfileMessage.textContent = `No se pudo cargar tu perfil: ${asMessage(error)}`;
      userProfileMessage.classList.add("error");
    }
  }
}

async function loadContractorProfileData(user) {
  if (!user || !profileForm) return;

  const contractorSnap = await getDoc(doc(db, "contractors", user.uid));
  if (!contractorSnap.exists()) return;

  const contractor = contractorSnap.data();
  document.getElementById("nombreVisible").value = contractor.nombreVisible || "";
  document.getElementById("especialidad").value = contractor.especialidad || "";
  document.getElementById("servicios").value = contractor.servicios || "";
  document.getElementById("zona").value = contractor.zona || "";
  document.getElementById("descripcion").value = contractor.descripcion || "";
}

async function loadContractors(filters = {}) {
  if (!listEl) return;

  listEl.innerHTML = "<p>Cargando contratistas...</p>";
  try {
    // Cargar todos los contratistas de la base de datos
    const snap = await getDocs(query(collection(db, "contractors"), limit(100)));
    let allContractors = snap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id
    }));

    // Aplicar búsqueda fuzzy si hay filtros
    if (filters.especialidad || filters.zona) {
      allContractors = searchContractors(allContractors, {
        especialidad: filters.especialidad || "",
        zona: filters.zona || ""
      });
    }

    const cards = [];

    for (const item of allContractors) {
      const data = item;
      
      // Cargar trabajos públicos del contratista
      const jobs = await getPublicPortfolioJobs(item.id, 10);
      
      // Guardar trabajos en el objeto para usarlos en el modal
      data.jobs = jobs;

      // Generar estrellas HTML
      const starsHtml = renderStars(data.ratingPromedio || 0);
      const ratingValue = Number(data.ratingPromedio || 0);
      const ratingIndicator = ratingValue > 0
        ? `<span class="rating-value">${ratingValue.toFixed(1)}</span>`
        : `<span class="rating-icon" aria-label="Sin calificación">★</span>`;

      // Crear card compacta clickeable
      cards.push(`
        <article class="card contractor-card card-clickable compact" data-contractor-id="${item.id}">
          <h3>${escapeHtml(data.nombreVisible || "Sin nombre")}</h3>
          <div class="contractor-meta">
            <span class="especialidad">${escapeHtml(data.especialidad || "N/A")}</span>
            <span class="reviews-count">${data.totalResenas || 0} reseña${data.totalResenas !== 1 ? 's' : ''}</span>
          </div>
          <div class="stars-row">
            ${starsHtml}
            ${ratingIndicator}
          </div>
          <p class="contractor-description">${escapeHtml(data.descripcion || "Sin descripción")}</p>
        </article>
      `);
    }

    if (cards.length === 0) {
      listEl.innerHTML = "<p>No hay contratistas que coincidan con tu búsqueda. Intenta con otros términos.</p>";
    } else {
      listEl.innerHTML = cards.join("");
    }
  } catch (error) {
    listEl.innerHTML = `<p>Error cargando contratistas: ${asMessage(error)}</p>`;
  }
}

async function loadSubscription() {
  if (!subscriptionInfo) return;
  subscriptionInfo.innerHTML = "<p>Cargando suscripcion...</p>";

  const user = auth.currentUser;
  if (!user) {
    subscriptionInfo.innerHTML = "<p>Inicia sesion para ver tu plan.</p>";
    return;
  }

  const subQ = query(collection(db, "subscriptions"), where("userId", "==", user.uid), limit(1));
  const subSnap = await getDocs(subQ);

  if (subSnap.empty) {
    subscriptionInfo.innerHTML = "<p>Plan actual: Gratis</p>";
    return;
  }

  const sub = subSnap.docs[0].data();
  const planId = sub.planId || "gratis";
  const planRef = await getDoc(doc(db, "plans", planId));
  const plan = planRef.exists() ? planRef.data() : null;

  subscriptionInfo.innerHTML = `
    <p><strong>Plan:</strong> ${planId}</p>
    <p><strong>Estado:</strong> ${sub.estado || "N/A"}</p>
    <p><strong>Max trabajos:</strong> ${plan?.maxTrabajosCatalogo ?? "N/A"}</p>
    <p><strong>Max imagenes por trabajo:</strong> ${plan?.maxImagenesPorTrabajo ?? "N/A"}</p>
  `;
}

async function ensureDefaultPlans() {
  const defaults = [
    { id: "gratis", precioMensual: 0, maxTrabajosCatalogo: 3, maxImagenesPorTrabajo: 3, destacadoEnBusquedas: false },
    { id: "basico", precioMensual: 4.99, maxTrabajosCatalogo: 10, maxImagenesPorTrabajo: 6, destacadoEnBusquedas: false },
    { id: "intermedio", precioMensual: 12.99, maxTrabajosCatalogo: 30, maxImagenesPorTrabajo: 12, destacadoEnBusquedas: true },
    { id: "premium", precioMensual: 24.99, maxTrabajosCatalogo: 100, maxImagenesPorTrabajo: 20, destacadoEnBusquedas: true }
  ];

  for (const plan of defaults) {
    await setDoc(doc(db, "plans", plan.id), {
      nombre: plan.id,
      moneda: "USD",
      soportePrioritario: plan.id === "premium",
      activo: true,
      ...plan
    }, { merge: true });
  }
}

if (filterBtn) {
  filterBtn.addEventListener("click", () => {
    const especialidad = document.getElementById("filterEspecialidad").value.trim();
    const zona = document.getElementById("filterZona").value.trim();
    loadContractors({ especialidad, zona });
  });
}

// Permitir buscar presionando Enter en los campos de filtro
const filterEspecialidadInput = document.getElementById("filterEspecialidad");
const filterZonaInput = document.getElementById("filterZona");

if (filterEspecialidadInput) {
  filterEspecialidadInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      filterBtn?.click();
    }
  });
}

if (filterZonaInput) {
  filterZonaInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      filterBtn?.click();
    }
  });
}

if (profileForm) {
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (currentRole !== "contratista") {
      profileMessage.textContent = "Solo los contratistas pueden guardar este perfil.";
      profileMessage.classList.add("error");
      return;
    }

    const nombreVisible = document.getElementById("nombreVisible").value.trim();
    const especialidad = document.getElementById("especialidad").value.trim();
    const servicios = document.getElementById("servicios").value.trim();
    const zona = document.getElementById("zona").value.trim();
    const descripcion = document.getElementById("descripcion").value.trim();

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Debes iniciar sesion para guardar perfil.");

      await setDoc(doc(db, "contractors", user.uid), {
        nombreVisible,
        especialidad,
        servicios,
        zona,
        descripcion,
        ratingPromedio: 0,
        totalResenas: 0,
        actualizadoEn: serverTimestamp(),
        creadoEn: serverTimestamp()
      }, { merge: true });

      profileMessage.textContent = "Perfil guardado correctamente.";
      profileMessage.classList.remove("error");
      notifySuccess("Perfil de contratista guardado correctamente.");
    } catch (error) {
      profileMessage.textContent = asMessage(error);
      profileMessage.classList.add("error");
      notifyError(asMessage(error));
    }
  });
}

if (userProfileForm) {
  userProfileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      userProfileMessage.textContent = "Debes iniciar sesion para guardar tus datos.";
      userProfileMessage.classList.add("error");
      return;
    }

    const nombre = document.getElementById("userNombre").value.trim();
    const cedula = document.getElementById("userCedula").value.trim();
    const telefono = document.getElementById("userTelefono").value.trim();
    const zona = document.getElementById("userZona").value.trim();

    try {
      await setDoc(doc(db, "users", user.uid), {
        nombre,
        cedula,
        telefono,
        zona,
        email: user.email || "",
        rol: currentRole,
        actualizadoEn: serverTimestamp()
      }, { merge: true });

      userProfileMessage.textContent = "Tus datos se guardaron correctamente.";
      userProfileMessage.classList.remove("error");
      notifySuccess("Tus datos se guardaron correctamente.");
    } catch (error) {
      userProfileMessage.textContent = asMessage(error);
      userProfileMessage.classList.add("error");
      notifyError(asMessage(error));
    }
  });
}

if (portfolioForm) {
  portfolioForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (currentRole !== "contratista") {
      setPortfolioMessage("Solo los contratistas pueden gestionar el catalogo.", true);
      return;
    }

    try {
      const payload = {
        titulo: portfolioTitulo.value.trim(),
        fechaTrabajo: portfolioFecha.value,
        descripcion: portfolioDescripcion.value.trim(),
        imagenes: parseImageUrls(portfolioImagenes.value)
      };

      if (!payload.titulo || !payload.fechaTrabajo || !payload.descripcion) {
        throw new Error("Completa titulo, fecha y descripcion.");
      }

      if (editingPortfolioId) {
        await updatePortfolioJob(editingPortfolioId, payload);
        setPortfolioMessage("Trabajo actualizado correctamente.");
      } else {
        await createPortfolioJob(payload);
        setPortfolioMessage("Trabajo agregado al catalogo.");
      }

      resetPortfolioForm();
      setPortfolioModalOpen(false);
      await loadPortfolioJobs();
    } catch (error) {
      setPortfolioMessage(asMessage(error), true);
    }
  });
}

if (openPortfolioModalBtn) {
  openPortfolioModalBtn.addEventListener("click", () => {
    resetPortfolioForm();
    setPortfolioModalOpen(true);
  });
}

if (portfolioModalCloseBtn) {
  portfolioModalCloseBtn.addEventListener("click", () => {
    setPortfolioModalOpen(false);
  });
}

if (portfolioModal) {
  if (portfolioModalDialog) {
    portfolioModalDialog.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }
}

if (portfolioCancelEditBtn) {
  portfolioCancelEditBtn.addEventListener("click", () => {
    resetPortfolioForm();
    setPortfolioMessage("Edicion cancelada.");
  });
}

if (portfolioList) {
  portfolioList.addEventListener("click", async (event) => {
    const thumbBtn = event.target.closest(".portfolio-thumb-btn");
    if (thumbBtn) {
      const card = thumbBtn.closest(".portfolio-item");
      const mainImage = card?.querySelector(".portfolio-main-image");
      const originalBtn = card?.querySelector(".portfolio-view-original-btn");
      const newUrl = thumbBtn.dataset.thumbUrl;
      const newAlt = thumbBtn.dataset.thumbAlt || "Imagen principal";

      if (mainImage && newUrl) {
        mainImage.src = newUrl;
        mainImage.alt = newAlt;
      }
      if (originalBtn && newUrl) {
        originalBtn.dataset.openOriginalUrl = newUrl;
      }
      return;
    }

    const viewOriginalBtn = event.target.closest(".portfolio-view-original-btn");
    if (viewOriginalBtn) {
      const card = viewOriginalBtn.closest(".portfolio-item");
      const jobId = card?.dataset.jobId;
      const job = myPortfolioJobs.find((item) => item.id === jobId);
      const activeImageUrl = viewOriginalBtn.dataset.openOriginalUrl;
      const jobTitle = job?.titulo ? `Tamano real - ${job.titulo}` : "Tamano real";

      if (job?.imagenes?.length) {
        openImageViewer(job.imagenes, activeImageUrl, jobTitle);
      }
      return;
    }

    const editBtn = event.target.closest(".portfolio-edit-btn");
    if (editBtn) {
      startEditPortfolioJob(editBtn.dataset.editId);
      return;
    }

    const deleteBtn = event.target.closest(".portfolio-delete-btn");
    if (!deleteBtn) return;

    if (!window.confirm("Quieres eliminar este trabajo del catalogo?")) {
      return;
    }

    try {
      await deletePortfolioJob(deleteBtn.dataset.deleteId);
      if (editingPortfolioId === deleteBtn.dataset.deleteId) {
        resetPortfolioForm();
      }
      setPortfolioMessage("Trabajo eliminado correctamente.");
      await loadPortfolioJobs();
    } catch (error) {
      setPortfolioMessage(`No se pudo eliminar: ${asMessage(error)}`, true);
    }
  });
}

if (listEl) {
  listEl.addEventListener("click", async (event) => {
    // Manejar clic en botón "Dejar reseña"
    const reviewBtn = event.target.closest(".leave-review-btn");
    if (reviewBtn) {
      if (!currentUser) {
        window.location.href = "./login.html";
        return;
      }

      if (currentRole !== "cliente" && currentRole !== "admin") {
        if (reviewMessage) {
          reviewMessage.textContent = "Solo clientes pueden dejar reseñas.";
          reviewMessage.classList.add("error");
        }
        return;
      }

      const contractorId = reviewBtn.dataset.contractorId;
      const contractorName = reviewBtn.dataset.contractorName;
      setReviewModalOpen(true, contractorId, contractorName);
      return;
    }

    // Manejar clic en botón "Ver reseñas"
    const viewReviewsBtn = event.target.closest(".view-reviews-btn");
    if (viewReviewsBtn) {
      const contractorId = viewReviewsBtn.dataset.contractorId;
      const contractorName = viewReviewsBtn.dataset.contractorName;
      setViewReviewsModalOpen(true, contractorId, contractorName);
      return;
    }

    // Manejar clic en botón de contacta (nuevo)
    const contactBtn = event.target.closest(".contact-contractor-btn");
    if (contactBtn) {
      if (!currentUser) {
        // Redirigir a login si no está autenticado
        window.location.href = "./login.html";
        return;
      }

      if (!["cliente", "admin"].includes(currentRole)) {
        if (requestMessage) {
          requestMessage.textContent = "Solo un usuario cliente o admin puede contactar contratistas.";
          requestMessage.classList.add("error");
        }
        return;
      }

      const contractorId = contactBtn.dataset.contractorId;
      const contractorName = contactBtn.dataset.contractorName || "Contratista";
      const servicio = contactBtn.dataset.servicio || "Servicio";
      const detalle = window.prompt(`¿Qué servicio necesitas de ${contractorName}?\n\nServicio: ${servicio}`, "");

      if (detalle === null) return; // Usuario canceló

      try {
        await addDoc(collection(db, "service_requests"), {
          clientId: currentUser.uid,
          contractorId,
          servicioSolicitado: servicio,
          detalle: (detalle || "").trim(),
          estado: "pendiente",
          createdAt: serverTimestamp()
        });

        if (requestMessage) {
          requestMessage.textContent = `¡Solicitud enviada a ${contractorName}! Te contactarán pronto.`;
          requestMessage.classList.remove("error");
        }
        notifySuccess(`Contacto enviado a ${contractorName}`);
      } catch (error) {
        if (requestMessage) {
          requestMessage.textContent = `Error al enviar contacto: ${asMessage(error)}`;
          requestMessage.classList.add("error");
        }
        notifyError(asMessage(error));
      }
      return;
    }

    // Manejar clic en botón antiguo request-service-btn (mantener compatibilidad)
    const btn = event.target.closest(".request-service-btn");
    if (!btn) return;

    if (!currentUser) {
      if (requestMessage) {
        requestMessage.textContent = "Debes iniciar sesion como cliente para solicitar un servicio.";
        requestMessage.classList.add("error");
      }
      return;
    }

    if (!["cliente", "admin"].includes(currentRole)) {
      if (requestMessage) {
        requestMessage.textContent = "Solo un usuario cliente o admin puede solicitar servicios.";
        requestMessage.classList.add("error");
      }
      return;
    }

    const contractorId = btn.dataset.contractorId;
    const servicio = btn.dataset.servicio || "Servicio";
    const detalle = window.prompt("Describe brevemente lo que necesitas:", "");

    try {
      await addDoc(collection(db, "service_requests"), {
        clientId: currentUser.uid,
        contractorId,
        servicioSolicitado: servicio,
        detalle: (detalle || "").trim(),
        estado: "pendiente",
        createdAt: serverTimestamp()
      });

      if (requestMessage) {
        requestMessage.textContent = "Solicitud enviada correctamente al contratista.";
        requestMessage.classList.remove("error");
      }
    } catch (error) {
      if (requestMessage) {
        requestMessage.textContent = `No se pudo enviar la solicitud: ${asMessage(error)}`;
        requestMessage.classList.add("error");
      }
    }
  });
}

if (listEl) {
  listEl.addEventListener("click", async (event) => {
    // Manejar clic en botón "Dejar reseña"
    const reviewBtn = event.target.closest(".leave-review-btn");
    if (reviewBtn) {
      if (!currentUser) {
        window.location.href = "./login.html";
        return;
      }

      if (currentRole !== "cliente" && currentRole !== "admin") {
        reviewMessage.textContent = "Solo clientes pueden dejar reseñas.";
        reviewMessage.classList.add("error");
        return;
      }

      const contractorId = reviewBtn.dataset.contractorId;
      const contractorName = reviewBtn.dataset.contractorName;
      setReviewModalOpen(true, contractorId, contractorName);
      return;
    }

    // Manejar clic en botón "Ver reseñas"
    const viewReviewsBtn = event.target.closest(".view-reviews-btn");
    if (viewReviewsBtn) {
      const contractorId = viewReviewsBtn.dataset.contractorId;
      const contractorName = viewReviewsBtn.dataset.contractorName;
      setViewReviewsModalOpen(true, contractorId, contractorName);
      return;
    }

    // ... resto de manejadores existentes ...
  });
}

// Manejar envío de reseña
if (reviewForm) {
  reviewForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const contractorId = reviewContractorId.value;
    const estrellas = Number(reviewStars.value);
    const comentario = reviewComment.value.trim();

    if (estrellas < 1 || estrellas > 5) {
      reviewMessage.textContent = "Debes seleccionar una calificación de 1 a 5 estrellas.";
      reviewMessage.classList.add("error");
      return;
    }

    try {
      reviewSubmitBtn.disabled = true;
      reviewMessage.textContent = "Publicando reseña...";
      reviewMessage.classList.remove("error");

      await createReview({
        contractorId,
        estrellas,
        comentario,
        jobId: reviewJobId.value || ""
      });

      reviewMessage.textContent = "¡Reseña publicada exitosamente!";
      reviewMessage.classList.remove("error");
      notifySuccess("Reseña publicada. Gracias por tu opinión.");

      setTimeout(() => {
        setReviewModalOpen(false);
        if (listEl) {
          loadContractors();
        }
      }, 1000);
    } catch (error) {
      reviewMessage.textContent = `Error: ${asMessage(error)}`;
      reviewMessage.classList.add("error");
      notifyError(asMessage(error));
    } finally {
      reviewSubmitBtn.disabled = false;
    }
  });
}

// Manejar cierre de modal de reseña
if (reviewModalCloseBtn) {
  reviewModalCloseBtn.addEventListener("click", () => {
    setReviewModalOpen(false);
  });
}

if (reviewCancelBtn) {
  reviewCancelBtn.addEventListener("click", () => {
    setReviewModalOpen(false);
  });
}

if (reviewModalBackdrop) {
  reviewModalBackdrop.addEventListener("click", () => {
    setReviewModalOpen(false);
  });
}

// Función para abrir/cerrar modal de ver reseñas
function setViewReviewsModalOpen(isOpen, contractorId, contractorName) {
  if (!viewReviewsModal) return;

  if (isOpen) {
    viewReviewsModal.hidden = false;
    loadAndDisplayReviews(contractorId, contractorName);
  } else {
    viewReviewsModal.hidden = true;
    viewReviewsContainer.innerHTML = "";
  }
}

// Función para cargar y mostrar todas las reseñas
async function loadAndDisplayReviews(contractorId, contractorName) {
  if (!viewReviewsContainer) return;

  viewReviewsContainer.innerHTML = "<p>Cargando reseñas...</p>";

  try {
    const reviews = await getContractorReviews(contractorId, 100);

    if (reviews.length === 0) {
      viewReviewsContainer.innerHTML = "<p>No hay reseñas aún.</p>";
      return;
    }

    let html = "";
    reviews.forEach((review) => {
      const starsHtml = renderStars(review.estrellas);
      const fecha = review.fecha ? new Date(review.fecha.toDate()).toLocaleDateString("es-ES") : "Sin fecha";
      const comentarioHtml = review.comentario ? `<p class="review-comment">${escapeHtml(review.comentario)}</p>` : "";

      html += `
        <div class="review-item">
          <div class="review-header">
            <div>${starsHtml}</div>
            <small class="review-date">${fecha}</small>
          </div>
          ${comentarioHtml}
        </div>
      `;
    });

    viewReviewsContainer.innerHTML = html;
  } catch (error) {
    viewReviewsContainer.innerHTML = `<p>Error cargando reseñas: ${asMessage(error)}</p>`;
  }
}

// Manejar cierre de modal de ver reseñas
if (viewReviewsModalCloseBtn) {
  viewReviewsModalCloseBtn.addEventListener("click", () => {
    setViewReviewsModalOpen(false);
  });
}

if (viewReviewsModalBackdrop) {
  viewReviewsModalBackdrop.addEventListener("click", () => {
    setViewReviewsModalOpen(false);
  });
}

// Manejar modal de detalles del contratista
if (contractorDetailCloseBtn) {
  contractorDetailCloseBtn.addEventListener("click", () => {
    setContractorDetailModalOpen(false);
  });
}

if (contractorDetailBackdrop) {
  contractorDetailBackdrop.addEventListener("click", () => {
    setContractorDetailModalOpen(false);
  });
}

// Event listeners para botones del modal de detalles
if (contractorDetailViewReviewsBtn) {
  contractorDetailViewReviewsBtn.addEventListener("click", () => {
    const contractorId = contractorDetailViewReviewsBtn.dataset.contractorId;
    const contractorName = contractorDetailViewReviewsBtn.dataset.contractorName;
    setContractorDetailModalOpen(false);
    setViewReviewsModalOpen(true, contractorId, contractorName);
  });
}

if (contractorDetailLeaveReviewBtn) {
  contractorDetailLeaveReviewBtn.addEventListener("click", () => {
    if (!currentUser) {
      window.location.href = "./login.html";
      return;
    }

    if (currentRole !== "cliente" && currentRole !== "admin") {
      notifyError("Solo clientes pueden dejar reseñas.");
      return;
    }

    const contractorId = contractorDetailLeaveReviewBtn.dataset.contractorId;
    const contractorName = contractorDetailLeaveReviewBtn.dataset.contractorName;
    setContractorDetailModalOpen(false);
    setReviewModalOpen(true, contractorId, contractorName);
  });
}

if (contractorDetailContactBtn) {
  contractorDetailContactBtn.addEventListener("click", () => {
    if (!currentUser) {
      window.location.href = "./login.html";
      return;
    }

    if (!["cliente", "admin"].includes(currentRole)) {
      notifyError("Solo un usuario cliente o admin puede contactar contratistas.");
      return;
    }

    const contractorId = contractorDetailContactBtn.dataset.contractorId;
    const contractorName = contractorDetailContactBtn.dataset.contractorName;
    const servicio = contractorDetailContactBtn.dataset.servicio;
    const detalle = window.prompt(`¿Qué servicio necesitas de ${contractorName}?\n\nServicio: ${servicio}`, "");

    if (detalle === null) return; // Usuario canceló

    (async () => {
      try {
        const contactRef = await addDoc(collection(db, "contact_requests"), {
          clientId: currentUser.uid,
          contractorId,
          servicio,
          detalle,
          estado: "pendiente",
          creadoEn: serverTimestamp()
        });

        notifySuccess(`Solicitud enviada a ${contractorName}. ID: ${contactRef.id}`);
        setContractorDetailModalOpen(false);
      } catch (error) {
        notifyError(`Error al enviar solicitud: ${asMessage(error)}`);
      }
    })();
  });
}

// Event listener para click en cards compactas
if (listEl) {
  listEl.addEventListener("click", async (event) => {
    const cardElement = event.target.closest(".card-clickable");
    if (cardElement) {
      const contractorId = cardElement.dataset.contractorId;
      
      // Buscar el contratista en allContractors
      try {
        const contractorSnap = await getDoc(doc(db, "contractors", contractorId));
        if (contractorSnap.exists()) {
          const contractorData = contractorSnap.data();
          
          // Cargar trabajos del contratista
          const jobs = await getPublicPortfolioJobs(contractorId, 10);
          contractorData.jobs = jobs;
          contractorData.id = contractorId;
          
          // Abrir modal con detalles
          setContractorDetailModalOpen(true, contractorData);
        }
      } catch (error) {
        console.error("Error cargando detalles del contratista:", error);
        notifyError("Error al cargar detalles del contratista.");
      }
    }
  });
}

if (listEl) {
  loadContractors();
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  currentRole = await getCurrentUserRole(user);

  setProfileAvailabilityByRole();

  if (user) {
    await loadUserProfileData(user);
    if (currentRole === "contratista") {
      await loadContractorProfileData(user);
    }
  }

  if (listEl) {
    await loadContractors();
  }

  if (user && subscriptionInfo && currentRole === "contratista") {
    try {
      await ensureDefaultPlans();
      await loadSubscription();
    } catch (error) {
      subscriptionInfo.innerHTML = `<p>Error cargando plan: ${asMessage(error)}</p>`;
    }
  } else if (subscriptionInfo && currentRole !== "contratista") {
    subscriptionInfo.innerHTML = "<p>Solo cuentas de contratista gestionan suscripcion.</p>";
  }

  if (user && currentRole === "contratista") {
    if (openPortfolioModalBtn) openPortfolioModalBtn.disabled = false;
    await loadPortfolioJobs();
  } else if (portfolioList) {
    if (openPortfolioModalBtn) openPortfolioModalBtn.disabled = true;
    setPortfolioModalOpen(false);
    portfolioList.innerHTML = "<p>Solo cuentas de contratista pueden gestionar catalogo.</p>";
  }
});
