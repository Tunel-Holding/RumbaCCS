// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_IP = '192.168.10.5'; // ← Cámbiala por tu IP real
const PORT = '8000';
const baseURL = `http://${LOCAL_IP}:${PORT}`;

const api = axios.create({
  baseURL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// --- ADDED: helper para respuesta silenciosa al invalidar sesión ---
const silentLogoutResponse = (originalRequest) => ({
  data: { loggedOut: true },
  status: 401,
  statusText: 'Unauthorized',
  headers: {},
  config: originalRequest,
  _fromSilentLogout: true,
});

// --- ADDED: limpieza centralizada (puedes añadir más claves si quieres) ---
const clearSession = async () => {
  await AsyncStorage.multiRemove([
    'accessToken',
    'refreshToken',
    'isUserAccount',
    'isEmpresaAccount',
    'sessionMode',
  ]);
};

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const data = error.response?.data || {};

    // --- ADDED: detectar token definitivamente inválido antes de intentar refresh ---
    const tokenInvalid =
      status === 401 &&
      (
        data.code === 'token_not_valid' ||
        data.detail === 'Token is invalid or expired' ||
        data.detail === 'Given token not valid for any token type'
      );


    

    // Si es una petición al endpoint de refresh o ya se reintentó y sigue inválido -> cerrar sesión silenciosa
    if (tokenInvalid && (originalRequest._retry || originalRequest.url?.includes('/token/refresh/'))) {
      await clearSession();
      processQueue(error, null);
      return silentLogoutResponse(originalRequest); // ← NO lanza reject
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (!token) return silentLogoutResponse(originalRequest);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');

        if (!refreshToken) {
          await clearSession(); // CHANGED: usar helper
          return silentLogoutResponse(originalRequest); // CHANGED: no reject
        }

        const refreshRes = await axios.post(`${baseURL}/api/token/refresh/`, {
          refresh: refreshToken,
        });

        const newToken = refreshRes.data?.access;

        if (!newToken) {
          await clearSession();
          return silentLogoutResponse(originalRequest);
        }
        await AsyncStorage.setItem('accessToken', newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error('Error al refrescar token:', err?.response?.data || err.message);
        await clearSession();
        processQueue(err, null);
        return silentLogoutResponse(originalRequest);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;