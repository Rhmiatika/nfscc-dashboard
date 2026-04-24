import { getApiToken } from "./authStorage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

async function request(path, options = {}) {
  const token = getApiToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    console.error("API ERROR:", data);
    throw new Error(
      data?.message ||
        data?.error ||
        (typeof data === "string" ? data : "Request gagal.")
    );
  }

  return data;
}

export const apiClient = {
  get: (path) => request(path, { method: "GET" }),

  post: (path, body) =>
    request(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: (path, body) =>
    request(path, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: (path) => request(path, { method: "DELETE" }),
};