// filepath: frontend/src/api/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// IMPORTANT: A full production-ready app would have response interceptors
// here to handle 401 Unauthorized errors by attempting to refresh the
// token using the refresh_token. This involves more complex logic like
// request queueing to avoid race conditions. For this boilerplate,
// we'll keep it simple and assume the user logs out and back in.

export default apiClient;