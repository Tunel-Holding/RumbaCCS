import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import EmpresaMenu from '../components/EmpresaMenu';
import { getResponsiveStyles } from '../utils/deviceConfig';
import { useSafeMargins } from '../utils/safeAreaUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';


// Componente base para header estandarizado y adaptable
export default function StandardHeader({
   
  title = 'Evential',
  subtitle = 'Ccs',
  onMenuPress, // opcional, se puede sobreescribir
  showMenu = true,
  style,
  logoContainerStyle,
  onLogout,     // nueva prop para cerrar sesión
  hasEmpresa = false, // para controlar opciones del menú
  isLogged = false,
  isEmpresaAccount = false,
  isUserAccount = true,
  onLoginPress, // callback para iniciar sesión (alineado con HeaderBase)
  onLogoutPress, // callback para cerrar sesión (alineado con HeaderBase)
  isHomeScreen = false,
  children,
}) {

  const [fontsLoaded] = useFonts({
    'BebasNeue': require('../../assets/BebasNeue-Regular.ttf'),
  });
  const responsive = getResponsiveStyles();
  const safe = useSafeMargins();

  // Alto y paddings adaptativos
  // Dejar solo 0.5cm (~9.5px) de espacio respecto al notch/cámara
  // Reducir espacio superior: menos padding y margen
  const minTop = 2; // mínimo margen superior
  const adjustedTop = safe.top > 0 ? Math.min(safe.top, minTop) : minTop;
  const headerDynamicStyle = {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    zIndex: 100,
  // Altura mínima para header compacto (no forzar altura fija para evitar recortes)
  minHeight: 54,
    paddingTop: adjustedTop,
    paddingBottom: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  // Tamaños de fuente adaptativos
  const logoTextStyle = {
    // Incrementamos ligeramente el tamaño base responsivo para que el logo destaque más
    fontSize: responsive.text.xlarge.fontSize + 12,
    // Remove fontWeight to avoid conflicts with the custom font on some platforms
    color: '#ffffffff',
    fontFamily: fontsLoaded ? 'BebasNeue' : undefined,
  };
  const logoSubtextStyle = {
    fontSize: responsive.text.large.fontSize +6,
    // Use the same display font for the subtext when loaded (fallback to system if not)
    color: '#ff007f',
    fontWeight: 'bold',

  };
  const menuIconStyle = {
    fontSize: responsive.text.xlarge.fontSize,
    color: '#fff',
    fontWeight: 'bold',
  };

  // Estado para mostrar/ocultar el menú tipo HamburgerMenu
  const [menuVisible, setMenuVisible] = useState(false);

  // Estado local para detectar si la cuenta logueada es tipo empresa.
  // Inicializamos desde la prop pero luego verificamos AsyncStorage para estar seguros.
  const [localIsEmpresaAccount, setLocalIsEmpresaAccount] = useState(isEmpresaAccount);

  useEffect(() => {
    let mounted = true;
    const checkIsEmpresa = async () => {
      try {
        const v = await AsyncStorage.getItem('isEmpresaAccount');
        if (!mounted) return;
        setLocalIsEmpresaAccount(v === 'true');
      } catch (e) {
        if (!mounted) return;
        setLocalIsEmpresaAccount(false);
      }
    };
    // Only check when logged state changes (or on mount)
    checkIsEmpresa();
    return () => { mounted = false; };
  }, [isLogged]);

  return (
    <View style={[headerDynamicStyle, style]}>
      {/* Branding y menú alineados horizontalmente */}
      <View style={[styles.logoContainer, logoContainerStyle]}>
        <Text style={logoTextStyle}>{title}</Text>
        <Text style={logoSubtextStyle}>{subtitle}</Text>
      </View>
      {showMenu && (
        isLogged ? (
          // If account is a company, show EmpresaMenu to provide company-specific options
          (localIsEmpresaAccount) ? (
            <EmpresaMenu
              visible={menuVisible}
              setVisible={setMenuVisible}
              onMenuItemPress={onMenuPress}
              onLogoutPress={onLogoutPress || onLogout || onMenuPress}
               isHome={isHomeScreen}
            />
          ) : (
            <HamburgerMenu
              visible={menuVisible}
              setVisible={setMenuVisible}
              // If caller provided hasEmpresa use it, otherwise fall back to isEmpresaAccount
              hasEmpresa={hasEmpresa || localIsEmpresaAccount}
              isLogged={isLogged}
              isEmpresaAccount={localIsEmpresaAccount}
              isUserAccount={isUserAccount}
              onMenuItemPress={onMenuPress}
              onLoginPress={onLoginPress || onMenuPress /* fallback */}
              onLogoutPress={onLogoutPress || onLogout || onMenuPress /* fallback */}
              isHome={isHomeScreen}
            />
          )
        ) : (
          <Pressable
            onPress={onLoginPress}
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: pressed ? '#0ba0d8' : '#0ea5e9' },
            ]}
            android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
          >
            <Text style={[styles.loginBtnText]}>Iniciar sesión</Text>
          </Pressable>
        )
      )}
      {children}
    </View>
  );
}



const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
    marginRight: 0,
    gap: 6,
  },
  loginBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  loginBtnText: { color: '#fff', fontWeight: 'bold' },
});
