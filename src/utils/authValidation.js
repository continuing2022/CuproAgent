export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 6;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function normalizeUsername(username) {
  return String(username || "").trim();
}

export function isValidEmail(email) {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

export function isValidUsername(username) {
  const value = normalizeUsername(username);
  return (
    value.length >= USERNAME_MIN_LENGTH &&
    value.length <= USERNAME_MAX_LENGTH
  );
}

export function isValidPassword(password) {
  return (
    typeof password === "string" && password.length >= PASSWORD_MIN_LENGTH
  );
}
