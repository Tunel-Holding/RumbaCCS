import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PersonIcon from '../components/PersonIcon';
import EmpresaMenu from '../components/EmpresaMenu';
import HamburgerMenu from '../components/HamburgerMenu';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { apiFetch } from '../services/api';

const { width } = Dimensions.get('window');

export default function EmpresaScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [modalVisible, setModalVisible] = useState({ cart: false, calendar: false, notifications: false });
  const [notifAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(true);

  const datos = false
  // Animaciones
  const menuAnim = useRef(new Animated.Value(0)).current;

  const [empresaData, setEmpresaData] = useState(null);

  const ipAddress = "192.168.1.3"; // Cambia esto por tu IP real
  
useEffect(() => {
  const fetchEmpresa = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const empresaId = await AsyncStorage.getItem("empresaId");

      if (!empresaId || !token) {
        console.warn("Falta token o empresaId");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `http://${ipAddress}:8000/api/empresas/${empresaId}/`,
        {
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`  // 🔹 IMPORTANTE
          },
        }
      );

      console.log("✅ Empresa data:", response.data);
      setEmpresaData(response.data);

    } catch (error) {
      if (error.response) {
        console.error("❌ Error HTTP:", error.response.status, error.response.data);
      } else {
        console.error("❌ Error:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  fetchEmpresa();
}, []);



//     const fetchEmpresa = async () => {
//     try {
//       const empresaId = await AsyncStorage.getItem("empresaId");

//       console.log("🏷 empresaId:", empresaId);

//       if (!empresaId) {
//         console.warn("Falta empresaId");
//         setLoading(false);
//         return;
//       }

//       // Usamos apiFetch en vez de axios
//       const { res, data } = await apiFetch(
//         `http://${ipAddress}:8000/api/empresas/${empresaId}/`
//       );

//       if (res.ok) {
//         console.log("✅ Empresa data:", data);
//         setEmpresaData(data);
//       } else {
//         console.error(`❌ Error HTTP: ${res.status}`, data);
//       }

//     } catch (error) {
//       console.error("Error al traer empresa:", error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   fetchEmpresa();
// }, []);
  // Función para obtener los datos de la empresa
  

  const empresaData1 = {
    nombre: empresaData?.nombre || 'Empresa',
    rif : empresaData?.rif || 'no disponible',
    seguidores: empresaData?.seguidores || 0,
    eventosPublicados: empresaData?.eventosPublicados || 0,
  }


  const [eventos, setEventos] = useState([]);

useEffect(() => {
  const fetchEventos = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const empresaId = await AsyncStorage.getItem("empresaId");

      if (!empresaId) {
        console.log("El usuario todavía no tiene empresa asociada.");
        setEventos([]);
        return;
      }

      else{
          const res = await fetch(`http://${ipAddress}:8000/api/empresas/${empresaId}/eventos/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);}

      const data = await res.json();
      console.log("Eventos de la empresa:", data);

      // transformar los datos al formato que quieres
      const eventosTransformados = data.map(ev => ({
        id: ev.id,
        titulo: ev.titulo,
        fecha: ev.fecha_evento || "Fecha no definida",
        ubicacion: ev.ubicacion,
        precio: ev.precio === 0 ? "Entrada libre" : `$${ev.precio.toLocaleString()}`,
        categoria: ev.categoria || "Sin categoría",
        categoriaColor: ev.categoriaColor || "#4f46e5",
        imagen: ev.imagen || "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png"
      }));
      console.log("Status:", res.status);
      console.log('Fecha:', eventosTransformados.map(ev => ev.fecha_evento));

      setEventos(eventosTransformados);
      }

      
    } catch (error) {
      console.error(error);
    }
  };

  fetchEventos();
}, []);

  // Eventos de ejemplo
  // const eventos = [




  // //   {
  // //     id: 5,
  // //     titulo: 'Noche de Stand Up',
  // //     fecha: '20 Ene 2026',
  // //     ubicacion: 'Café Teatro',
  // //     precio: '$12.000',
  // //     categoria: 'Show',
  // //     categoriaColor: '#9333ea',
  // //     imagen: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png',
  // //   },
  //  ];



  // Animación de notificaciones
  useEffect(() => {
    if (modalVisible.notifications) {
      Animated.timing(notifAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisible.notifications]);

  // Animación del menú móvil
  useEffect(() => {
    if (mobileMenuVisible) {
      Animated.timing(menuAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(menuAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [mobileMenuVisible]);

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContainer}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>R U M B A</Text>
          <Text style={styles.logoSubtext}>CCS</Text>
        </View>

                 {/* Menú hamburguesa */}
         <EmpresaMenu
           visible={mobileMenuVisible}
           setVisible={setMobileMenuVisible}
           onMenuItemPress={item => {
             setMobileMenuVisible(false);
             if (item === 'agregar_evento') {
               // Navegar a la pantalla de agregar evento
               navigation.navigate('Add');
             }
             //else if (item === 'administrar_ganancias') {
               // Aquí puedes agregar la lógica para administrar ganancias
               //console.log('Administrar ganancias');
             //}
                           else if (item === 'notifications') setModalVisible({ ...modalVisible, notifications: true });
              else if (item === 'inicio') navigation.navigate('HomeScreen');
              else if (item === 'register') navigation.navigate('Perfil');
           }}
         />
      </View>
    </View>
  );



  const renderNotificationsModal = () => (
    <Modal visible={modalVisible.notifications} transparent animationType="slide">
      {/* Fade in/out animation for notifications overlay */}
      <Animated.View
        pointerEvents={modalVisible.notifications ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 200,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: notifAnim,
        }}
      >
        <View style={{
          backgroundColor: '#1e293b',
          borderRadius: 24,
          padding: 28,
          minWidth: 300,
          maxWidth: '90%',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 12,
          position: 'relative',
        }}>
          <TouchableOpacity
            onPress={() => {
              Animated.timing(notifAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
              }).start(() => setModalVisible({ ...modalVisible, notifications: false }));
            }}
            style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ fontSize: 28, color: '#fff', fontWeight: 'bold' }}>×</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 18, textAlign: 'center' }}>Notificaciones</Text>
          {/* Ejemplo de notificaciones */}
          <View style={{ marginBottom: 16, backgroundColor: '#334155', borderRadius: 12, padding: 16 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>¡Nuevo evento disponible!</Text>
            <Text style={{ color: '#dbeafe', marginTop: 4 }}>Festival de Música Urbana - 20 Ene 2024</Text>
          </View>
          <View style={{ marginBottom: 16, backgroundColor: '#334155', borderRadius: 12, padding: 16 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Recordatorio de ticket</Text>
            <Text style={{ color: '#bbf7d0', marginTop: 4 }}>No olvides tu entrada para Nochevieja VIP</Text>
          </View>
          <View style={{ backgroundColor: '#334155', borderRadius: 12, padding: 16 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>¡Actualización de perfil!</Text>
            <Text style={{ color: '#ede9fe', marginTop: 4 }}>Tu foto de perfil fue actualizada correctamente.</Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );

  const renderPerfilEmpresa = () => (
    <View style={styles.perfilContainer}>
      <View style={styles.perfilContent}>
        {/* Foto de perfil */}
        <View style={styles.fotoContainer}>
          <TouchableOpacity
            style={styles.fotoPerfil}
            onPress={() => console.log('Editar perfil de empresa')}
            activeOpacity={0.7}
          >
            <Text style={styles.fotoIcon}>👤</Text>
          </TouchableOpacity>
        </View>
        {/* Datos de empresa */}
        <View style={styles.datosContainer}>
          <Text style={styles.empresaNombre}>{empresaData1.nombre}</Text>
          <Text style={styles.seguidoresText}>RIF: <Text style={styles.seguidoresCount}>{empresaData1.rif}</Text></Text>
          <Text style={styles.seguidoresText}>Seguidores de la empresa: <Text style={styles.seguidoresCount}>{empresaData1.seguidores}</Text></Text>
          <Text style={styles.eventosText}>Total de eventos publicados: <Text style={styles.eventosCount}>{empresaData1.eventosPublicados}</Text></Text>
          <View style={styles.accionesRow}>
            {/* Botón de seguir eliminado */}
            <TouchableOpacity
              style={styles.clasificarButton}
              activeOpacity={0.85}
              onPress={() => console.log('Valoraciones y reseñas')}
            >
              <Text style={styles.clasificarStar}>★</Text>
              <Text style={styles.clasificarText}>Valoraciones y reseñas</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  // Redes sociales dinámicas (front-only)
  const redes = [
    { id: 'ig', label: 'Instagram', icon: '📸', color: '#d946ef', url: empresaData?.instagram || null },
    { id: 'x', label: 'X', icon: '𝕏', color: '#0ea5e9', url: empresaData?.twitter || null },
    { id: 'fb', label: 'Facebook', icon: '📘', color: '#3b82f6', url: empresaData?.facebook || null },
    { id: 'tt', label: 'TikTok', icon: '🎵', color: '#14b8a6', url: empresaData?.tiktok || null },
    { id: 'yt', label: 'YouTube', icon: '▶️', color: '#ef4444', url: empresaData?.youtube || null },
    { id: 'wa', label: 'WhatsApp', icon: '💬', color: '#22c55e', url: empresaData?.whatsapp || null },
    { id: 'web', label: 'Web', icon: '🌐', color: '#f59e0b', url: empresaData?.website || null },
  ];

  const openRedSocial = (item) => {
    if (item.url) {
      Linking.openURL(item.url).catch(err => console.log('No se pudo abrir', err));
    }
  };

  const renderSocialCircles = () => {
    const hasAny = redes.some(r => !!r.url);
    if (!hasAny) return null;
    return (
      <View style={styles.socialStripContainer}>
        <Text style={styles.socialStripTitle}>Redes sociales</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {redes.filter(r => r.url).map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.socialCircle, { borderColor: r.color }]}
              activeOpacity={0.75}
              onPress={() => openRedSocial(r)}
            >
              <Text style={styles.socialIcon}>{r.icon}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderEventos = () => (
    <View style={styles.eventosContainer}>
      <View style={styles.eventosHeader}>
        <View style={{ flex:1 }}>
          <Text style={styles.eventosTitle}>Eventos publicados</Text>
          <Text style={styles.eventosTotalLinea}>Total de eventos publicados: <Text style={styles.eventosCount}>{empresaData1.eventosPublicados}</Text></Text>
        </View>
        <TouchableOpacity
          style={styles.agregarButton}
          onPress={async () => {
            const empresaId = await AsyncStorage.getItem('empresaId');
            if (empresaId) {
              navigation.navigate('Add');
            } else {
              console.log('Empresa no encontrada', empresaId);
              Alert.alert('Error', 'No tienes empresa creada');
            }
          }}
        >
          <Text style={styles.agregarIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.eventosGrid}>
        {eventos.length === 0 ? (
          <Text style={styles.eventosEmptyText}>Presiona el botón "+" para crear un evento</Text>
        ) : (
          eventos.map((evento) => (
            <View key={evento.id} style={styles.eventoCard}>
              <View style={styles.eventoImageContainer}>
                <Image 
                  source={{ uri: evento.imagen }} 
                  style={styles.eventoImage}
                  resizeMode="cover"
                />
                <View style={[styles.eventoCategoria, { backgroundColor: evento.categoriaColor }]}>
                  <Text style={styles.eventoCategoriaText}>{evento.categoria}</Text>
                </View>
              </View>
              
              <View style={styles.eventoContent}>
                <Text style={styles.eventoTitulo}>{evento.titulo}</Text>
                
                <View style={styles.eventoInfo}>
                  <Text style={styles.eventoInfoText}>📅 {evento.fecha}</Text>
                </View>
                
                <View style={styles.eventoInfo}>
                  <Text style={styles.eventoInfoText}>📍 {evento.ubicacion}</Text>
                </View>
                
                <View style={styles.eventoFooter}>
                  <Text style={styles.eventoPrecio}>{evento.precio}</Text>
                  <TouchableOpacity style={styles.verDetallesButton}>
                    <Text style={styles.verDetallesText}>Ver detalles</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
  
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

  <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
             {renderHeader()}
       {renderNotificationsModal()}
      
  <ScrollView style={[styles.scrollView, { marginTop: 16 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {renderPerfilEmpresa()}
          {renderSocialCircles()}
          {renderEventos()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  
  // Header styles
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: { flexDirection: 'row', alignItems: 'flex-end' },
  logoText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  logoSubtext: { fontSize: 18, fontWeight: '600', color: '#ff007f', marginLeft: 8 },
  
     

  

  // Perfil styles
  perfilContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  borderRadius: 16,
  paddingHorizontal: 24,
  paddingTop: 22,
  paddingBottom: 18,
  marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  perfilContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoContainer: {
    alignItems: 'center',
  },
  fotoPerfil: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#6b7280',
    marginBottom: 16,
  },
  fotoIcon: {
    fontSize: 48,
  },
  datosContainer: { alignItems: 'center', marginTop: 4 },
  empresaNombre: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  seguidoresText: { fontSize: 18, color: '#d1d5db', marginBottom: 4, textAlign: 'center' },
  seguidoresCount: {
    fontWeight: 'bold',
    color: '#db2777',
  },
  eventosText: { fontSize: 18, color: '#d1d5db', marginBottom: 16, textAlign: 'center' },
  eventosCount: {
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  accionesRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  seguirButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#db2777',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  seguirButtonActive: { backgroundColor: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', shadowColor: '#16a34a' },
  seguirIcon: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 6, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  seguirText: { color: '#ffffff', fontSize: 18, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  // Redes sociales
  socialStripContainer: { flexDirection: 'column', marginTop: 4, marginBottom: 12, paddingTop: 2 },
  socialStripTitle: { marginLeft: 4, marginBottom: 6, fontSize: 14, fontWeight: '600', color: '#e2e8f0', letterSpacing: 0.5, textTransform: 'uppercase' },
  socialCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginRight: 10, backgroundColor: '#1e293b', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 3 },
  socialIcon: { fontSize: 20, color: '#ffffff' },
  clasificarButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'linear-gradient(135deg, #075819ff 0%, #0d430bff 100%)', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, shadowColor: '#0b5318ff', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 6 }, shadowRadius: 8, elevation: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  clasificarStar: { color: '#ffffff', fontSize: 18, marginRight: 8, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  clasificarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },

  // Eventos styles
  eventosContainer: {
    // Reducido desde 48 para acercar la sección a los datos de la empresa
    marginTop: 20,
  },
  eventosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  eventosTitle: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  eventosTotalLinea: { fontSize: 16, color: '#f1f5f9', marginTop: 4, fontWeight: '600' },
  agregarButton: {
    backgroundColor: '#16a34a',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  agregarIcon: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  eventosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  eventosEmptyText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
    marginTop: 12,
    fontStyle: 'italic',
  },
  eventoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    width: width < 768 ? '100%' : width < 1024 ? '48%' : '31%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  eventoImageContainer: {
    position: 'relative',
  },
  eventoImage: {
    width: '100%',
    height: 192,
  },
  eventoCategoria: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventoCategoriaText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventoContent: {
    padding: 16,
    flex: 1,
  },
  eventoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  eventoInfo: {
    marginBottom: 4,
  },
  eventoInfoText: {
    color: '#ffffff',
    fontSize: 14,
  },
  eventoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  eventoPrecio: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#84cc16',
  },
  verDetallesButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verDetallesText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
