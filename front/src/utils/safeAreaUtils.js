import { Platform, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Constantes para diferentes dispositivos
export const DEVICE_TYPES = {
  SMALL: 'small',      // iPhone SE, Android pequeños
  MEDIUM: 'medium',    // iPhone 12/13/14, Android estándar
  LARGE: 'large',      // iPhone 12/13/14 Pro Max, Android grandes
  TABLET: 'tablet'     // Tablets
};

// Determinar el tipo de dispositivo basado en dimensiones
export const getDeviceType = () => {
  const aspectRatio = height / width;
  
  if (Platform.OS === 'tablet' || (width > 768 && height > 1024)) {
    return DEVICE_TYPES.TABLET;
  }
  
  if (width <= 375) {
    return DEVICE_TYPES.SMALL;
  } else if (width <= 414) {
    return DEVICE_TYPES.MEDIUM;
  } else {
    return DEVICE_TYPES.LARGE;
  }
};

// Obtener márgenes seguros para diferentes dispositivos
export const getSafeMargins = () => {
  const deviceType = getDeviceType();
  
  // Márgenes base para diferentes tipos de dispositivos
  const baseMargins = {
    [DEVICE_TYPES.SMALL]: {
      top: 8,
      bottom: 8,
      horizontal: 12
    },
    [DEVICE_TYPES.MEDIUM]: {
      top: 12,
      bottom: 12,
      horizontal: 16
    },
    [DEVICE_TYPES.LARGE]: {
      top: 16,
      bottom: 16,
      horizontal: 20
    },
    [DEVICE_TYPES.TABLET]: {
      top: 20,
      bottom: 20,
      horizontal: 24
    }
  };
  
  // Ajustes específicos por plataforma
  const platformAdjustments = {
    ios: {
      top: Platform.OS === 'ios' ? 0 : 0, // iOS maneja automáticamente
      bottom: Platform.OS === 'ios' ? 0 : 0
    },
    android: {
      top: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
      bottom: Platform.OS === 'android' ? 0 : 0
    }
  };
  
  const currentPlatform = Platform.OS;
  const margins = baseMargins[deviceType];
  const adjustments = platformAdjustments[currentPlatform];
  
  return {
    top: margins.top + adjustments.top,
    bottom: margins.bottom + adjustments.bottom,
    horizontal: margins.horizontal,
    deviceType
  };
};

// Hook personalizado para usar márgenes seguros
export const useSafeMargins = () => {
  const insets = useSafeAreaInsets();
  const deviceMargins = getSafeMargins();
  
  return {
    ...deviceMargins,
    // Combinar con insets nativos cuando estén disponibles
    top: Math.max(deviceMargins.top, insets.top),
    bottom: Math.max(deviceMargins.bottom, insets.bottom),
    left: Math.max(deviceMargins.horizontal, insets.left),
    right: Math.max(deviceMargins.horizontal, insets.right)
  };
};

// Estilos predefinidos para diferentes elementos
export const getSafeStyles = () => {
  const margins = getSafeMargins();
  
  return {
    container: {
      flex: 1,
      paddingTop: margins.top,
      paddingBottom: margins.bottom,
      paddingHorizontal: margins.horizontal
    },
    header: {
      paddingTop: margins.top,
      paddingHorizontal: margins.horizontal,
      paddingBottom: 12
    },
    content: {
      paddingHorizontal: margins.horizontal,
      paddingBottom: margins.bottom
    },
    modal: {
      marginTop: margins.top,
      marginBottom: margins.bottom,
      marginHorizontal: margins.horizontal
    }
  };
};

// Función para obtener altura del status bar
export const getStatusBarHeight = () => {
  if (Platform.OS === 'ios') {
    return 44; // Altura estándar del status bar en iOS
  } else {
    return StatusBar.currentHeight || 24; // Android
  }
};

// Función para obtener altura de la barra de navegación (estimada)
export const getNavigationBarHeight = () => {
  if (Platform.OS === 'ios') {
    return 34; // Altura del home indicator en dispositivos con notch
  } else {
    return 48; // Altura estimada de la barra de navegación en Android
  }
};

// Función para verificar si el dispositivo tiene notch
export const hasNotch = () => {
  if (Platform.OS === 'ios') {
    // Lista de dispositivos iOS con notch
    const notchDevices = [
      'iPhone X', 'iPhone XS', 'iPhone XS Max', 'iPhone XR',
      'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
      'iPhone 12', 'iPhone 12 mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
      'iPhone 13', 'iPhone 13 mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
      'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
      'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max'
    ];
    
    // Esta es una aproximación, en producción deberías usar una librería como react-native-device-info
    return height > 800;
  } else {
    // Para Android, verificar si tiene notch basado en la altura del status bar
    return (StatusBar.currentHeight || 0) > 24;
  }
};
