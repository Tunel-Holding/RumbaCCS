// src/services/apiStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Helper para peticiones con token JWT.
 * @param {string} url - URL completa del endpoint.
 * @param {object} options - Opciones de fetch (method, headers, body, etc.).
 */
export const apiFetch = async (url, options = {}) => {
  try {
    let token = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');

    if (!token) {
      throw new Error('No se encontró token en AsyncStorage');
    }

    // función interna para hacer request
    const makeRequest = async (accessToken) => {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      };

      const res = await fetch(url, { ...options, headers });
      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();
      let data = text;

      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(text);
        } catch {}
      }

      return { res, data };
    };

    // 1. Intento inicial con el access token actual
    let { res, data } = await makeRequest(token);

    // 2. Si expira (401) y hay refreshToken → intenta renovar
    if (res.status === 401 && refreshToken) {
      console.log('🔄 Token expirado, intentando refrescar...');

      const refreshRes = await fetch(`http://<IP_BACKEND>:8000/api/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        token = refreshData.access;

        // Guardar nuevo accessToken
        await AsyncStorage.setItem('accessToken', token);

        // Reintentar la petición original con el nuevo token
        ({ res, data } = await makeRequest(token));
      } else {
        console.warn('⚠️ No se pudo refrescar el token, sesión expirada');
        throw new Error('Sesión expirada');
      }
    }

    if (__DEV__) {
      console.log('API REQUEST:', options.method || 'GET', url);
      console.log('STATUS:', res.status);
      console.log('RESPONSE DATA:', data);
    }

    return { res, data };
  } catch (error) {
    console.error('Error en apiFetch:', error.message);
    throw error;
  }
};
