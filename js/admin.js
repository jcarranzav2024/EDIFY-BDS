import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { initAuthUserMenu, initMobileNav } from "./nav.js";
import { asMessage, notifyError, notifyInfo, notifySuccess } from "./validators.js";

const DESIGNATED_ADMIN_EMAIL = "admin@edifybds.com";

const adminAccessMessage = document.getElementById("adminAccessMessage");
const adminCards = Array.from(document.querySelectorAll(".admin-card"));
const panels = Array.from(document.querySelectorAll(".admin-panel"));

const adminUserSelect = document.getElementById("adminUserSelect");
const adminRoleSelect = document.getElementById("adminRoleSelect");
const adminChangeRoleBtn = document.getElementById("adminChangeRoleBtn");
const newRoleName = document.getElementById("newRoleName");
const createRoleBtn = document.getElementById("createRoleBtn");
const adminRoleMessage = document.getElementById("adminRoleMessage");
const rolesList = document.getElementById("rolesList");
const usersList = document.getElementById("usersList");
const plansList = document.getElementById("plansList");
const catalogList = document.getElementById("catalogList");
const seedDemoBtn = document.getElementById("seedDemoBtn");
const seedDemoMessage = document.getElementById("seedDemoMessage");

let currentUser = null;
let availableRoles = ["cliente", "contratista", "admin"];

initMobileNav();
initAuthUserMenu();

function getProvince(index) {
  const provinces = ["San Jose", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limon"];
  return provinces[index % provinces.length];
}

function showPanel(panelId) {
  panels.forEach((panel) => {
    panel.hidden = panel.id !== panelId;
  });
}

adminCards.forEach((card) => {
  card.addEventListener("click", () => {
    showPanel(card.dataset.panel);
  });
});

async function ensureDesignatedAdminRole(user) {
  if (!user || user.email?.toLowerCase() !== DESIGNATED_ADMIN_EMAIL) return;
  await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    rol: "admin",
    actualizadoEn: serverTimestamp()
  }, { merge: true });
}

async function getCurrentRole(user) {
  if (!user) return "guest";
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return "guest";
  return snap.data().rol || "guest";
}

async function loadRoles() {
  const rolesSnap = await getDocs(query(collection(db, "roles"), limit(100)));
  const customRoles = [];
  rolesSnap.forEach((r) => customRoles.push(r.id));
  availableRoles = Array.from(new Set(["cliente", "contratista", "admin", ...customRoles]));

  if (adminRoleSelect) {
    adminRoleSelect.innerHTML = availableRoles.map((r) => `<option value="${r}">${r}</option>`).join("");
  }

  if (rolesList) {
    rolesList.innerHTML = availableRoles.map((r) => `<p><strong>${r}</strong></p>`).join("");
  }
}

async function loadUsers() {
  const usersSnap = await getDocs(query(collection(db, "users"), limit(300)));
  const options = ['<option value="">Selecciona un usuario</option>'];
  const rows = [];

  usersSnap.forEach((userDoc) => {
    const u = userDoc.data();
    options.push(`<option value="${userDoc.id}">${u.nombre || "Sin nombre"} - ${u.email || "sin correo"} (${u.rol || "sin rol"})</option>`);
    rows.push(`<p><strong>${u.nombre || "Sin nombre"}</strong> | ${u.email || "sin correo"} | rol: ${u.rol || "sin rol"}</p>`);
  });

  if (adminUserSelect) adminUserSelect.innerHTML = options.join("");
  if (usersList) usersList.innerHTML = rows.join("") || "<p>No hay usuarios.</p>";
}

async function loadPlans() {
  const plansSnap = await getDocs(query(collection(db, "plans"), limit(50)));
  const rows = [];
  plansSnap.forEach((planDoc) => {
    const p = planDoc.data();
    rows.push(`<p><strong>${planDoc.id}</strong> | $${p.precioMensual ?? 0} | max trabajos: ${p.maxTrabajosCatalogo ?? "N/A"}</p>`);
  });
  plansList.innerHTML = rows.join("") || "<p>No hay planes configurados.</p>";
}

async function loadCatalog() {
  const catalogSnap = await getDocs(query(collection(db, "portfolio_jobs"), limit(100)));
  const rows = [];
  catalogSnap.forEach((jobDoc) => {
    const j = jobDoc.data();
    rows.push(`<p><strong>${j.titulo || "Trabajo"}</strong> | contratista: ${j.contractorId || "N/A"} | zona: ${j.zona || "N/A"}</p>`);
  });
  catalogList.innerHTML = rows.join("") || "<p>No hay trabajos en catalogo todavia.</p>";
}

async function seedDemoData() {
  const clients = Array.from({ length: 10 }, (_, i) => ({
    id: `seed_client_${String(i + 1).padStart(2, "0")}`,
    nombre: `Cliente Demo ${i + 1}`,
    email: `cliente${i + 1}@demo.local`,
    rol: "cliente",
    cedula: `20${String(500000 + i)}`,
    telefono: `88${String(100000 + i)}`,
    zona: getProvince(i)
  }));

  const specialties = ["Carpinteria", "Pintura", "Soldadura", "Electricidad", "Remodelacion"];
  const services = ["Muebles", "Paredes", "Estructuras", "Cableado", "Acabados"];

  const contractors = Array.from({ length: 10 }, (_, i) => ({
    id: `seed_contractor_${String(i + 1).padStart(2, "0")}`,
    nombre: `Contratista Demo ${i + 1}`,
    email: `contratista${i + 1}@demo.local`,
    rol: "contratista",
    cedula: `11${String(900000 + i)}`,
    telefono: `87${String(200000 + i)}`,
    zona: getProvince(i),
    nombreVisible: `Contratista Demo ${i + 1}`,
    especialidad: specialties[i % specialties.length],
    servicios: services[i % services.length],
    descripcion: "Servicio profesional con experiencia comprobada.",
    ratingPromedio: Number((3.8 + (i % 3) * 0.4).toFixed(1)),
    totalResenas: 2
  }));

  try {
    for (const u of [...clients, ...contractors]) {
      await setDoc(doc(db, "users", u.id), {
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        cedula: u.cedula,
        telefono: u.telefono,
        zona: u.zona,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    throw new Error(`No se pudo escribir en users: ${asMessage(error)}`);
  }

  try {
    for (const c of contractors) {
      await setDoc(doc(db, "contractors", c.id), {
        nombreVisible: c.nombreVisible,
        especialidad: c.especialidad,
        servicios: c.servicios,
        zona: c.zona,
        descripcion: c.descripcion,
        ratingPromedio: c.ratingPromedio,
        totalResenas: c.totalResenas,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    throw new Error(`No se pudo escribir en contractors: ${asMessage(error)}`);
  }

  try {
    for (let i = 0; i < 20; i += 1) {
      await setDoc(doc(db, "reviews", `seed_review_${String(i + 1).padStart(2, "0")}`), {
        jobId: `seed_job_${String(i + 1).padStart(2, "0")}`,
        contractorId: contractors[i % contractors.length].id,
        clientId: clients[i % clients.length].id,
        estrellas: (i % 5) + 1,
        comentario: `Resena demo ${i + 1}: trabajo realizado con buena calidad.`,
        fecha: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    throw new Error(`No se pudo escribir en reviews: ${asMessage(error)}`);
  }
}

async function verifyAdminWriteAccess() {
  const probeRef = doc(db, "roles", "seed_probe_tmp");
  await setDoc(probeRef, {
    nombre: "seed_probe_tmp",
    creadoEn: serverTimestamp()
  }, { merge: true });
  await deleteDoc(probeRef);
}

if (createRoleBtn) {
  createRoleBtn.addEventListener("click", async () => {
    const role = (newRoleName?.value || "").trim().toLowerCase();
    if (!role) {
      adminRoleMessage.textContent = "Ingresa un nombre de rol.";
      adminRoleMessage.classList.add("error");
      notifyError("Ingresa un nombre de rol.");
      return;
    }

    try {
      await setDoc(doc(db, "roles", role), {
        nombre: role,
        creadoEn: serverTimestamp()
      }, { merge: true });
      newRoleName.value = "";
      adminRoleMessage.textContent = "Rol creado correctamente.";
      adminRoleMessage.classList.remove("error");
      notifySuccess("Rol creado correctamente.");
      await loadRoles();
    } catch (error) {
      adminRoleMessage.textContent = `No se pudo crear rol: ${asMessage(error)}`;
      adminRoleMessage.classList.add("error");
      notifyError(`No se pudo crear rol: ${asMessage(error)}`);
    }
  });
}

if (adminChangeRoleBtn) {
  adminChangeRoleBtn.addEventListener("click", async () => {
    const targetUserId = adminUserSelect?.value;
    const newRole = adminRoleSelect?.value;

    if (!targetUserId || !newRole) {
      adminRoleMessage.textContent = "Selecciona usuario y rol.";
      adminRoleMessage.classList.add("error");
      notifyError("Selecciona usuario y rol.");
      return;
    }

    try {
      await setDoc(doc(db, "users", targetUserId), {
        rol: newRole,
        actualizadoEn: serverTimestamp()
      }, { merge: true });
      adminRoleMessage.textContent = "Rol actualizado correctamente.";
      adminRoleMessage.classList.remove("error");
      notifySuccess("Rol actualizado correctamente.");
      await loadUsers();
    } catch (error) {
      adminRoleMessage.textContent = `No se pudo actualizar rol: ${asMessage(error)}`;
      adminRoleMessage.classList.add("error");
      notifyError(`No se pudo actualizar rol: ${asMessage(error)}`);
    }
  });
}

if (seedDemoBtn) {
  seedDemoBtn.addEventListener("click", async () => {
    seedDemoBtn.disabled = true;
    seedDemoMessage.textContent = "Cargando datos demo...";
    seedDemoMessage.classList.remove("error");
    notifyInfo("Cargando datos demo...");

    try {
      await verifyAdminWriteAccess();
      await seedDemoData();
      seedDemoMessage.textContent = "Seed completado correctamente.";
      notifySuccess("Seed completado correctamente.");
      await Promise.all([loadUsers(), loadCatalog()]);
    } catch (error) {
      seedDemoMessage.textContent = `Error al cargar seed: ${asMessage(error)}. Verifica que las reglas Firestore nuevas esten publicadas y que entraste con admin@edifybds.com.`;
      seedDemoMessage.classList.add("error");
      notifyError(`Error al cargar seed: ${asMessage(error)}`);
    } finally {
      seedDemoBtn.disabled = false;
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (!user) {
    window.location.href = "./login.html";
    return;
  }

  try {
    await ensureDesignatedAdminRole(user);
    const role = await getCurrentRole(user);

    if (role !== "admin") {
      adminAccessMessage.textContent = "No tienes permisos de administrador.";
      adminAccessMessage.classList.add("error");
      notifyError("No tienes permisos de administrador.");
      setTimeout(() => {
        window.location.href = "./index.html";
      }, 1200);
      return;
    }

    adminAccessMessage.textContent = "Acceso administrador habilitado.";
    adminAccessMessage.classList.remove("error");
    notifySuccess("Acceso administrador habilitado.");

    await Promise.all([loadRoles(), loadUsers(), loadPlans(), loadCatalog()]);
    showPanel("rolesPanel");
  } catch (error) {
    adminAccessMessage.textContent = `Error cargando dashboard: ${asMessage(error)}`;
    adminAccessMessage.classList.add("error");
    notifyError(`Error cargando dashboard: ${asMessage(error)}`);
  }
});
