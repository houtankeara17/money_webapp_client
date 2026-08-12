import axios from "axios";

// 1. In production (on Vercel), use empty string "" so requests use relative paths (/api/...)
// 2. In local development, fallback to "http://localhost:5000" (or rely on Vite proxy)
const BASE_URL = import.meta.env.MODE === "production" 
  ? "" 
  : (import.meta.env.VITE_API_URL || "http://localhost:5000");

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Prevent redirecting if the request was to auth routes
    const isAuthRoute =
      error.config?.url?.includes("/auth/login") ||
      error.config?.url?.includes("/auth/register");

    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
