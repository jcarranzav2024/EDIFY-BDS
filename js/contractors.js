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
import { asMessage } from "./validators.js";
import { initAuthUserMenu, initMobileNav } from "./nav.js";

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

const requestMessage = document.getElementById("requestMessage");

let currentUser = null;
let currentRole = "guest";

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
          ${canRequest ? `<button class="btn action-btn request-service-btn" type="button" data-contractor-id="${item.id}" data-servicio="${data.servicios || data.especialidad || "Servicio general"}">Solicitar servicio</button>` : ""}
        </article>
      `);
    });

    listEl.innerHTML = cards.length ? cards.join("") : "<p>No hay contratistas para ese filtro.</p>";
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
    } catch (error) {
      profileMessage.textContent = asMessage(error);
      profileMessage.classList.add("error");
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
    } catch (error) {
      userProfileMessage.textContent = asMessage(error);
      userProfileMessage.classList.add("error");
    }
  });
}

if (listEl) {
  listEl.addEventListener("click", async (event) => {
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
});
