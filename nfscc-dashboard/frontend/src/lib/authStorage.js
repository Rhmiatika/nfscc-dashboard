const TOKEN_KEY = "nfscc_api_token";

export function getApiToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export function setApiToken(token) {
  if (!token) return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearApiToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}