
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  Dimensions, Animated, Modal, SafeAreaView, ActivityIndicator,
  StatusBar, Alert, Linking, TextInput
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PersonIcon from '../components/PersonIcon';
import EmpresaMenu from '../components/EmpresaMenu';
import HamburgerMenu from '../components/HamburgerMenu';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api'; // ✅ Tu instancia centralizada

const { width } = Dimensions.get('window');

export default function EmpresaScreenUser() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const empresaIdParam = route.params?.empresaId;
  const [isFollowing, setIsFollowing] = useState(false);
  const [modalVisible, setModalVisible] = useState({ cart: false, calendar: false, notifications: false, rating: false });
  const [notifAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // Animaciones
  const menuAnim = useRef(new Animated.Value(0)).current;

  const [empresaData, setEmpresaData] = useState(null);

  useEffect(() => {
  const fetchEmpresa = async () => {
    try {
      const empresaId = empresaIdParam;
      const response = await api.get(`/api/public/empresas/${empresaId}/`);
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
}, [empresaIdParam]);
  
const enviarCalificacion = async ({ empresaId, rating, comentario }) => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
     Alert.alert('No estás logueado', 'Debes iniciar sesión para calificar');
      navigation.navigate('HomeScreen');
      return;
    }

    const res = await api.post(`/api/empresas/${empresaId}/ratings/`, {
      empresa: empresaId,
      rating,
      comentario,
    });
    console.log("Respuesta de calificación:", res.data);
    return res.data;
  } catch (e) {
    const msg = e.response?.data?.detail || e.message;
  Alert.alert('Error', msg);
  }
};

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
      const empresaId = empresaIdParam || await AsyncStorage.getItem("empresaId");

      if (!empresaId) {
        console.log("No se encontró empresaId.");
        setEventos([]);
        return;
      }

      const res = await api.get(`/api/public/empresas/${empresaId}/eventos/`);

      console.log("Data:",res.data)

      const eventosTransformados = res.data.map(ev => {
        // Separar fecha y hora si viene en formato ISO
        let fecha = "Fecha no definida";
        let hora = "Hora no definida";
        if (ev.fecha_evento) {
          const match = ev.fecha_evento.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
          if (match) {
            fecha = match[1];
            let hour = parseInt(match[2], 10);
            const minute = match[3];
            let ampm = 'AM';
            if (hour >= 12) {
              ampm = 'PM';
              if (hour > 12) hour -= 12;
            } else if (hour === 0) {
              hour = 12;
            }
            hora = `${hour}:${minute} ${ampm}`;
          } else {
            fecha = ev.fecha_evento;
          }
        }
        return {
          id: ev.id,
          titulo: ev.titulo,
          fecha: ev.fecha_evento
              ? new Date(ev.fecha_evento).toLocaleDateString()
              : (ev.creado_en ? new Date(ev.creado_en).toLocaleDateString() : 'Fecha no definida'),
          hora: ev.fecha_evento
            ? new Date(ev.fecha_evento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null,
          // fecha: ev.fecha_evento || "Fecha no definida",
          // hora: ev.hora_evento || "Hora no definida",
          ubicacion: ev.ubicacion,
          precio: ev.precio === 0 ? "Entrada libre" : `$${ev.precio.toLocaleString()}`,
          categoria: ev.categoria || "Sin categoría",
          categoriaColor: ev.categoriaColor || "#4f46e5",
          imagenes: ev.imagenes,
        };
      });

      setEventos(eventosTransformados);
    } catch (error) {
      if (error.response) {
        console.error("❌ Error HTTP:", error.response.status, error.response.data);
      } else {
        console.error("❌ Error:", error.message);
      }
    }
  };

  fetchEventos();

  }, [empresaIdParam]);

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

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContainer}>
        {/* Botón de regreso */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>R U M B A</Text>
          <Text style={styles.logoSubtext}>CCS</Text>
        </View>
        
        {/* Espacio vacío para balancear el layout */}
        <View style={styles.headerSpacer} />
      </View>
    </View>
  );

  const renderNotificationsModal = () => (
    <Modal visible={modalVisible.notifications} transparent animationType="slide">
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

  const renderRatingModal = () => (
    <Modal visible={modalVisible.rating} transparent animationType="slide">
      <View style={styles.ratingModalOverlay}>
        <View style={styles.ratingModalContent}>
          <TouchableOpacity
            onPress={() => setModalVisible({ ...modalVisible, rating: false })}
            style={styles.ratingModalClose}
          >
            <Text style={styles.ratingModalCloseText}>×</Text>
          </TouchableOpacity>
          
          <Text style={styles.ratingModalTitle}>Calificar Empresa</Text>
          <Text style={styles.ratingModalSubtitle}>¿Cómo calificarías tu experiencia?</Text>
          
          {/* Estrellas */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.star,
                  star <= rating ? styles.starFilled : styles.starEmpty
                ]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.ratingText}>
            {rating === 0 ? 'Toca una estrella para calificar' :
             rating === 1 ? 'Muy malo' :
             rating === 2 ? 'Malo' :
             rating === 3 ? 'Regular' :
             rating === 4 ? 'Bueno' : 'Excelente'}
          </Text>
          
          {/* Comentario opcional */}
          <Text style={styles.commentLabel}>Comentario (opcional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Cuéntanos tu experiencia..."
            placeholderTextColor="#888"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          
          {/* Botones */}
          <View style={styles.ratingButtonsContainer}>
            <TouchableOpacity
              style={styles.ratingCancelButton}
              onPress={() => {
                setModalVisible({ ...modalVisible, rating: false });
                setRating(0);
                setComment('');
              }}
            >
              <Text style={styles.ratingCancelText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.ratingSubmitButton, rating === 0 && styles.ratingSubmitButtonDisabled]}
              onPress={() => {
                
                if (rating > 0) {
                  console.log("Empresa id: ", empresaIdParam)
                  const valor = enviarCalificacion({ empresaId: empresaIdParam, rating, comentario: comment });
                  
                  Alert.alert('¡Gracias!', 'Tu calificación ha sido enviada.');
                  
                  setModalVisible({ ...modalVisible, rating: false });
                  setRating(0);
                  setComment('');
                }
              }}
              disabled={rating === 0}
            >
              <Text style={[styles.ratingSubmitText, rating === 0 && styles.ratingSubmitTextDisabled]}>
                Enviar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPerfilEmpresa = () => (
    <View style={styles.perfilContainer}>
      <View style={styles.perfilContent}>
        {/* Foto de perfil */}
        <View style={styles.fotoContainer}>
          <TouchableOpacity
            style={styles.fotoPerfil}
            onPress={() => console.log('Ver perfil de empresa')}
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
            <TouchableOpacity
              style={[styles.seguirButton, isFollowing && styles.seguirButtonActive]}
              onPress={toggleFollow}
              activeOpacity={0.85}
            >
              <View style={styles.seguirIcon}>
                <PersonIcon size={18} color="#ffffff" />
              </View>
              <Text style={styles.seguirText}>{isFollowing ? 'Siguiendo' : 'Seguir'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clasificarButton}
              activeOpacity={0.85}
              onPress={() => setModalVisible({ ...modalVisible, rating: true })}
            >
              <Text style={styles.clasificarStar}>★</Text>
              <Text style={styles.clasificarText}>Calificar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  // Redes sociales dinámicas
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
console.log('🖼️ URL de imagen del evento:', eventos);

  const renderEventos = () => (
    <View style={styles.eventosContainer}>
      <View style={styles.eventosHeader}>
        <View style={{ flex:1 }}>
          <Text style={styles.eventosTitle}>Eventos publicados</Text>
          <Text style={styles.eventosTotalLinea}>Total de eventos publicados: <Text style={styles.eventosCount}>{empresaData1.eventosPublicados}</Text></Text>
        </View>
      </View>

      <View style={styles.eventosGrid}>
        {eventos.length === 0 ? (
          <Text style={styles.eventosEmptyText}>Esta empresa no tiene eventos publicados</Text>
        ) : (
              eventos.map((evento) => (
                <View key={evento.id} style={styles.eventoCard}>
                  <View style={styles.eventoImageContainer}>
                    <Image
                      source={{
                        uri: evento.imagenes?.[0]?.url || 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png'
                      }}
                      style={styles.eventoImage}
                      resizeMode="cover"
                    />
                    <View style={[styles.eventoCategoria, { backgroundColor: evento.categoriaColor }]}>
                      <Text style={styles.eventoCategoriaText}>{evento.categoria}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.eventoContent}>
                    <Text style={styles.eventoTitulo}>{evento.titulo}</Text>
                    
                    {evento.hora && evento.hora !== 'Hora no definida' && (
                      <View style={styles.eventoInfo}>
                        <Text style={styles.eventoInfoText}>📅 {evento.fecha}  ⏰ {evento.hora}</Text>
                      </View>
                    )}
                    
                    <View style={styles.eventoInfo}>
                      <Text style={styles.eventoInfoText}>📍 {evento.ubicacion}</Text>
                    </View>
                    
                    <View style={styles.eventoFooter}>
                      <Text style={styles.eventoPrecio}>{evento.precio}</Text>
                        <TouchableOpacity 
                          style={styles.verDetallesButton}
                          onPress={() => {
                            console.log('Navegando a Reservar/Comprar con:', evento.id, empresaIdParam || empresaData?.id);
                            navigation.navigate('Reservar/Comprar', { idEvento: evento.id, idEmpresa: empresaIdParam ? empresaIdParam : empresaData?.id });
                          }}
                        >
                          <Text style={styles.verDetallesText}>Guardar</Text>
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
      {renderRatingModal()}
      
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
  backButton: {
    backgroundColor: '#1e293b',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: -8,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'flex-end', flex: 1, justifyContent: 'center' },
  logoText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  logoSubtext: { fontSize: 18, fontWeight: '600', color: '#ff007f', marginLeft: 8 },
  headerSpacer: {
    width: 40,
    height: 40,
  },

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

  // Rating Modal styles
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  ratingModalClose: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
  },
  ratingModalCloseText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  ratingModalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingModalSubtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
  },
  star: {
    fontSize: 32,
    marginHorizontal: 4,
  },
  starFilled: {
    color: '#fbbf24',
  },
  starEmpty: {
    color: '#6b7280',
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  commentLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4b5563',
    marginBottom: 20,
    minHeight: 80,
  },
  ratingButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  ratingCancelButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ratingCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingSubmitButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ratingSubmitButtonDisabled: {
    backgroundColor: '#4b5563',
  },
  ratingSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingSubmitTextDisabled: {
    color: '#9ca3af',
  },
});
