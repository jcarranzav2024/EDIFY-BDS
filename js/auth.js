import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import {
  asMessage,
  isValidEmail,
  minLength,
  notifyError,
  notifySuccess
} from "./validators.js";
import { initHelpBot } from "./help-bot.js";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

initHelpBot();

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("loginMessage");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      if (!isValidEmail(email)) throw new Error("Correo no valido.");
      if (!minLength(password, 6)) throw new Error("Contrasena demasiado corta.");

      await signInWithEmailAndPassword(auth, email, password);
      message.textContent = "Sesion iniciada. Redirigiendo...";
      message.classList.remove("error");
      notifySuccess("Sesion iniciada correctamente.");
      setTimeout(() => {
        window.location.href = "./index.html";
      }, 600);
    } catch (error) {
      message.textContent = asMessage(error);
      message.classList.add("error");
      notifyError(asMessage(error));
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("registerMessage");

    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const selectedRol = document.getElementById("rol").value;
    const rol = ["cliente", "contratista"].includes(selectedRol) ? selectedRol : "cliente";

    try {
      if (!minLength(nombre, 2)) throw new Error("Nombre invalido.");
      if (!isValidEmail(email)) throw new Error("Correo no valido.");
      if (!minLength(password, 6)) throw new Error("Contrasena minimo 6 caracteres.");

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        nombre,
        email,
        rol,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      });

      let verificationNote = "";
      try {
        await sendEmailVerification(cred.user);
        verificationNote = " Se envio correo de verificacion.";
      } catch (verificationError) {
        verificationNote = " No se pudo enviar correo de verificacion.";
      }

      await signOut(auth);

      message.textContent = `Cuenta creada correctamente.${verificationNote} Redirigiendo a login...`;
      message.classList.remove("error");
      notifySuccess("Cuenta creada correctamente.");
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1400);
    } catch (error) {
      message.textContent = asMessage(error);
      message.classList.add("error");
      notifyError(asMessage(error));
    }
  });
}

export async function logoutUser() {
  await signOut(auth);
}
