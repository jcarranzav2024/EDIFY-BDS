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
