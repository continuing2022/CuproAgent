const LEGACY_KEYS = [
  "accessToken",
  "refreshToken",
  "username",
  "email",
  "role",
];

let inMemoryAccessToken = "";
let sessionRevision = 0;

export function getSessionRevision() {
  return sessionRevision;
}

function clearLegacyStorage() {
  LEGACY_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function setAuthSession({ accessToken }) {
  sessionRevision++;
  inMemoryAccessToken = accessToken ? String(accessToken) : "";
  clearLegacyStorage();
}

export function clearAuthSession() {
  sessionRevision++;
  inMemoryAccessToken = "";
  clearLegacyStorage();
}

export function hasAccessToken() {
  return Boolean(inMemoryAccessToken);
}
