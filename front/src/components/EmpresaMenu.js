import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Modal, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationsModal from './NotificationsModal';
import { SvgXml } from 'react-native-svg';

const menuIcon = `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='white'><path stroke-linecap='round' stroke-linejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' /></svg>`;

export default function EmpresaMenu({ visible, setVisible, onMenuItemPress, onLogoutPress, isHome = false }) {
  const navigation = useNavigation();
  const [notificationsVisible, setNotificationsVisible] = useState(false);

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
      navigation.navigate('HomeScreen');
    } else if (item === 'register') {
      // fallback: navigate to registration flow
      try { navigation.navigate('AccountTypeScreen'); } catch (_) {}
    }
  };

  const handleLogout = async () => {
    // Close menu
    try { setVisible(false); } catch (_) {}
    // If parent provided a custom logout handler, prefer it
    if (onLogoutPress) {
      try { await onLogoutPress(); } catch (e) { /* ignore */ }
      return;
    }
    // Default logout: clear session keys and reset to HomeScreen
    try {
      await Promise.all([
        AsyncStorage.removeItem('userName'),
        AsyncStorage.removeItem('userEmail'),
        AsyncStorage.removeItem('accessToken'),
        AsyncStorage.removeItem('empresaId'),
        AsyncStorage.removeItem('isEmpresaAccount'),
        AsyncStorage.removeItem('userId'),
      ]);
    } catch (e) {
      // ignore
    }
    try {
      navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
    } catch (e) {
      // fallback: navigate
      try { navigation.navigate('HomeScreen'); } catch (_) {}
    }
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
            <TouchableOpacity onPress={() => { setVisible(false); try { navigation.navigate('HomeScreen'); } catch(_){}; onMenuItemPress && onMenuItemPress('inicio'); }} style={styles.menuItem}>
                          <Text style={styles.menuText}>{isHome ? 'Tu perfil' : 'Inicio'}</Text>
                        </TouchableOpacity>
            <TouchableOpacity onPress={() => handleItem('agregar_evento')} style={styles.menuItem}>
              <Text style={styles.menuText}>Agregar evento</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleItem('notifications')} style={styles.menuItem}>
              <Text style={styles.menuText}>Notificaciones</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={[styles.menuItem, styles.logoutItem]}>
              <Text style={[styles.menuText, styles.logoutText]}>Cerrar sesión</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* Internal notifications modal */}
      <NotificationsModal visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} pageSize={5} />
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
});

