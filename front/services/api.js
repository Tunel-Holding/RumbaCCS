// src/services/apiStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Helper para peticiones con token JWT.
 * @param {string} url - URL completa del endpoint.
 * @param {object} options - Opciones de fetch (method, headers, body, etc.).
 */
export const apiFetch = async (url, options = {}) => {
  try {
    // Obtener token guardado
    const token = await AsyncStorage.getItem('accessToken'); // Usa la misma clave que en el login
    if (!token) {
      throw new Error('No se encontró token en AsyncStorage');
    }

    // Combinar headers
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`, // Si tu backend usa "Token" en vez de "Bearer", cámbialo aquí
    };

    // Hacer la petición
    const res = await fetch(url, { ...options, headers });

    // Leer respuesta como texto
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    let data = text;

    // Intentar parsear JSON si el Content-Type es application/json
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch {
        // Si falla el parseo, deja como texto
      }
    }

    // Logs útiles en desarrollo
    if (__DEV__) {
      console.log('API REQUEST:', {
        method: options.method || 'GET',
        url,
        headers,
      });
      console.log('STATUS:', res.status);
      console.log('RESPONSE DATA:', data);
    }

    // Retornar objeto con respuesta y datos
    return { res, data };
  } catch (error) {
    console.error('Error en apiFetch:', error.message);
    throw error;
  }
};
