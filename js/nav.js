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
