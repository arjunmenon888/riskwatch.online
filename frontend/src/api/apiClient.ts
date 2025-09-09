// frontend/src/api/apiClient.ts
import axios from "axios";

// --- START OF FIX ---
// Ensure the VITE_API_BASE_URL has a trailing slash.
// The replace regex now removes any slashes and adds exactly one.
const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") + "/";
// --- END OF FIX ---

const apiClient = axios.create({
  baseURL: BASE_URL, // e.g. https://<backend>.up.railway.app/api/v1/
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    // --- START OF FIX ---
    // Remove any leading slash from the specific request URL to prevent double slashes.
    // e.g., apiClient.get("/posts") will now correctly resolve to ".../v1/posts" not ".../v1//posts"
    if (config.url && config.url.startsWith('/')) {
        config.url = config.url.substring(1);
    }
    // --- END OF FIX ---
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;