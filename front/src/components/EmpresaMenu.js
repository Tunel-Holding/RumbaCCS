import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Modal, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationsModal from './NotificationsModal';
import { SvgXml } from 'react-native-svg';
import api from '../services/api';

const menuIcon = `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='white'><path stroke-linecap='round' stroke-linejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' /></svg>`;

export default function EmpresaMenu({ visible, setVisible, onMenuItemPress, onLogoutPress, isHome = false }) {
  const navigation = useNavigation();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(true); // ocultar extras hasta confirmar verificación
  const [statusLoaded, setStatusLoaded] = useState(false); // indica si ya se comprobó el estado
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [sessionClosedVisible, setSessionClosedVisible] = useState(false);

  // Cuando se abre el menú, verificar estado de la empresa para ocultar opciones si no está verificada
  useEffect(() => {
    let mounted = true;
    const checkEmpresaStatus = async () => {
      if (!visible) return;
      setStatusLoaded(false);
      try {
        const empresaId = await AsyncStorage.getItem('empresaId');
        if (!empresaId) {
          if (mounted) {
            setIsBlocked(true);
            setStatusLoaded(true);
          }
          return;
        }
        // Intento rápido: usar estado cacheado si existe
        try {
          const cached = await AsyncStorage.getItem('empresaStatus');
          if (cached != null && mounted) {
            const blockedCached = cached === 'pending' || cached === 'rejected';
            setIsBlocked(blockedCached);
            setStatusLoaded(true);
          }
        } catch (_) {}
        const res = await api.get(`/api/empresas/${empresaId}/`);
        const status = res?.data?.status;
        const blocked = status === 'pending' || status === 'rejected';
        if (mounted) {
          setIsBlocked(!!blocked);
          setStatusLoaded(true);
        }
        // Actualizar caché de estado
        try { await AsyncStorage.setItem('empresaStatus', String(status ?? '')); } catch (_) {}
      } catch (e) {
        // Si falla, bloquear por defecto y marcar como cargado
        if (mounted) {
          setIsBlocked(true);
          setStatusLoaded(true);
        }
      }
    };
    checkEmpresaStatus();
    return () => { mounted = false; };
  }, [visible]);

  const handleNavigateInicioTuPerfil = async () => {
    setVisible(false);
    try { onMenuItemPress && onMenuItemPress('inicio'); } catch (_) {}
    try {
      if (isHome) {
        const isEmpresaAcc = await AsyncStorage.getItem('isEmpresaAccount');
        if (isEmpresaAcc === 'true') navigation.navigate('Empresa');
        else navigation.navigate('Perfil');
      } else {
        navigation.navigate('HomeScreen');
      }
    } catch (_) {
      navigation.navigate('HomeScreen');
    }
  };

  const handleItem = async (item) => {
    // Close menu first
    try { setVisible(false); } catch (_) {}
    // Call parent's handler if provided
    try { if (onMenuItemPress) onMenuItemPress(item); } catch (_) {}

    if (item === 'agregar_evento') {
      navigation.navigate('Add');
    } else if (item === 'notifications') {
      // open internal notifications modal
      setNotificationsVisible(true);
    } else if (item === 'inicio') {
      await handleNavigateInicioTuPerfil();
    } else if (item === 'register') {
      // fallback: navigate to registration flow
      try { navigation.navigate('AccountTypeScreen'); } catch (_) {}
    }
  };

  const handleLogout = async () => {
    // close menu and open our inline confirmation modal
    try { setVisible(false); } catch (_) {}
    setLogoutConfirmVisible(true);
  };

  return (
    <>
      <TouchableOpacity style={styles.menuButton} onPress={() => setVisible(true)}>
        <SvgXml xml={menuIcon} width={36} height={36} />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <TouchableOpacity onPress={() => setVisible(false)} style={styles.arrowBack}>
            <SvgXml xml={`<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='none' viewBox='0 0 24 24' stroke-width='2.5' stroke='#fff'><path stroke-linecap='round' stroke-linejoin='round' d='M15 19l-7-7 7-7'/></svg>`} width={32} height={32} />
          </TouchableOpacity>
          <View style={styles.menuBox}>
            {/* Inicio / Tu perfil */}
            <TouchableOpacity onPress={handleNavigateInicioTuPerfil} style={styles.menuItem}>
              <Text style={styles.menuText}>{isHome ? 'Tu perfil' : 'Inicio'}</Text>
            </TouchableOpacity>

            {/* Mostrar opciones extra solo cuando ya se comprobó el estado y la empresa está verificada */}
            {statusLoaded && !isBlocked && (
              <>
                <TouchableOpacity onPress={() => handleItem('agregar_evento')} style={styles.menuItem}>
                  <Text style={styles.menuText}>Agregar evento</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleItem('notifications')} style={styles.menuItem}>
                  <Text style={styles.menuText}>Notificaciones</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Cerrar sesión siempre visible */}
            <TouchableOpacity onPress={handleLogout} style={[styles.menuItem, styles.logoutItem]}>
              <Text style={[styles.menuText, styles.logoutText]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Internal notifications modal */}
      <NotificationsModal visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} pageSize={5} />

      {/* Logout confirmation modal */}
      <Modal visible={logoutConfirmVisible} transparent animationType="fade">
        <View style={styles.backdropCentered}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Cerrar sesión</Text>
            <Text style={styles.alertMessage}>¿Estás seguro que deseas cerrar sesión?</Text>
            <View style={styles.alertBtnsRow}>
              <TouchableOpacity onPress={() => setLogoutConfirmVisible(false)} style={[styles.alertBtn, styles.alertCancel]}>
                <Text style={[styles.alertBtnText, styles.alertCancelText]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
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
                } catch (e) {
                  console.log('EmpresaMenu: error clearing session storage', e);
                }
                try { onLogoutPress && onLogoutPress(); } catch (_) {}
                setLogoutConfirmVisible(false);
                setSessionClosedVisible(true);
              }} style={[styles.alertBtn, styles.alertConfirm]}>
                <Text style={[styles.alertBtnText, styles.alertConfirmText]}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Session closed modal */}
      <Modal visible={sessionClosedVisible} transparent animationType="fade">
        <View style={styles.backdropCentered}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Sesión cerrada</Text>
            <Text style={styles.alertMessage}>Has cerrado sesión correctamente</Text>
            <View style={[styles.alertBtnsRow, { justifyContent: 'center' }]}>
              <TouchableOpacity onPress={() => { setSessionClosedVisible(false); navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] }); }} style={[styles.alertBtn, styles.alertConfirm]}>
                <Text style={[styles.alertBtnText, styles.alertConfirmText]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  arrowBack: {
    position: 'absolute',
    top: 32,
    left: 24,
    zIndex: 101,
    padding: 8,
  },
  menuButton: { padding: 8, marginLeft: 12 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.87)',
    alignItems: 'center',
    zIndex: 100,
  },
  menuBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 260,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
  },
  menuItem: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 18,
    backgroundColor: 'transparent',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { color: '#fff', fontSize: 20, fontWeight: '600', letterSpacing: 0.5 },
  closeBtn: { marginTop: 8 },
  closeText: { color: '#ff007f', fontSize: 16, marginTop: 12 },
  logoutItem: { backgroundColor: 'transparent' },
  logoutText: { color: '#ef4444', fontSize: 20, fontWeight: '700' },
  backdropCentered: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f172a',
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  alertTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  alertMessage: {
    color: '#cbd5e1',
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 20,
  },
  alertBtnsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  alertBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginLeft: 10 },
  alertCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155' },
  alertConfirm: { backgroundColor: '#0ea5e9' },
  alertBtnText: { fontSize: 15, fontWeight: '600' },
  alertCancelText: { color: '#94a3b8' },
  alertConfirmText: { color: '#012a36' },
});

