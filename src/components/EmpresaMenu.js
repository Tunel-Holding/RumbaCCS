import React from 'react';
import { View, TouchableOpacity, Text, Modal, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';

const menuIcon = `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='white'><path stroke-linecap='round' stroke-linejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' /></svg>`;

export default function EmpresaMenu({ visible, setVisible, onMenuItemPress }) {
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
            <TouchableOpacity onPress={() => onMenuItemPress('inicio')} style={styles.menuItem}>
              <Text style={styles.menuText}>Inicio</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onMenuItemPress('agregar_evento')} style={styles.menuItem}>
              <Text style={styles.menuText}>Agregar evento</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onMenuItemPress('administrar_ganancias')} style={styles.menuItem}>
              <Text style={styles.menuText}>Administrar ganancias</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onMenuItemPress('notifications')} style={styles.menuItem}>
              <Text style={styles.menuText}>Notificaciones</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onMenuItemPress('register')} style={styles.menuItem}>
              <Text style={styles.menuText}>Registrarse como usuario</Text>
            </TouchableOpacity>
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
});

