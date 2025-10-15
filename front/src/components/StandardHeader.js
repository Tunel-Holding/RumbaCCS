
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { getResponsiveStyles } from '../utils/deviceConfig';
import { useSafeMargins } from '../utils/safeAreaUtils';

// Componente base para header estandarizado y adaptable
export default function StandardHeader({
  title = 'R U M B A',
  subtitle = 'CCS',
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
    fontSize: responsive.text.xlarge.fontSize,
    fontWeight: 'bold',
    color: '#fff',
  };
  const logoSubtextStyle = {
    fontSize: responsive.text.large.fontSize,
    fontWeight: '600',
    color: '#ff007f',
    marginLeft: 6,
  };
  const menuIconStyle = {
    fontSize: responsive.text.xlarge.fontSize + 4,
    color: '#fff',
    fontWeight: 'bold',
  };

  // Estado para mostrar/ocultar el menú tipo HamburgerMenu
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={[headerDynamicStyle, style]}>
      {/* Branding y menú alineados horizontalmente */}
      <View style={[styles.logoContainer, logoContainerStyle]}>
        <Text style={logoTextStyle}>{title}</Text>
        <Text style={logoSubtextStyle}>{subtitle}</Text>
      </View>
      {showMenu && (
        isLogged ? (
          <HamburgerMenu
            visible={menuVisible}
            setVisible={setMenuVisible}
            // If caller provided hasEmpresa use it, otherwise fall back to isEmpresaAccount
            hasEmpresa={hasEmpresa || isEmpresaAccount}
            isLogged={isLogged}
            isEmpresaAccount={isEmpresaAccount}
            isUserAccount={isUserAccount}
            onMenuItemPress={onMenuPress}
            onLoginPress={onLoginPress || onMenuPress /* fallback */}
            onLogoutPress={onLogoutPress || onLogout || onMenuPress /* fallback */}
            isHome={isHomeScreen}
          />
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
