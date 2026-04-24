import { apiClient } from "../lib/apiClient";
import { setApiToken, clearApiToken } from "../lib/authStorage";

export async function loginApi(payload) {
  try {
    const data = await apiClient.post("/login", payload);

    if (data?.token) {
      setApiToken(data.token);
    }

    return data;
  } catch (error) {
    throw new Error(error.message || "Login gagal.");
  }
}

export async function createPasswordApi(payload) {
  try {
    const data = await apiClient.post("/create-password", payload);
    return data;
  } catch (error) {
    throw new Error(error.message || "Gagal membuat password.");
  }
}

export async function updatePasswordApi(payload) {
  try {
    const data = await apiClient.post("/update-password", payload);
    return data;
  } catch (error) {
    throw new Error(error.message || "Gagal mengubah password.");
  }
}

export async function logoutApi() {
  try {
    const data = await apiClient.post("/logout", {});
    clearApiToken();
    return data;
  } catch (error) {
    clearApiToken();
    throw new Error(error.message || "Logout gagal.");
  }
}