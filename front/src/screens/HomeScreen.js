import React, { useState, useRef, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Animated } from 'react-native';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, SafeAreaView, Dimensions, Alert, StatusBar,ActivityIndicator, StatusBar,ActivityIndicator, Platform } from 'react-native';
import { loginConFallback } from '../utils/auth';
import PersonIcon from '../components/PersonIcon';

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api'; // Asegúrate de que la ruta sea correcta

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loginVisible, setLoginVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-260)).current;
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [empresaNames, setEmpresaNames] = useState({}); // cache de id->nombre
  const [hasEmpresa, setHasEmpresa] = useState(false);



  useEffect(() => {
    const checkSession = async () => {
  const token = await AsyncStorage.getItem('accessToken');
  const empresaId = await AsyncStorage.getItem('empresaId');
  setHasEmpresa(!!(empresaId && empresaId !== ''));
      if(token) {
        setIsLogged(true);
      }
      setIsLogged(!!token);
    };
    checkSession();
  }, [loginVisible]); // Se ejecuta cada vez que el modal cambia

  //Funcion de logout
  const handleLogout = async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('userEmail');
    await AsyncStorage.removeItem('userName');
    await AsyncStorage.removeItem('empresaId');
    await AsyncStorage.clear();
    setIsLogged(false);
    Alert.alert('Sesión cerrada', 'Has cerrado sesión correctamente');
  };

const handleLogin = async () => {
  const resultado = await loginConFallback(user, pass);

  if (resultado.error) {
    switch (resultado.tipo) {
      case 'validacion':
        Alert.alert('Campos vacíos', 'Por favor ingresa email y contraseña');
        break;
      case 'error':
        Alert.alert('Error inesperado', resultado.error);
        break;
      case 'credenciales':
        Alert.alert('Error de login', 'Usuario o contraseña incorrectos');
        break;
    }
    return;
  }

  setIsLogged(true);
  setLoginVisible(false);
  Alert.alert('Login correcto', `Has ingresado como ${resultado.tipo}`);
  navigation.navigate('HomeScreen');
};



  const [events, setEventos] = useState([]);

  useEffect(() => {
  const fetchEventos = async () => {
    try {
      const res = await api.get('/api/eventos-publicos/');
      const data = res.data;

      const eventosTransformados = data.map(ev => {
        const categorias = Array.isArray(ev.categoria)
          ? ev.categoria
          : (ev.categoria ? [ev.categoria] : ['Sin categoría']);

        return {
          id: ev.id,
          title: ev.titulo,
          date: ev.fecha_evento
            ? new Date(ev.fecha_evento).toLocaleDateString()
            : (ev.creado_en ? new Date(ev.creado_en).toLocaleDateString() : 'Fecha no definida'),
          time: ev.fecha_evento
            ? new Date(ev.fecha_evento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null,
          location: ev.ubicacion || 'Ubicación no definida',
          price: ev.precio === '0.00' ? 'Entrada libre' : `$${parseFloat(ev.precio).toLocaleString()}`,
          type: categorias,
          tag: categorias[0],
          imagenes: ev.imagenes,
          image: ev.imagen || 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png',
          ownerName: ev.empresa_nombre || ev.empresa_usuario || (ev.empresa ? `Empresa #${ev.empresa}` : 'Organizador')
        };
      });

      setEventos(eventosTransformados);

      // Obtener IDs de empresas que aún no tenemos en cache
      const nuevosIds = [...new Set(
        eventosTransformados
          .map(e => e.empresaId)
          .filter(id => id && !empresaNames[id])
      )];

      if (nuevosIds.length) {
        // Limitar para evitar exceso de peticiones simultáneas (p.ej. 50)
        const limited = nuevosIds.slice(0, 50);
        try {
          const responses = await Promise.all(limited.map(id => api.get(`/api/public/empresas/${id}/`).catch(() => null)));
          const mapping = {};
            responses.forEach((r, idx) => {
              if (r && r.data) {
                mapping[limited[idx]] = r.data.nombre || `Empresa #${limited[idx]}`;
              }
            });
          if (Object.keys(mapping).length) {
            setEmpresaNames(prev => ({ ...prev, ...mapping }));
          }
        } catch (e) {
          console.warn('Error obteniendo nombres de empresas', e.message);
        }
      }
    } catch (error) {
      console.error('Error fetching eventos públicos:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchEventos();
}, [empresaNames]); // cuando cache cambia, eventos se re-mapean on next fetch

  // Filtros disponibles
  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'concert', label: 'Conciertos' },
    { key: 'party', label: 'Fiestas' },
    { key: 'theater', label: 'Teatro' },
    { key: 'sports', label: 'Deportes' }
  ];

  // Footer links
  const footerLinks = [
    { title: 'Reservas' },
    { title: 'Promoción de eventos' },
    { title: 'Soporte al organizador' },
    { title: 'API para desarrolladores' }
  ];

  const filteredEvents = events.filter(e => {
    const categorias = Array.isArray(e.type) ? e.type : [e.type];
    const matchesFilter = filter === 'all' || categorias.includes(filter);
    const query = search.toLowerCase();
    const matchesSearch = e.title.toLowerCase().includes(query) || (e.location||'').toLowerCase().includes(query) || categorias.join(' ').toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0f172a' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00ff00" /> 
          <Text style={{ color: '#ffffff', marginTop: 10, fontSize: 16 }}>Cargando datos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      {/* Top dark padding */}
      <View style={styles.fixedTopPad} />
      {/* Bottom dark padding */}
      <View style={styles.fixedBottomPad} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 48, paddingTop: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header unificado */}
        <View style={styles.header}>
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>R U M B A</Text>
              <Text style={styles.logoSubtext}>CCS</Text>
            </View>
            <View style={styles.headerRight}>
              {isLogged ? (
                <TouchableOpacity
                  style={[styles.loginBtn, { backgroundColor: '#ef4444' }]}
                  onPress={handleLogout}
                >
                  <Text style={styles.loginBtnText}>Cerrar sesión</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={() => setLoginVisible(true)}
                >
                  <Text style={styles.loginBtnText}>Iniciar sesión</Text>
                </TouchableOpacity>
              )}
              {isLogged && (
                <TouchableOpacity onPress={() => navigation.navigate('Perfil')}>
                  <Image
                    source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
                    style={{ width: 32, height: 32, borderRadius: 16, marginLeft: 12, borderWidth: 2, borderColor: '#0ea5e9' }}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Hero/Video (imagen responsiva) */}
        <View style={styles.heroSection}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80' }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />
        </View>

        {/* Buscador */}
        <TextInput
          style={styles.search}
          placeholder="Buscar eventos..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingRight: 8 }}>
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Botón para ir a tu panel de Empresa
        <TouchableOpacity
          style={{
            backgroundColor: '#0ea5e9',
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 10,
            alignItems: 'center',
            marginVertical: 16,
            flexDirection: 'row',
            justifyContent: 'center'
          }}
          onPress={() => navigation.navigate('Empresa')}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Ir a mi empresa</Text>
        </TouchableOpacity> */}

        {/* Eventos */}
        <Text style={styles.sectionTitle}>Próximos eventos</Text>
        
        <View style={styles.eventsGrid}>
          {filteredEvents.length === 0 ? (
            <Text style={{ color: '#fff', textAlign: 'center', marginVertical: 20, width: '100%' }}>No hay eventos para mostrar.</Text>
          ) : (
            filteredEvents.map(event => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.ownerRow}>
                  <View style={styles.ownerAvatar}>
                    <Text style={styles.ownerAvatarText}>{(event.ownerName||'?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={styles.ownerName}>{event.ownerName}</Text>
                    <Text style={styles.ownerLabel}>Organizador</Text>
                  </View>
                  {event.tag && (
                    <View style={styles.ownerChip}><Text style={styles.ownerChipText}>{event.tag}</Text></View>
                  )}
                </View>
                <Image
                  source={{
                    uri: event.imagenes?.[0]?.url || 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png'
                  }}
                  style={styles.eventImage}
                  resizeMode="cover"
                />
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventInfo}>{event.date}{event.time ? ` ${event.time}` : ''} · {event.location}</Text>
                <Text style={styles.eventInfo}>{event.date}{event.time ? ` ${event.time}` : ''} · {event.location}</Text>
                <Text style={styles.eventPrice}>{event.price}</Text>
                <TouchableOpacity style={styles.reserveBtn} onPress={() => navigation.navigate('Reservar/Comprar', { idEvento: event.id, idEmpresa: event.ownerName?.startsWith('Empresa #') ? event.ownerName.replace('Empresa #','') : undefined })}>
                  <Text style={styles.reserveText}>Guardar</Text>
                <TouchableOpacity style={styles.reserveBtn} onPress={() => navigation.navigate('Reservar/Comprar', { idEvento: event.id, idEmpresa: event.ownerName?.startsWith('Empresa #') ? event.ownerName.replace('Empresa #','') : undefined })}>
                  <Text style={styles.reserveText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Testimonios eliminados */}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>RumbaCCS</Text>
          <Text style={styles.footerDesc}>Tu plataforma de confianza para reservas de eventos y experiencias memorables.</Text>
          <View style={styles.footerLinks}>
            {footerLinks.map((l, i) => (
              <Text key={i} style={styles.footerLink}>{l.title}</Text>
            ))}
          </View>
          <Text style={styles.footerCopyright}>© 2025 RumbaCCS. Todos los derechos reservados.</Text>
        </View>
      </ScrollView>

      {/* Menú lateral animado */}
      {/* Menú de pantalla completa */}
      <Modal
        visible={menuVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.fullMenuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.fullMenuContent}>
            <TouchableOpacity style={styles.fullMenuCloseBtn} onPress={() => setMenuVisible(false)}>
              <Text style={styles.fullMenuCloseText}>×</Text>
            </TouchableOpacity>
            <View style={styles.fullMenuOptions}>
              <Text style={styles.fullMenuOption}>Inicio</Text>
              <Text style={styles.fullMenuOption}>Eventos</Text>
              <Text style={styles.fullMenuOption}>Acerca de</Text>
              {!isLogged && (
                <TouchableOpacity
                  onPress={() => {
                    setMenuVisible(false);
                    setTimeout(() => setLoginVisible(true), 250);
                  }}
                >
                  <Text style={styles.fullMenuOption}>Iniciar sesión</Text>
                </TouchableOpacity>
              )}
              {isLogged && hasEmpresa && (
                <TouchableOpacity
                  onPress={() => {
                    setMenuVisible(false);
                    navigation.navigate('Empresa');
                  }}
                >
                  <Text style={styles.fullMenuOption}>Perfil empresa</Text>
                </TouchableOpacity>
              )}
              {isLogged && !hasEmpresa && (
                <TouchableOpacity
                  onPress={() => {
                    setMenuVisible(false);
                    navigation.navigate('FormularioScreen');
                  }}
                >
                  <Text style={styles.fullMenuOption}>Formulario de empresa</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.fullMenuFooter}>© 2025 RumbaCCS</Text>
          </View>
        </Pressable>
      </Modal>

      {/* Modal de Login */}
      <Modal
        visible={loginVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLoginVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable style={styles.modalClose} onPress={() => setLoginVisible(false)}>
              <Text style={{ fontSize: 24, color: '#fff' }}>×</Text>
            </Pressable>
            <Text style={styles.loginTitle}>Iniciar sesión</Text>

            <TextInput
              style={styles.loginInput}
              placeholder="Correo electrónico"
              placeholderTextColor="#888"
              keyboardType="email-address"
              value={user}
              onChangeText={setUser}
              autoCapitalize="none"
              autoComplete="email"
            />

            <TextInput
              style={styles.loginInput}
              placeholder="Contraseña"
              placeholderTextColor="#888"
              secureTextEntry
              value={pass}
              onChangeText={setPass}
              autoCapitalize="none"
              autoComplete="password"
            />

            <TouchableOpacity style={styles.loginBtnModal} onPress={handleLogin}>
              <Text style={styles.loginBtnText}>Ingresar</Text>
            </TouchableOpacity>

            <View style={styles.loginLinks}>
              <Text style={styles.loginLink}>¿Olvidaste tu contraseña?</Text>
              <Text style={styles.loginLink}>|</Text>
              <TouchableOpacity
                onPress={() => {
                  setLoginVisible(false);
                  navigation.navigate('AccountTypeScreen');
                }}
              >
                <Text style={styles.loginLink}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CARD_WIDTH = width < 600 ? width - 32 : (width - 48) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 8 },
  fixedTopPad: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#0f172a',
    zIndex: 10,
  },
  fixedBottomPad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#0f172a',
    zIndex: 10,
  },
  header: { backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b', marginBottom: 12 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoContainer: { flexDirection: 'row', alignItems: 'flex-end' },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  logoSubtext: { fontSize: 16, fontWeight: '600', color: '#db2777', marginLeft: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  burgerLine: {
    width: 24,
    height: 3,
    backgroundColor: '#fff',
    marginVertical: 2,
    borderRadius: 2,
  },
  logo: { width: 40, height: 40, borderRadius: 20 },
  loginBtn: { backgroundColor: '#0ea5e9', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  loginBtnText: { color: '#fff', fontWeight: 'bold' },
  heroSection: { height: width < 600 ? 180 : 260, marginBottom: 16, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  heroImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(49,46,129,0.7)' },
  search: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 16 },
  filters: { flexDirection: 'row', marginBottom: 12 },
  filterBtn: { backgroundColor: '#334155', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 },
  filterBtnActive: { backgroundColor: '#0ea5e9' },
  filterText: { color: '#fff', fontWeight: 'bold' },
  filterTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 20, color: '#fff', fontWeight: 'bold', marginVertical: 12 },
  eventsGrid: { flexDirection: width < 600 ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  eventCard: { backgroundColor: '#334155', borderRadius: 12, padding: 12, marginBottom: 16, position: 'relative', width: CARD_WIDTH, alignSelf: 'center', marginHorizontal: 4 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  ownerAvatar: { width:36, height:36, borderRadius:18, backgroundColor:'#6366f1', justifyContent:'center', alignItems:'center', marginRight:10 },
  ownerAvatarText: { color:'#fff', fontWeight:'700', fontSize:16 },
  ownerName: { color:'#fff', fontSize:14, fontWeight:'600' },
  ownerLabel: { color:'#94a3b8', fontSize:11, marginTop:2 },
  ownerChip: { backgroundColor:'#0ea5e9', paddingHorizontal:10, paddingVertical:4, borderRadius:16 },
  ownerChipText: { color:'#fff', fontSize:12, fontWeight:'600' },
  profileIconWrapper: { marginLeft:12, width:32, height:32, borderRadius:16, borderWidth:2, borderColor:'#0ea5e9', justifyContent:'center', alignItems:'center', backgroundColor:'#1e293b' },
  eventImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 8 },
  eventTag: { position: 'absolute', top: 12, right: 12, backgroundColor: '#6366f1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  eventTagText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  eventTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold', marginTop: 8 },
  eventInfo: { color: '#fff', marginBottom: 4 },
  eventPrice: { color: '#bef264', fontWeight: 'bold', marginBottom: 8 },
  reserveBtn: { backgroundColor: '#6366f1', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  reserveText: { color: '#fff', fontWeight: 'bold' },
  testimonialCard: { backgroundColor: '#0369a1', borderRadius: 12, padding: 16, marginRight: 16, alignItems: 'center', width: width < 600 ? width * 0.7 : 320 },
  testimonialImage: { width: 48, height: 48, borderRadius: 24, marginBottom: 8 },
  testimonialName: { color: '#fff', fontWeight: 'bold', marginBottom: 4 },
  testimonialText: { color: '#fff', textAlign: 'center' },
  footer: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginTop: 24, alignItems: 'center', marginBottom: 32 },
  footerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0ea5e9', marginBottom: 8 },
  footerDesc: { color: '#cbd5e1', textAlign: 'center', marginBottom: 12 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 },
  footerLink: { color: '#cbd5e1', marginHorizontal: 8, marginBottom: 4 },
  footerCopyright: { color: '#64748b', fontSize: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, width: width < 400 ? width - 32 : 320, alignItems: 'center', position: 'relative' },
  modalClose: { position: 'absolute', top: 8, right: 12, zIndex: 2 },
  loginTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  loginInput: { backgroundColor: '#fff', borderRadius: 8, padding: 10, width: '100%', marginBottom: 12 },
  loginBtnModal: { backgroundColor: '#0ea5e9', borderRadius: 8, padding: 10, alignItems: 'center', width: '100%', marginTop: 8 },
  loginLinks: { flexDirection: 'row', marginTop: 12 },
  loginLink: { color: '#0ea5e9', marginHorizontal: 6 },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 100,
  },
  fullMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30,41,59,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullMenuContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullMenuCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 32,
    zIndex: 2,
  },
  fullMenuCloseText: {
    color: '#fff',
    fontSize: 44,
    fontWeight: 'bold',
  },
  fullMenuOptions: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  fullMenuOption: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
    width: '80%',
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  fullMenuFooter: {
    color: '#cbd5e1',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
});