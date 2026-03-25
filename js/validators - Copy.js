export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function minLength(value, length) {
  return String(value || "").trim().length >= length;
}

export function asMessage(error) {
  if (!error) return "Error desconocido";
  return error.message || String(error);
}

let swalLoader = null;

function loadSwal() {
  if (window.Swal) return Promise.resolve(window.Swal);
  if (swalLoader) return swalLoader;

  swalLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
    script.async = true;
    script.onload = () => resolve(window.Swal);
    script.onerror = () => reject(new Error("No se pudo cargar SweetAlert2."));
    document.head.appendChild(script);
  });

  return swalLoader;
}

export async function notifyToast(icon, title) {
  const text = String(title || "").trim();
  if (!text) return;

  try {
    const Swal = await loadSwal();
    await Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title: text,
      showConfirmButton: false,
      timer: 2600,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      }
    });
  } catch (error) {
    // Silently ignore toast load errors and keep inline messages as fallback.
  }
}

export function notifySuccess(message) {
  notifyToast("success", message);
}

export function notifyError(message) {
  notifyToast("error", message);
}

export function notifyInfo(message) {
  notifyToast("info", message);
}
