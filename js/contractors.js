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
import { initMobileNav } from "./nav.js";

const listEl = document.getElementById("contractorsList");
const filterBtn = document.getElementById("filterBtn");
const profileForm = document.getElementById("profileForm");
const profileMessage = document.getElementById("profileMessage");
const subscriptionInfo = document.getElementById("subscriptionInfo");

initMobileNav();

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
      cards.push(`
        <article class="card">
          <h3>${data.nombreVisible || "Sin nombre"}</h3>
          <p><strong>Especialidad:</strong> ${data.especialidad || "N/A"}</p>
          <p><strong>Zona:</strong> ${data.zona || "N/A"}</p>
          <p>${data.descripcion || "Sin descripcion"}</p>
          <p><strong>Rating:</strong> ${data.ratingPromedio || 0} (${data.totalResenas || 0} resenas)</p>
        </article>
      `);
    });

    listEl.innerHTML = cards.length ? cards.join("") : "<p>No hay contratistas para ese filtro.</p>";
  } catch (error) {
    listEl.innerHTML = `<p>Error cargando contratistas: ${asMessage(error)}</p>`;
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

    const nombreVisible = document.getElementById("nombreVisible").value.trim();
    const especialidad = document.getElementById("especialidad").value.trim();
    const zona = document.getElementById("zona").value.trim();
    const descripcion = document.getElementById("descripcion").value.trim();

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Debes iniciar sesion para guardar perfil.");

      await setDoc(doc(db, "contractors", user.uid), {
        nombreVisible,
        especialidad,
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

if (listEl) {
  loadContractors();
}

onAuthStateChanged(auth, async (user) => {
  if (user && subscriptionInfo) {
    try {
      await ensureDefaultPlans();
      await loadSubscription();
    } catch (error) {
      subscriptionInfo.innerHTML = `<p>Error cargando plan: ${asMessage(error)}</p>`;
    }
  }
});
