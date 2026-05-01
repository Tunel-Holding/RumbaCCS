import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import EmpresaMenu from '../components/EmpresaMenu';
import { getResponsiveStyles } from '../utils/deviceConfig';
import { useSafeMargins } from '../utils/safeAreaUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { useNavigation } from '@react-navigation/native';


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
  logoRight,
  headerCenter,
  menuLeft,
  onLoginPress, // callback para iniciar sesión (alineado con HeaderBase)
  onLogoutPress, // callback para cerrar sesión (alineado con HeaderBase)
  isHomeScreen = false,
  children,
}) {

  const [fontsLoaded] = useFonts({
    'BebasNeue': require('../../assets/BebasNeue-Regular.ttf'),
  });
  const navigation = useNavigation();
  const responsive = getResponsiveStyles();
  const safe = useSafeMargins();
  const isWeb = Platform.OS === 'web';

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
    fontSize: Platform.OS === 'web'
      ? responsive.text.xlarge.fontSize + 22
      : responsive.text.xlarge.fontSize + 12,
    // Remove fontWeight to avoid conflicts with the custom font on some platforms
    color: '#ffffffff',
    fontFamily: fontsLoaded ? 'BebasNeue' : undefined,
  };
  const logoSubtextStyle = {
    fontSize: Platform.OS === 'web'
      ? responsive.text.large.fontSize + 10
      : responsive.text.large.fontSize + 6,
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

  // Fuente de verdad interna: verificar token en AsyncStorage en cada cambio de isLogged
  const [sessionOk, setSessionOk] = useState(false);
  const [localIsEmpresaAccount, setLocalIsEmpresaAccount] = useState(false);

  useEffect(() => {
    let mounted = true;
    const verify = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const hasToken = !!(token && token.trim().length > 0);
        if (!mounted) return;
        setSessionOk(hasToken);
        if (!hasToken) {
          setLocalIsEmpresaAccount(false);
          return;
        }
        const v = await AsyncStorage.getItem('isEmpresaAccount');
        if (!mounted) return;
        setLocalIsEmpresaAccount(v === 'true');
      } catch (e) {
        if (!mounted) return;
        setSessionOk(false);
        setLocalIsEmpresaAccount(false);
      }
    };
    verify();
    return () => { mounted = false; };
  }, [isLogged]);

  // Solo mostrar el menú si el padre dice isLogged Y hay token real en storage
  const shouldShowMenu = isLogged && sessionOk;

  const clearSessionAndGoHome = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('userName'),
        AsyncStorage.removeItem('userEmail'),
        AsyncStorage.removeItem('accessToken'),
        AsyncStorage.removeItem('refreshToken'),
        AsyncStorage.removeItem('empresaId'),
        AsyncStorage.removeItem('isEmpresaAccount'),
        AsyncStorage.removeItem('userId'),
        AsyncStorage.removeItem('isUserAccount'),
        AsyncStorage.removeItem('sessionMode'),
      ]);
    } catch (_) { }
    navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
  };

  const handleWebAction = async (item) => {
    try {
      if (onMenuPress) onMenuPress(item);
    } catch (_) { }

    if (item === 'inicio') {
      if (isHomeScreen) {
        navigation.navigate(localIsEmpresaAccount ? 'Empresa' : 'Perfil');
      } else {
        navigation.navigate('HomeScreen');
      }
      return;
    }

    if (item === 'agregar_evento') {
      navigation.navigate('Add');
      return;
    }

    if (item === 'calendar' || item === 'notifications') {
      // Fallback web behavior: abre la pantalla que centraliza estas secciones.
      navigation.navigate(localIsEmpresaAccount ? 'Empresa' : 'Perfil');
      return;
    }

    if (item === 'perfil_empresa') {
      try {
        const empresaId = await AsyncStorage.getItem('empresaId');
        if (empresaId) {
          await AsyncStorage.multiSet([
            ['sessionMode', 'empresa'],
            ['isEmpresaAccount', 'true'],
            ['isUserAccount', 'false'],
            ['userKind', 'empresa'],
          ]);
          navigation.reset({ index: 0, routes: [{ name: 'Empresa', params: { empresaId } }] });
        }
      } catch (_) { }
      return;
    }

    if (item === 'register_empresa') {
      navigation.navigate('FormularioScreen');
      return;
    }

    if (item === 'logout') {
      if (onLogoutPress || onLogout) {
        try { (onLogoutPress || onLogout)(); } catch (_) { }
      } else {
        await clearSessionAndGoHome();
      }
    }
  };

  return (
    <View style={[headerDynamicStyle, style]}>
      {/* Branding y menú alineados horizontalmente */}
      <View style={[styles.logoContainer, logoContainerStyle]}>
        <Text style={logoTextStyle}>{title}</Text>
        <Text style={logoSubtextStyle}>{subtitle}</Text>
        {logoRight}
      </View>
      {headerCenter ? (
        <View style={styles.headerCenterSlot} pointerEvents="box-none">
          {headerCenter}
        </View>
      ) : null}
      <View style={styles.rightControls}>
        {menuLeft}
        {showMenu && (
          isWeb ? (
            shouldShowMenu ? (
              <View style={styles.webActionsRow}>
                <TouchableOpacity style={styles.webActionBtn} onPress={() => handleWebAction('inicio')}>
                  <Text style={styles.webActionText}>{isHomeScreen ? 'Tu perfil' : 'Inicio'}</Text>
                </TouchableOpacity>

                {localIsEmpresaAccount ? (
                  <>
                    <TouchableOpacity style={styles.webActionBtn} onPress={() => handleWebAction('agregar_evento')}>
                      <Text style={styles.webActionText}>Agregar evento</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.webActionBtn} onPress={() => handleWebAction('notifications')}>
                      <Text style={styles.webActionText}>Notificaciones</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.webActionBtn} onPress={() => handleWebAction('calendar')}>
                      <Text style={styles.webActionText}>Calendario</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.webActionBtn} onPress={() => handleWebAction('notifications')}>
                      <Text style={styles.webActionText}>Notificaciones</Text>
                    </TouchableOpacity>
                    {hasEmpresa ? (
                      <TouchableOpacity style={styles.webActionBtn} onPress={() => handleWebAction('perfil_empresa')}>
                        <Text style={styles.webActionText}>Perfil empresa</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.webActionBtn} onPress={() => handleWebAction('register_empresa')}>
                        <Text style={styles.webActionText}>Registrar empresa</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <TouchableOpacity style={[styles.webActionBtn, styles.webLogoutBtn]} onPress={() => handleWebAction('logout')}>
                  <Text style={[styles.webActionText, styles.webLogoutText]}>Cerrar sesión</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Pressable
                onPress={onLoginPress}
                style={({ pressed }) => [
                  styles.loginBtn,
                  styles.loginBtnWeb,
                  { backgroundColor: pressed ? '#0ba0d8' : '#0ea5e9' },
                ]}
                android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
              >
                <Text style={[styles.loginBtnText, styles.loginBtnTextWeb]}>Iniciar sesión</Text>
              </Pressable>
            )
          ) : (
            shouldShowMenu ? (
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
          )
        )}
      </View>
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
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCenterSlot: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    transform: [{ translateX: -105 }],
    justifyContent: 'center',
  },
  loginBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  loginBtnText: { color: '#fff', fontWeight: 'bold' },
  loginBtnWeb: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 14,
  },
  loginBtnTextWeb: {
    fontSize: 18,
  },
  webActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginLeft: 8,
  },
  webActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  webActionText: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '600',
  },
  webLogoutBtn: {},
  webLogoutText: {
    color: '#fecaca',
  },
});
