// frontend/src/api/apiClient.ts
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, ""); // strip trailing slash

const apiClient = axios.create({
  baseURL: BASE_URL,                    // e.g. https://<backend>.up.railway.app/api/v1
  timeout: 15000,
  // withCredentials: true,             // ONLY if you use cookie-based auth
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken"); // <-- keep this key consistent
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// (Optional) handle 401 to sign-out or refresh later
// apiClient.interceptors.response.use(undefined, async (error) => { ... });

export default apiClient;
