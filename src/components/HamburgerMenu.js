import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SvgXml } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import CalendarModal from './CalendarModal';
import NotificationsModal from './NotificationsModal';
import { useNavigation } from '@react-navigation/native';

const menuIcon = `<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='white'><path stroke-linecap='round' stroke-linejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' /></svg>`;

export default function HamburgerMenu({ visible, setVisible, onMenuItemPress, hasEmpresa = false, onLogoutPress, isHome = false }) {
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [eventsByDate, setEventsByDate] = useState({});
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const navigation = useNavigation();

  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

  const toKeyFromISO = (iso) => {
    if (typeof iso !== 'string') return null;
    if (iso.length >= 10 && /\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return null;
  };

  const toKeyFromDMY = (str) => {
    if (typeof str !== 'string') return null;
    const nums = (str.match(/\d+/g) || []).map((n) => parseInt(n, 10));
    if (nums.length < 3) return null;
    const [d, m, y] = nums;
    if (!y || !m || !d) return null;
    if (y < 1000 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${y}-${pad(m)}-${pad(d)}`;
  };

  const buildEventsByDate = (guardados) => {
    const map = {};
    guardados.forEach((e) => {
      const ev = e.evento_obj || e.evento || e;
      let key = null;
      if (ev) {
        key = toKeyFromISO(ev.fecha_evento) || toKeyFromISO(ev.fecha) || toKeyFromISO(ev.creado_en) || toKeyFromDMY(ev.fecha_evento) || toKeyFromDMY(ev.fecha) || toKeyFromDMY(ev.creado_en);
      }
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push({
        id: e.id || ev.id,
        eventoId: ev?.id || e.eventoId || e.evento_id,
        titulo: ev?.titulo || ev?.title || e.titulo || e.title || 'Evento',
        time: ev?.hora || ev?.time || null,
        ubicacion: ev?.ubicacion || e.ubicacion || null,
      });
    });
    return map;
  };

  const fetchSavedEvents = async () => {
    try {
      setLoadingCalendar(true);
      // token-based endpoint; PerfilScreen uses 'api/eventos-guardados/'
      const res = await api.get('api/eventos-guardados/');
      const dataArray = Array.isArray(res?.data)
        ? res.data
        : (res?.data && Array.isArray(res.data.results) ? res.data.results : []);
      const map = buildEventsByDate(dataArray || []);
      setEventsByDate(map);
      setLoadingCalendar(false);
      return true;
    } catch (err) {
      setLoadingCalendar(false);
      console.log('HamburgerMenu.fetchSavedEvents error', err);
      Alert.alert('Error', 'No se pudieron cargar los eventos guardados.');
      return false;
    }
  };

  const handleOpenCalendar = async () => {
    // Close menu then open calendar after fetching
    setVisible(false);
    const ok = await fetchSavedEvents();
    if (ok) setCalendarVisible(true);
    // notify parent if it wants to know
    if (onMenuItemPress) {
      try { onMenuItemPress('calendar'); } catch (_) {}
    }
  };

  // Notifications modal
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [hasAffiliatedEmpresa, setHasAffiliatedEmpresa] = useState(hasEmpresa || false);
  const handleOpenNotifications = () => {
    // Close menu then open notifications modal
    setVisible(false);
    setNotificationsVisible(true);
    try { onMenuItemPress && onMenuItemPress('notifications'); } catch (_) {}
  };

  const handlePerfilEmpresaPress = async () => {
    setVisible(false);
    try {
      const empresaId = await AsyncStorage.getItem('empresaId');
      if (!empresaId) {
        Alert.alert('No tienes empresa afiliada', 'No se encontró una empresa asociada a tu cuenta.');
        return;
      }

      // Switch session to affiliated company.
      // NOTE: We keep the accessToken because there's no company token available here.
      // We remove user-specific keys and set flags that tell the app it's now in empresa mode.
      try {
        await AsyncStorage.multiRemove(['userName', 'userEmail', 'userId', 'isUserAccount']);
      } catch (e) {
        // ignore remove errors
      }

      try {
        await AsyncStorage.multiSet([
          ['sessionMode', 'empresa'],
          ['isEmpresaAccount', 'true'],
          ['isUserAccount', 'false'],
          ['empresaId', empresaId],
          ['userKind', 'empresa'],
        ]);
      } catch (e) {
        console.log('HamburgerMenu: error setting empresa session keys', e);
      }

      // Notify parent that a logout-like switch happened
      try { onLogoutPress && onLogoutPress(); } catch(_) {}

      // Reset navigation to the Empresa screen so the new session mode takes effect
      navigation.reset({ index: 0, routes: [{ name: 'Empresa', params: { empresaId } }] });
    } catch (e) {
      console.log('HamburgerMenu: error navigating to EmpresaScreen', e);
      Alert.alert('Error', 'No se pudo abrir el perfil de la empresa.');
    }
  };

  const handleFormularioPress = () => {
    setVisible(false);
    try {
      navigation.navigate('FormularioScreen');
    } catch (e) {
      console.log('HamburgerMenu: error navigating to FormularioScreen', e);
      Alert.alert('Error', 'No se pudo abrir el formulario.');
    }
  };

  // Watch menu visibility; when opened, detect empresaId presence to decide which menu item to show
  React.useEffect(() => {
    let mounted = true;
    const checkEmpresa = async () => {
      if (!visible) return;
      try {
        const empresaId = await AsyncStorage.getItem('empresaId');
        if (mounted) setHasAffiliatedEmpresa(!!(empresaId && empresaId !== ''));
      } catch (e) {
        if (mounted) setHasAffiliatedEmpresa(false);
      }
    };
    checkEmpresa();
    return () => { mounted = false; };
  }, [visible]);

  const handlePressEvent = (ev) => {
    setCalendarVisible(false);
    try {
      const id = ev.eventoId || ev.id || ev.evento_id;
      if (id) navigation.navigate('Reservar/Comprar', { idEvento: id });
    } catch (e) {
      console.log('HamburgerMenu: navigation to event failed', e);
    }
  };

  const handleLogoutConfirm = () => {
    // Ask confirmation then clear storage and reset navigation
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              // remove known session keys
              await Promise.all([
                AsyncStorage.removeItem('userName'),
                AsyncStorage.removeItem('userEmail'),
                AsyncStorage.removeItem('accessToken'),
                AsyncStorage.removeItem('empresaId'),
                AsyncStorage.removeItem('isEmpresaAccount'),
                AsyncStorage.removeItem('userId'),
                AsyncStorage.removeItem('isUserAccount'),
                AsyncStorage.removeItem('sessionMode'),
              ]);
            } catch (e) {
              console.log('HamburgerMenu: error clearing session storage', e);
            }
            // call parent callback if provided
            try { onLogoutPress && onLogoutPress(); } catch (_) {}

            // Show confirmation then reset navigation to HomeScreen
            Alert.alert('Sesión cerrada', 'Has cerrado sesión correctamente', [
              { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] }) }
            ]);
          }
        }
      ],
    );
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
            <TouchableOpacity onPress={handleOpenCalendar} style={styles.menuItem}>
              <Text style={styles.menuText}>Calendario</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenNotifications} style={styles.menuItem}>
              <Text style={styles.menuText}>Notificaciones</Text>
            </TouchableOpacity>
            {hasAffiliatedEmpresa ? (
              <TouchableOpacity onPress={handlePerfilEmpresaPress} style={styles.menuItem}> 
                <Text style={styles.menuText}>Perfil empresa</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleFormularioPress} style={styles.menuItem}>
                <Text style={styles.menuText}>Formulario de empresa</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { setVisible(false); handleLogoutConfirm(); }} style={[styles.menuItem, styles.logoutItem]}>
              <Text style={[styles.menuText, styles.logoutText]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Calendar modal controlled internally to ensure consistent behavior */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        eventsByDate={eventsByDate}
        onPressEvent={handlePressEvent}
      />
      {/* Optional loading overlay while fetching calendar data */}
      {loadingCalendar && (
        <Modal visible={true} transparent animationType="none">
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center' }}>
            <View style={{ backgroundColor:'#1e293b', padding:20, borderRadius:12 }}>
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text style={{ color:'#fff', marginTop:12 }}>Cargando calendario...</Text>
            </View>
          </View>
        </Modal>
      )}
      {/* Notifications modal controlled internally */}
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
