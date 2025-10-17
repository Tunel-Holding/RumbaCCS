import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const loginConFallback = async (email, password) => {
  if (!email.trim() || !password.trim()) {
    return { error: 'Campos vacíos', tipo: 'validacion' };
  }

  try {
    // Llamada al endpoint unificado
    const res = await api.post('/api/login/', { email, password });
    const data = res.data;

    // Determinar si es empresa o usuario según la respuesta
    const isEmpresa = !!data.empresa;

    await AsyncStorage.multiSet([
      ['accessToken', data.access],
      ['refreshToken', data.refresh],
      ['userEmail', email],
      ['empresaId', isEmpresa 
          ? data.empresa?.id?.toString() || '' 
          : data.empresa_id?.toString() || ''],
      ['userName', !isEmpresa 
          ? data.user?.username || email 
          : data.empresa?.nombre || email],
      ['userKind', isEmpresa ? 'empresa' : 'usuario'],
    ]);

    return { success: true, tipo: isEmpresa ? 'empresa' : 'usuario', data };

  } catch (error) {
    const msg = error.response?.data?.detail || error.message;
    return { error: msg, tipo: 'credenciales' };
  }
};
