const LEGACY_KEYS = [
  "accessToken",
  "refreshToken",
  "username",
  "email",
  "role",
];

let inMemoryAccessToken = "";

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
  inMemoryAccessToken = accessToken ? String(accessToken) : "";
  clearLegacyStorage();
}

export function clearAuthSession() {
  inMemoryAccessToken = "";
  clearLegacyStorage();
}

export function hasAccessToken() {
  return Boolean(inMemoryAccessToken);
}
