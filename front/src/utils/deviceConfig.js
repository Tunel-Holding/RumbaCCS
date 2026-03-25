import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Configuración para diferentes tipos de dispositivos
export const DEVICE_CONFIG = {
  // Configuración para dispositivos pequeños (iPhone SE, Android pequeños)
  small: {
    headerHeight: 60,
    inputHeight: 48,
    buttonHeight: 48,
    fontSize: {
      small: 12,
      regular: 14,
      medium: 16,
      large: 18,
      xlarge: 24
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      xxl: 24
    }
  },
  
  // Configuración para dispositivos medianos (iPhone 12/13/14, Android estándar)
  medium: {
    headerHeight: 64,
    inputHeight: 52,
    buttonHeight: 52,
    fontSize: {
      small: 13,
      regular: 15,
      medium: 17,
      large: 19,
      xlarge: 26
    },
    spacing: {
      xs: 6,
      sm: 10,
      md: 14,
      lg: 18,
      xl: 22,
      xxl: 28
    }
  },
  
  // Configuración para dispositivos grandes (iPhone Pro Max, Android grandes)
  large: {
    headerHeight: 68,
    inputHeight: 56,
    buttonHeight: 56,
    fontSize: {
      small: 14,
      regular: 16,
      medium: 18,
      large: 20,
      xlarge: 28
    },
    spacing: {
      xs: 8,
      sm: 12,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32
    }
  },
  
  // Configuración para tablets
  tablet: {
    headerHeight: 72,
    inputHeight: 60,
    buttonHeight: 60,
    fontSize: {
      small: 15,
      regular: 17,
      medium: 19,
      large: 21,
      xlarge: 30
    },
    spacing: {
      xs: 10,
      sm: 14,
      md: 18,
      lg: 22,
      xl: 26,
      xxl: 36
    }
  }
};

// Función para obtener la configuración del dispositivo actual
export const getDeviceConfig = () => {
  if (Platform.OS === 'tablet' || (width > 768 && height > 1024)) {
    return DEVICE_CONFIG.tablet;
  }
  
  if (width <= 375) {
    return DEVICE_CONFIG.small;
  } else if (width <= 414) {
    return DEVICE_CONFIG.medium;
  } else {
    return DEVICE_CONFIG.large;
  }
};

// Función para obtener estilos responsivos
export const getResponsiveStyles = () => {
  const config = getDeviceConfig();
  
  return {
    header: {
      height: config.headerHeight,
      paddingHorizontal: config.spacing.lg,
      paddingVertical: config.spacing.md
    },
    input: {
      height: config.inputHeight,
      paddingHorizontal: config.spacing.lg,
      fontSize: config.fontSize.regular,
      borderRadius: config.spacing.md
    },
    button: {
      height: config.buttonHeight,
      paddingHorizontal: config.spacing.lg,
      borderRadius: config.spacing.md
    },
    text: {
      small: { fontSize: config.fontSize.small },
      regular: { fontSize: config.fontSize.regular },
      medium: { fontSize: config.fontSize.medium },
      large: { fontSize: config.fontSize.large },
      xlarge: { fontSize: config.fontSize.xlarge }
    },
    spacing: config.spacing
  };
};

// Función para verificar si es un dispositivo con notch
export const hasNotch = () => {
  if (Platform.OS === 'ios') {
    return height > 800;
  } else {
    return false; // Android maneja esto automáticamente
  }
};

// Función para verificar si es un dispositivo con barra de navegación
export const hasNavigationBar = () => {
  if (Platform.OS === 'ios') {
    return height > 800; // Dispositivos con home indicator
  } else {
    return true; // Android siempre tiene barra de navegación
  }
};

// Función para obtener la altura del área segura inferior
export const getBottomSafeAreaHeight = () => {
  if (Platform.OS === 'ios') {
    return hasNotch() ? 34 : 0; // Home indicator height
  } else {
    return 48; // Altura estimada de la barra de navegación en Android
  }
};

// Función para obtener la altura del área segura superior
export const getTopSafeAreaHeight = () => {
  if (Platform.OS === 'ios') {
    return 44; // Status bar height en iOS
  } else {
    return 24; // Status bar height en Android
  }
};
