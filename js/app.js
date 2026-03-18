import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "./firebase-config.js";
import { logoutUser } from "./auth.js";

const sessionStatus = document.getElementById("sessionStatus");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, (user) => {
  if (!sessionStatus) return;
  if (user) {
    sessionStatus.textContent = `Sesion activa: ${user.email}`;
  } else {
    sessionStatus.textContent = "Sin sesion activa";
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await logoutUser();
    window.location.href = "./login.html";
  });
}
