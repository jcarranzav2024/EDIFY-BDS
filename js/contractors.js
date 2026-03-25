import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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
  updatePortfolioJob
} from "./portfolio.js";
import { initHelpBot } from "./help-bot.js";

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

const requestMessage = document.getElementById("requestMessage");

const messageModal = document.getElementById("messageModal");
const messageModalBackdrop = document.getElementById("messageModalBackdrop");
const messageModalCloseBtn = document.getElementById("messageModalCloseBtn");
const messageForm = document.getElementById("messageForm");
const messageContractorId = document.getElementById("messageContractorId");
const messageSubject = document.getElementById("messageSubject");
const messageBody = document.getElementById("messageBody");

const contractorMessagesSection = document.getElementById("contractorMessagesSection");
const contractorMessagesNotice = document.getElementById("contractorMessagesNotice");
const contractorMessagesList = document.getElementById("contractorMessagesList");

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
initHelpBot();

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

function setMessageModalOpen(isOpen) {
  if (!messageModal) return;
  messageModal.hidden = !isOpen;
  document.body.style.overflow = isOpen ? "hidden" : "";
  if (isOpen) {
    window.setTimeout(() => {
      messageSubject?.focus();
    }, 0);
  }
}

function setRequestMessage(text, isError = false) {
  if (!requestMessage) return;
  requestMessage.textContent = text;
  requestMessage.classList.toggle("error", isError);
  if (isError) {
    notifyError(text);
  } else {
    notifyInfo(text);
  }
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = value?.toDate?.() || new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleString("es-CR", {
    dateStyle: "short",
    timeStyle: "short"
  });
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
    let q = query(collection(db, "contractors"), limit(30));
    if (filters.especialidad) {
      q = query(collection(db, "contractors"), where("especialidad", "==", filters.especialidad), limit(30));
    }

    const snap = await getDocs(q);
    const cards = [];

    snap.forEach((item) => {
      const data = item.data();
      if (filters.zona && String(data.zona || "").toLowerCase() !== filters.zona.toLowerCase()) {
        return;
      }

      const canRequest = ["cliente", "admin"].includes(currentRole);
      cards.push(`
        <article class="card">
          <h3>${data.nombreVisible || "Sin nombre"}</h3>
          <p><strong>Especialidad:</strong> ${data.especialidad || "N/A"}</p>
          <p><strong>Servicios:</strong> ${data.servicios || data.especialidad || "N/A"}</p>
          <p><strong>Zona:</strong> ${data.zona || "N/A"}</p>
          <p>${data.descripcion || "Sin descripcion"}</p>
          <p><strong>Rating:</strong> ${data.ratingPromedio || 0} (${data.totalResenas || 0} resenas)</p>
          ${canRequest ? `<button class="btn action-btn send-message-btn" type="button" data-contractor-id="${item.id}" data-servicio="${data.servicios || data.especialidad || "Servicio general"}">Contactar contratista</button>` : ""}
          <button class="btn secondary action-btn view-reviews-btn" type="button" data-contractor-id="${item.id}">Ver resenas</button>
        </article>
      `);
    });

    listEl.innerHTML = cards.length ? cards.join("") : "<p>No hay contratistas para ese filtro.</p>";
  } catch (error) {
    listEl.innerHTML = `<p>Error cargando contratistas: ${asMessage(error)}</p>`;
  }
}

async function loadRepliesForMessage(messageId) {
  const repliesQ = query(
    collection(db, "contractor_messages", messageId, "replies"),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  const repliesSnap = await getDocs(repliesQ);
  return repliesSnap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function loadContractorInbox() {
  if (!contractorMessagesList || !currentUser || currentRole !== "contratista") return;

  contractorMessagesList.innerHTML = "<p>Cargando mensajes...</p>";
  if (contractorMessagesNotice) {
    contractorMessagesNotice.hidden = false;
    contractorMessagesNotice.textContent = "Solo tu, el cliente remitente y admin pueden ver este contenido.";
  }

  try {
    const inboxQ = query(
      collection(db, "contractor_messages"),
      where("contractorId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(60)
    );

    const inboxSnap = await getDocs(inboxQ);
    if (inboxSnap.empty) {
      contractorMessagesList.innerHTML = "<p>No tienes mensajes de clientes por ahora.</p>";
      return;
    }

    const rows = await Promise.all(inboxSnap.docs.map(async (msgDoc) => {
      const data = msgDoc.data();
      const replies = await loadRepliesForMessage(msgDoc.id);
      const replyHtml = replies.length
        ? replies.map((reply) => {
          const who = reply.senderRole === "contratista" ? "Tu" : "Cliente";
          return `
            <p class="message-reply-row"><strong>${who}:</strong> ${escapeHtml(reply.message || "")}</p>
          `;
        }).join("")
        : "<p class=\"message-reply-row\">Aun no hay respuestas.</p>";

      return `
        <article class="card contractor-message-item" data-message-id="${msgDoc.id}">
          <h3>Cliente: ${escapeHtml(data.clientId || "N/A")}</h3>
          <p><strong>Asunto:</strong> ${escapeHtml(data.subject || "Sin asunto")}</p>
          <p>${escapeHtml(data.message || "")}</p>
          <p><strong>Estado:</strong> ${escapeHtml(data.status || "nuevo")}</p>
          <p><strong>Recibido:</strong> ${formatDate(data.createdAt)}</p>
          <div class="message-replies">${replyHtml}</div>
          <form class="grid form-grid contractor-reply-form" data-message-id="${msgDoc.id}">
            <textarea class="contractor-reply-input" rows="3" placeholder="Responder al cliente" required></textarea>
            <button class="btn" type="submit">Responder</button>
          </form>
          <div class="inline-actions">
            <button class="btn secondary mark-read-btn" type="button" data-mark-read-id="${msgDoc.id}">Marcar leido</button>
            <button class="btn secondary close-thread-btn" type="button" data-close-id="${msgDoc.id}">Cerrar hilo</button>
          </div>
        </article>
      `;
    }));

    contractorMessagesList.innerHTML = rows.join("");
  } catch (error) {
    contractorMessagesList.innerHTML = `<p>No se pudo cargar la bandeja: ${asMessage(error)}</p>`;
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

if (messageModalCloseBtn) {
  messageModalCloseBtn.addEventListener("click", () => {
    setMessageModalOpen(false);
  });
}

if (messageModalBackdrop) {
  messageModalBackdrop.addEventListener("click", () => {
    setMessageModalOpen(false);
  });
}

if (messageForm) {
  messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      setRequestMessage("Debes iniciar sesion para enviar mensajes.", true);
      return;
    }

    if (!["cliente", "admin"].includes(currentRole)) {
      setRequestMessage("Solo clientes registrados pueden enviar mensajes a contratistas.", true);
      return;
    }

    const contractorId = (messageContractorId?.value || "").trim();
    const subject = (messageSubject?.value || "").trim();
    const body = (messageBody?.value || "").trim();

    if (!contractorId || !subject || !body) {
      setRequestMessage("Completa contratista, asunto y mensaje.", true);
      return;
    }

    try {
      await addDoc(collection(db, "contractor_messages"), {
        contractorId,
        clientId: currentUser.uid,
        subject,
        message: body,
        status: "nuevo",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      messageForm.reset();
      if (messageContractorId) messageContractorId.value = contractorId;
      setMessageModalOpen(false);
      setRequestMessage("Mensaje enviado correctamente al contratista.");
    } catch (error) {
      setRequestMessage(`No se pudo enviar el mensaje: ${asMessage(error)}`, true);
    }
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
    const reviewsBtn = event.target.closest(".view-reviews-btn");
    if (reviewsBtn) {
      const contractorId = reviewsBtn.dataset.contractorId;
      const query = contractorId ? `?contractorId=${encodeURIComponent(contractorId)}` : "";
      window.location.href = `./resenas.html${query}`;
      return;
    }

    const messageBtn = event.target.closest(".send-message-btn");
    if (messageBtn) {
      if (!currentUser) {
        setRequestMessage("Debes iniciar sesion como cliente para contactar contratistas.", true);
        return;
      }

      if (!["cliente", "admin"].includes(currentRole)) {
        setRequestMessage("Solo cuentas de cliente registradas pueden enviar mensajes.", true);
        return;
      }

      const contractorId = messageBtn.dataset.contractorId;
      const servicio = messageBtn.dataset.servicio || "Servicio";
      if (messageContractorId) messageContractorId.value = contractorId;
      if (messageSubject) messageSubject.value = `Consulta sobre ${servicio}`;
      if (messageBody) messageBody.value = "";
      setMessageModalOpen(true);
      return;
    }

    const btn = event.target.closest(".request-service-btn");
    if (!btn) return;

    if (!currentUser) {
      setRequestMessage("Debes iniciar sesion como cliente para solicitar un servicio.", true);
      return;
    }

    if (!["cliente", "admin"].includes(currentRole)) {
      setRequestMessage("Solo un usuario cliente o admin puede solicitar servicios.", true);
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

      setRequestMessage("Solicitud enviada correctamente al contratista.");
    } catch (error) {
      setRequestMessage(`No se pudo enviar la solicitud: ${asMessage(error)}`, true);
    }
  });
}

if (contractorMessagesList) {
  contractorMessagesList.addEventListener("submit", async (event) => {
    const formEl = event.target.closest(".contractor-reply-form");
    if (!formEl) return;

    event.preventDefault();

    if (!currentUser || currentRole !== "contratista") {
      notifyError("Solo cuentas de contratista pueden responder mensajes.");
      return;
    }

    const messageId = formEl.dataset.messageId;
    const input = formEl.querySelector(".contractor-reply-input");
    const text = (input?.value || "").trim();
    if (!text) {
      notifyError("Escribe una respuesta antes de enviar.");
      return;
    }

    try {
      await addDoc(collection(db, "contractor_messages", messageId, "replies"), {
        senderId: currentUser.uid,
        senderRole: "contratista",
        message: text,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "contractor_messages", messageId), {
        status: "respondido",
        updatedAt: serverTimestamp()
      });

      notifySuccess("Respuesta enviada al cliente.");
      await loadContractorInbox();
    } catch (error) {
      notifyError(`No se pudo enviar la respuesta: ${asMessage(error)}`);
    }
  });

  contractorMessagesList.addEventListener("click", async (event) => {
    const markReadBtn = event.target.closest(".mark-read-btn");
    if (markReadBtn) {
      const messageId = markReadBtn.dataset.markReadId;
      try {
        await updateDoc(doc(db, "contractor_messages", messageId), {
          status: "leido",
          updatedAt: serverTimestamp()
        });
        notifySuccess("Mensaje marcado como leido.");
        await loadContractorInbox();
      } catch (error) {
        notifyError(`No se pudo actualizar estado: ${asMessage(error)}`);
      }
      return;
    }

    const closeBtn = event.target.closest(".close-thread-btn");
    if (!closeBtn) return;

    const messageId = closeBtn.dataset.closeId;
    try {
      await updateDoc(doc(db, "contractor_messages", messageId), {
        status: "cerrado",
        updatedAt: serverTimestamp()
      });
      notifySuccess("Hilo cerrado.");
      await loadContractorInbox();
    } catch (error) {
      notifyError(`No se pudo cerrar hilo: ${asMessage(error)}`);
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

  if (contractorMessagesSection) {
    contractorMessagesSection.hidden = currentRole !== "contratista";
  }

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
    await loadContractorInbox();
  } else if (portfolioList) {
    if (openPortfolioModalBtn) openPortfolioModalBtn.disabled = true;
    setPortfolioModalOpen(false);
    portfolioList.innerHTML = "<p>Solo cuentas de contratista pueden gestionar catalogo.</p>";
  }

  if (contractorMessagesList && currentRole !== "contratista") {
    contractorMessagesList.innerHTML = "";
  }
});
