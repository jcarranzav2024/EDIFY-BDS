import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { logoutUser } from "./auth.js";
import { initMobileNav } from "./nav.js";

const sessionStatus = document.getElementById("sessionStatus");
const logoutBtn = document.getElementById("logoutBtn");
const carousel = document.querySelector("[data-carousel]");
const userMenu = document.getElementById("userMenu");
const userGreeting = document.getElementById("userGreeting");
const userMenuPanel = document.getElementById("userMenuPanel");
const userMenuLogoutBtn = document.getElementById("userMenuLogoutBtn");
const loginNavLink = document.getElementById("loginNavLink");
const registerNavLink = document.getElementById("registerNavLink");

initMobileNav();

function setUserMenuOpen(isOpen) {
  if (!userGreeting || !userMenuPanel) return;
  userGreeting.setAttribute("aria-expanded", String(isOpen));
  userMenuPanel.hidden = !isOpen;
}

if (userGreeting && userMenuPanel) {
  userGreeting.addEventListener("click", () => {
    const isOpen = userGreeting.getAttribute("aria-expanded") === "true";
    setUserMenuOpen(!isOpen);
  });

  document.addEventListener("click", (event) => {
    if (!userMenu) return;
    if (!userMenu.contains(event.target)) {
      setUserMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setUserMenuOpen(false);
    }
  });
}

if (userMenuLogoutBtn) {
  userMenuLogoutBtn.addEventListener("click", async () => {
    await logoutUser();
    window.location.href = "./login.html";
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    let nombre = user.displayName || user.email;
    try {
      const userRef = await getDoc(doc(db, "users", user.uid));
      if (userRef.exists()) {
        nombre = userRef.data().nombre || nombre;
      }
    } catch (error) {
      // Keep fallback name when Firestore read fails.
    }

    if (sessionStatus) {
      sessionStatus.textContent = `Sesion activa: ${user.email}`;
    }
    if (userMenu) {
      userMenu.hidden = false;
    }
    if (userGreeting) {
      userGreeting.textContent = `Hola, ${nombre}`;
      userGreeting.title = "Abrir menu de usuario";
      userGreeting.setAttribute("aria-label", "Abrir menu de usuario");
    }
    setUserMenuOpen(false);
    if (registerNavLink) registerNavLink.hidden = true;
    if (loginNavLink) loginNavLink.hidden = true;
    return;
  }

  if (sessionStatus) {
    sessionStatus.textContent = "Sin sesion activa";
  }
  if (userMenu) {
    userMenu.hidden = true;
  }
  if (userGreeting) {
    userGreeting.textContent = "";
  }
  setUserMenuOpen(false);
  if (registerNavLink) registerNavLink.hidden = false;
  if (loginNavLink) loginNavLink.hidden = false;
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await logoutUser();
    window.location.href = "./login.html";
  });
}

if (carousel) {
  const slides = Array.from(carousel.querySelectorAll(".carousel-slide"));
  const dotsContainer = document.getElementById("carouselDots");
  const prevBtn = document.getElementById("carouselPrev");
  const nextBtn = document.getElementById("carouselNext");

  let current = 0;
  let timer = null;

  function render(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === index);
    });

    const dots = Array.from(dotsContainer.querySelectorAll(".carousel-dot"));
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  }

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    render(current);
  }

  function startAuto() {
    stopAuto();
    timer = window.setInterval(() => {
      goTo(current + 1);
    }, 5000);
  }

  function stopAuto() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  slides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel-dot";
    dot.setAttribute("aria-label", `Ir a imagen ${index + 1}`);
    dot.addEventListener("click", () => {
      goTo(index);
      startAuto();
    });
    dotsContainer.appendChild(dot);
  });

  prevBtn?.addEventListener("click", () => {
    goTo(current - 1);
    startAuto();
  });

  nextBtn?.addEventListener("click", () => {
    goTo(current + 1);
    startAuto();
  });

  carousel.addEventListener("mouseenter", stopAuto);
  carousel.addEventListener("mouseleave", startAuto);

  render(current);
  startAuto();
}
