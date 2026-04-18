const HELP_ITEMS = [
  {
    id: "publicar-trabajos",
    title: "Como enviar trabajos",
    steps: [
      "Inicia sesion con tu cuenta de contratista.",
      "Ve a Mi perfil y abre Mi catalogo de trabajos.",
      "Presiona Nuevo trabajo y completa titulo, fecha y descripcion.",
      "Agrega imagenes por URL y guarda."
    ],
    ctaLabel: "Ir a mi perfil",
    ctaHref: "./perfil.html"
  },
  {
    id: "contratar",
    title: "Como contratar contratistas",
    steps: [
      "Inicia sesion con cuenta de cliente.",
      "Entra a Contratistas y revisa el directorio.",
      "Usa Contactar contratista para enviar tu solicitud.",
      "Espera respuesta del contratista en la plataforma."
    ],
    ctaLabel: "Ver contratistas",
    ctaHref: "./contratistas.html"
  },
  {
    id: "calificar",
    title: "Como dejar calificaciones",
    steps: [
      "Inicia sesion con cuenta registrada.",
      "Ve a Resenas y elige el contratista y trabajo.",
      "Selecciona entre 1 y 5 estrellas.",
      "Agrega comentario opcional y publica."
    ],
    ctaLabel: "Ir a resenas",
    ctaHref: "./resenas.html"
  },
  {
    id: "planes",
    title: "Como gestionar planes",
    steps: [
      "Inicia sesion como contratista.",
      "Abre Mi perfil y revisa Mi suscripcion.",
      "Confirma limites de trabajos e imagenes.",
      "Si eres admin, usa Dashboard para ajustes globales."
    ],
    ctaLabel: "Abrir dashboard",
    ctaHref: "./admin-dashboard.html"
  }
];

let initialized = false;

function buildHelpPanel() {
  const wrapper = document.createElement("section");
  wrapper.id = "helpBotPanel";
  wrapper.className = "help-bot-panel";
  wrapper.hidden = true;

  wrapper.innerHTML = `
    <header class="help-bot-header">
      <h3>Centro de ayuda</h3>
      <button id="helpBotClose" class="btn secondary" type="button" aria-label="Cerrar ayuda">X</button>
    </header>
    <div class="help-bot-body">
      <p class="help-bot-subtitle">Selecciona una opcion rapida:</p>
      <div id="helpBotOptions" class="help-bot-options"></div>
      <article id="helpBotResult" class="help-bot-result">
        <p>Elige una opcion para ver los pasos.</p>
      </article>
    </div>
  `;

  return wrapper;
}

function renderHelpResult(resultEl, item) {
  const steps = item.steps
    .map((step, index) => `<li>${index + 1}. ${step}</li>`)
    .join("");

  resultEl.innerHTML = `
    <h4>${item.title}</h4>
    <ul class="help-bot-steps">${steps}</ul>
    <a class="btn" href="${item.ctaHref}">${item.ctaLabel}</a>
  `;
}

export function initHelpBot() {
  if (initialized) return;
  if (!document.body) return;

  const toggle = document.createElement("button");
  toggle.id = "helpBotToggle";
  toggle.type = "button";
  toggle.className = "help-bot-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "helpBotPanel");
  toggle.textContent = "Ayuda";

  const panel = buildHelpPanel();
  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  const closeBtn = panel.querySelector("#helpBotClose");
  const optionsEl = panel.querySelector("#helpBotOptions");
  const resultEl = panel.querySelector("#helpBotResult");

  function setOpen(isOpen) {
    panel.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  HELP_ITEMS.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "help-bot-option-btn";
    btn.textContent = item.title;
    btn.addEventListener("click", () => {
      renderHelpResult(resultEl, item);
    });
    optionsEl.appendChild(btn);
  });

  if (HELP_ITEMS.length) {
    renderHelpResult(resultEl, HELP_ITEMS[0]);
  }

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  closeBtn?.addEventListener("click", () => {
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (panel.hidden) return;
    if (panel.contains(target) || toggle.contains(target)) return;
    setOpen(false);
  });

  initialized = true;
}
