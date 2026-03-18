import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "./firebase-config.js";
import { logoutUser } from "./auth.js";
import { initAuthUserMenu, initMobileNav } from "./nav.js";

const sessionStatus = document.getElementById("sessionStatus");
const logoutBtn = document.getElementById("logoutBtn");
const carousel = document.querySelector("[data-carousel]");

initMobileNav();
initAuthUserMenu();

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (sessionStatus) {
      sessionStatus.textContent = `Sesion activa: ${user.email}`;
    }
    return;
  }

  if (sessionStatus) {
    sessionStatus.textContent = "Sin sesion activa";
  }
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
