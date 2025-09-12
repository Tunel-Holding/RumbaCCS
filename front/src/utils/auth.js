import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const loginConFallback = async (email, password) => {
  if (!email.trim() || !password.trim()) {
    return { error: 'Campos vacíos', tipo: 'validacion' };
  }

  try {
    const resUser = await api.post('/api/login/', { email, password });
    const data = resUser.data;

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

    if (status !== 401) {
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
