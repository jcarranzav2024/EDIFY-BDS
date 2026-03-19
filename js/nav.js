import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { logoutUser } from "./auth.js";

const DESIGNATED_ADMIN_EMAIL = "admin@edifybds.com";

export function initContactMenu() {
  const contactMenu = document.getElementById("contactMenu");
  const contactMenuToggle = document.getElementById("contactMenuToggle");
  const contactMenuPanel = document.getElementById("contactMenuPanel");

  if (!contactMenu || !contactMenuToggle || !contactMenuPanel) return;

  function setContactMenuOpen(isOpen) {
    contactMenuToggle.setAttribute("aria-expanded", String(isOpen));
    contactMenuPanel.hidden = !isOpen;
  }

  contactMenuToggle.addEventListener("click", () => {
    const isOpen = contactMenuToggle.getAttribute("aria-expanded") === "true";
    setContactMenuOpen(!isOpen);
  });

  contactMenuPanel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setContactMenuOpen(false);
    });
  });

  document.addEventListener("click", (event) => {
    if (!contactMenu.contains(event.target)) {
      setContactMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setContactMenuOpen(false);
    }
  });
}

export function initMobileNav() {
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");

  if (!toggle || !nav) return;

  function setOpen(isOpen) {
    nav.classList.toggle("open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  toggle.addEventListener("click", () => {
    const nextOpen = !nav.classList.contains("open");
    setOpen(nextOpen);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 900px)").matches) {
        setOpen(false);
      }
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      setOpen(false);
    }
  });
}

export function initAuthUserMenu() {
  const userMenu = document.getElementById("userMenu");
  const userGreeting = document.getElementById("userGreeting");
  const userMenuPanel = document.getElementById("userMenuPanel");
  const userMenuAdminLink = document.getElementById("userMenuAdminLink");
  const userMenuLogoutBtn = document.getElementById("userMenuLogoutBtn");
  const loginNavLink = document.getElementById("loginNavLink");
  const registerNavLink = document.getElementById("registerNavLink");
  const header = document.querySelector(".site-header");
  const menuToggle = document.getElementById("menuToggle");

  if (!userMenu || !userGreeting || !userMenuPanel) return;

  let mobileUserChip = document.getElementById("mobileUserChip");
  if (!mobileUserChip && header) {
    mobileUserChip = document.createElement("span");
    mobileUserChip.id = "mobileUserChip";
    mobileUserChip.className = "mobile-user-chip";
    mobileUserChip.hidden = true;
    if (menuToggle) {
      header.insertBefore(mobileUserChip, menuToggle);
    } else {
      header.appendChild(mobileUserChip);
    }
  }

  function setUserMenuOpen(isOpen) {
    userGreeting.setAttribute("aria-expanded", String(isOpen));
    userMenuPanel.hidden = !isOpen;
  }

  userGreeting.addEventListener("click", () => {
    const isOpen = userGreeting.getAttribute("aria-expanded") === "true";
    setUserMenuOpen(!isOpen);
  });

  document.addEventListener("click", (event) => {
    if (!userMenu.contains(event.target)) {
      setUserMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setUserMenuOpen(false);
    }
  });

  if (userMenuLogoutBtn) {
    userMenuLogoutBtn.addEventListener("click", async () => {
      await logoutUser();
      window.location.href = "./index.html";
    });
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (user.email?.toLowerCase() === DESIGNATED_ADMIN_EMAIL) {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          rol: "admin",
          actualizadoEn: serverTimestamp()
        }, { merge: true });
      }

      let nombre = user.displayName || user.email;
      let rol = "usuario";
      try {
        const userRef = await getDoc(doc(db, "users", user.uid));
        if (userRef.exists()) {
          const data = userRef.data();
          nombre = data.nombre || nombre;
          rol = data.rol || rol;
        }
      } catch (error) {
        // Keep fallback name when Firestore read fails.
      }

      userMenu.hidden = false;
      userGreeting.textContent = `Hola, ${nombre} (${rol})`;
      userGreeting.title = "Abrir menu de usuario";
      userGreeting.setAttribute("aria-label", "Abrir menu de usuario");
      if (mobileUserChip) {
        mobileUserChip.hidden = false;
        mobileUserChip.textContent = `${nombre} (${rol})`;
        mobileUserChip.title = `Usuario: ${nombre} (${rol})`;
      }
      if (userMenuAdminLink) {
        userMenuAdminLink.hidden = rol !== "admin";
      }
      setUserMenuOpen(false);

      if (registerNavLink) registerNavLink.hidden = true;
      if (loginNavLink) loginNavLink.hidden = true;
      return;
    }

    userMenu.hidden = true;
    userGreeting.textContent = "";
    if (mobileUserChip) {
      mobileUserChip.hidden = true;
      mobileUserChip.textContent = "";
      mobileUserChip.title = "";
    }
    if (userMenuAdminLink) {
      userMenuAdminLink.hidden = true;
    }
    setUserMenuOpen(false);

    if (registerNavLink) registerNavLink.hidden = false;
    if (loginNavLink) loginNavLink.hidden = false;
  });
}
