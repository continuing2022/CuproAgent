const TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USERNAME_KEY = "username";
const EMAIL_KEY = "email";
const ROLE_KEY = "role";

function getStorage(persist = true) {
  return persist ? localStorage : sessionStorage;
}

function inferPersistPreference() {
  return Boolean(
    localStorage.getItem(TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY),
  );
}

function getStoredValue(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

export function getAccessToken() {
  return getStoredValue(TOKEN_KEY);
}

export function getRefreshToken() {
  return getStoredValue(REFRESH_TOKEN_KEY);
}

export function setAuthSession({
  accessToken,
  refreshToken,
  user,
  persist,
}) {
  const storage = getStorage(
    typeof persist === "boolean" ? persist : inferPersistPreference(),
  );

  clearAuthSession();

  if (accessToken) storage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (user?.username) storage.setItem(USERNAME_KEY, user.username);
  if (user?.email) storage.setItem(EMAIL_KEY, user.email);
  if (user?.role) storage.setItem(ROLE_KEY, user.role);
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USERNAME_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(ROLE_KEY);
}

export function hasAccessToken() {
  return Boolean(getAccessToken());
}
