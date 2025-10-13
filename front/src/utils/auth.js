import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const loginConFallback = async (email, password) => {
  if (!email.trim() || !password.trim()) {
    return { error: 'Campos vacíos', tipo: 'validacion' };
  }
  let usuarioFalló = false;
  try {
    const resUser = await api.post('/api/login/', { email, password });
    // Si el interceptor devolvió una respuesta simulada
    if (resUser?.data?.loggedOut) {
      usuarioFalló = true;
      throw new Error('Usuario no válido');
    }

    const data = resUser.data;

    console.log('token access:', data.access);

    await AsyncStorage.multiSet([
      ['accessToken', data.access],
      ['refreshToken', data.refresh],
      ['userEmail', email],
      ['empresaId', data.empresa_id?.toString() || ''],
      ['userName', data.user?.username || email],
      ['userKind', 'usuario'],
    ]);

    return { success: true, tipo: 'usuario', data };

  } catch (errorUser) {
    const status = errorUser.response?.status;
    const msg = errorUser.response?.data?.detail || errorUser.message;


    // Si no es 401 o no es un logout silencioso, devolver error
    if (!usuarioFalló && status !== 401 && !errorUser?.config?._fromSilentLogout) {
      return { error: msg, tipo: 'error' };
    }
    
    try {
      const resEmpresa = await api.post('/api/empresa/login/', { email, password });
      const data = resEmpresa.data;

      await AsyncStorage.multiSet([
        ['accessToken', data.token || data.access],
        ['refreshToken', data.refresh],
        ['empresaId', data.empresa?.id?.toString() || ''],
        ['userEmail', email],
        ['userKind', 'empresa'],
      ]);

      return { success: true, tipo: 'empresa', data };

    } catch (errorEmpresa) {
      const msgEmpresa = errorEmpresa.response?.data?.detail || errorEmpresa.message;
      return { error: msgEmpresa, tipo: 'credenciales' };
    }
  }
};
