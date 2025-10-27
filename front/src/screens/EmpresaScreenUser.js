import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginConFallback } from '../utils/auth';
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  Dimensions, Animated, Modal, ActivityIndicator,
  StatusBar, Alert, Linking, TextInput, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import PersonIcon from '../components/PersonIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api'; // ✅ Tu instancia centralizada
import NotificationsModal from '../components/NotificationsModal';
import { formatPrice } from '../utils/priceUtils';

const { width } = Dimensions.get('window');

export default function EmpresaScreenUser() {
  const [hasEmpresa, setHasEmpresa] = useState(false);
  const [empresaReady, setEmpresaReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const empresaId = await AsyncStorage.getItem('empresaId');
        setHasEmpresa(!!(empresaId && empresaId !== ''));
      } catch (e) {
        setHasEmpresa(false);
      }
    })();
  }, []);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const empresaIdParam = route.params?.empresaId;
  const [isFollowing, setIsFollowing] = useState(false);
  const [modalVisible, setModalVisible] = useState({ cart: false, calendar: false, notifications: false, rating: false });
  const [empresaInfoVisible, setEmpresaInfoVisible] = useState(false);
  const [notifAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isEmpresaAccount, setIsEmpresaAccount] = useState(false);
  // Promedio y conteo de ratings de la empresa
  const [avgRating, setAvgRating] = useState(null);
  const [ratingsCount, setRatingsCount] = useState(0);
  // Estado para panel de reseñas
  const [showReviews, setShowReviews] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviews, setReviews] = useState([]); // current page slice
  const [allReviews, setAllReviews] = useState([]); // full list
  const [reviewsPage, setReviewsPage] = useState(0);
  const REVIEWS_PAGE_SIZE = 3;
  // Cache local de usuarios para evitar múltiples peticiones
  const usersCacheRef = useRef({});

  // Estado de sesión local (usado por handleLogin)
  const [isLogged, setIsLogged] = useState(false);




  const [empresaData, setEmpresaData] = useState(null);

  

  useEffect(() => {
  const fetchEmpresa = async () => {
    try {
      const isEmpresaAccount = await AsyncStorage.getItem('isEmpresaAccount') === 'true';
      setIsEmpresaAccount(isEmpresaAccount);
      const empresaId = empresaIdParam;
      const response = await api.get(`/api/public/empresas/${empresaId}/`);
      const data = response.data;
      if (data.is_following) {
        setIsFollowing(true);
      }
      setEmpresaData(data);

      // Intentamos obtener promedio de rating desde el propio objeto devuelto
      const possibleAvg = data.avg_rating || data.promedio_rating || data.rating_average || data.rating || data.rating_promedio || data.rating_avg;
      const possibleCount = data.total_ratings || data.ratings_count || data.total_ratings_count || data.n_ratings || data.total_reviews || 0;
      if (possibleAvg != null && possibleAvg !== '') {
        setAvgRating(Number(possibleAvg));
        setRatingsCount(Number(possibleCount) || 0);
      } else {
        // Fallback: pedir explicitamente los ratings y calcular promedio
        try {
          const rr = await api.get(`/api/empresas/${empresaId}/ratings/`);
          const items = Array.isArray(rr.data) ? rr.data : rr.data.results || [];
          if (items.length) {
            const sum = items.reduce((s, it) => s + (Number(it.rating) || 0), 0);
            setAvgRating(sum / items.length);
            setRatingsCount(items.length);
          } else {
            setAvgRating(null);
            setRatingsCount(0);
          }
        } catch (e) {
          // No bloquear si el endpoint requiere auth o falla; dejamos el promedio null
          setAvgRating(null);
          setRatingsCount(0);
        }
      }

      setEmpresaReady(true); // Set ready when data is loaded
    } catch (error) {
      if (error.response) {
        console.error("❌ Error HTTP:", error.response.status, error.response.data);
      } else {
        console.error("❌ Error:", error.message);
      }
      setEmpresaReady(false); // Not ready on error
    } finally {
      setLoading(false);
    }
  };
  fetchEmpresa();
}, [empresaIdParam]);

console.log("Empresa Data:", empresaData);
  

const [loginVisible, setLoginVisible] = useState(false);
const [user, setUser] = useState('');
const [pass, setPass] = useState('');
const [loginError, setLoginError] = useState('');
const [loginLoading, setLoginLoading] = useState(false);
// App-styled alert (local)
const [appAlertVisible, setAppAlertVisible] = useState(false);
const [appAlert, setAppAlert] = useState({ title: '', message: '' });
const showAppAlert = (title, message) => { setAppAlert({ title: title || '', message: message || '' }); setAppAlertVisible(true); };

const enviarCalificacion = async ({ empresaId, rating, comentario }) => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      setLoginVisible(true);
      return false;
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
      showAppAlert('Error', msg);
      return false;
    }
};

const handleLogin = async () => {
  let resultado;
  try {
    resultado = await loginConFallback(user, pass);
  } finally {
    // limpiar campos de login siempre
    try { setUser(''); setPass(''); } catch (e) {}
  }

  if (resultado && resultado.error) {
    switch (resultado.tipo) {
      case 'validacion':
        showAppAlert('Campos vacíos', 'Por favor ingresa email y contraseña');
        break;
      case 'error':
        showAppAlert('Error inesperado', resultado.error);
        break;
      case 'credenciales':
        showAppAlert('Error de login', 'Usuario o contraseña incorrectos');
        break;
    }
    return;
  }
  setLoginVisible(false);
  // Persist session and update local state
  try {
    if (resultado.data?.access) await AsyncStorage.setItem('accessToken', resultado.data.access);
    if (resultado.data?.refresh) await AsyncStorage.setItem('refreshToken', resultado.data.refresh);
    if (resultado.data?.user) {
      const ud = resultado.data.user;
      await AsyncStorage.setItem('userId', ud.id.toString());
      if (ud.username) await AsyncStorage.setItem('userName', ud.username);
      let cleanAvatar = ud.avatar_url || ud.avatar || null;
      if (cleanAvatar && typeof cleanAvatar === 'string') cleanAvatar = cleanAvatar.replace(/\?$/, '');
      // Update local user state if present
      // Some screens expect userData in state; set it here for header components
      // (There's no setUserData in this screen; we'll store minimal info)
      await AsyncStorage.setItem('userName', ud.username || '');
    }
    if (resultado.data?.empresa) {
      await AsyncStorage.setItem('empresaId', resultado.data.empresa.id.toString());
      await AsyncStorage.setItem('isEmpresaAccount', 'true');
      await AsyncStorage.setItem('isUserAccount', 'false');
      setIsEmpresaAccount(true);
    } else {
      await AsyncStorage.setItem('isUserAccount', 'true');
      await AsyncStorage.setItem('isEmpresaAccount', 'false');
      setIsEmpresaAccount(false);
    }
    setIsLogged(true);
  } catch (e) {
    console.log('Error persisting login info (EmpresaScreenUser):', e);
  }

};
const seguir = async () => {

    
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      setLoginVisible(true);
      return;
    }

    try {
      const res = await api.post(`/api/empresas/${empresaIdParam}/seguir/`);
      
      if (res.status === 200) {
        setIsFollowing(true);
      }
      else if (res.status === 405) {
        showAppAlert('Información', 'Ya sigues a esta empresa');
      }
    } catch (error) {
      console.error("Error al seguir a la empresa:", error);
    }
};

console.log('🏢 Datos de la empresa:', empresaData1);

  const empresaData1 = {
    nombre: empresaData?.nombre || 'Empresa',
    rif : empresaData?.rif || 'no disponible',
    seguidores: empresaData?.total_seguidores || 0,
    eventosPublicados: empresaData?.total_eventos || 0,
  }

    // Helpers to open mail and phone
    const openEmail = async (email) => {
      if (!email) return;
      const url = `mailto:${email}`;
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          showAppAlert('No disponible', 'No se pudo abrir la aplicación de correo.');
        }
    } catch (e) {
      console.log('openEmail error', e);
      showAppAlert('Error', 'No se pudo abrir la aplicación de correo.');
    }
    };

    const openPhone = async (phone) => {
      if (!phone) return;
      // Normalize phone: keep digits and leading + if present
      const cleaned = String(phone).trim().replace(/[^+\d]/g, '');
      const tel = `tel:${cleaned}`;
      try {
        // Some emulators/simulators return false for canOpenURL for tel: even when device supports it.
        // Try canOpenURL first, but always attempt openURL as a fallback.
        const supported = await Linking.canOpenURL(tel);
        if (supported) {
          await Linking.openURL(tel);
          return;
        }
        // Attempt to open anyway (works on many devices even if canOpenURL false)
        try {
          await Linking.openURL(tel);
          return;
        } catch (openErr) {
          console.log('openPhone openURL failed', openErr);
        }

        // Fallback: show the number so the user can call manually (useful on simulators)
        showAppAlert('Llamar', `No fue posible iniciar la llamada automáticamente. Marca este número: ${cleaned}`);
      } catch (e) {
        console.log('openPhone error', e);
        showAppAlert('Error', 'No se pudo iniciar la llamada.');
      }
    };


  const [eventos, setEventos] = useState([]);
  const [eventosPage, setEventosPage] = useState(1);
  const [eventosHasMore, setEventosHasMore] = useState(true);
  const [eventosLoading, setEventosLoading] = useState(false);

  const fetchEventos = async (page = 1) => {
    try {
      const empresaId = empresaIdParam || await AsyncStorage.getItem('empresaId');
      if (!empresaId) {
        setEventos([]);
        setEventosHasMore(false);
        return;
      }

      setEventosLoading(true);
      const limit = 5;
      const offset = (page - 1) * limit;

      let res;
      try {
        res = await api.get(`/api/public/empresas/${empresaId}/eventos/?limit=${limit}&offset=${offset}`);
      } catch (e) {
        // Fallback si el backend no acepta paginación por query
        res = await api.get(`/api/public/empresas/${empresaId}/eventos/`);
      }

      const raw = Array.isArray(res.data) ? res.data : (res.data.results || res.data.eventos || []);
      const pageItems = Array.isArray(raw) ? (raw.slice ? raw.slice(offset, offset + limit) : raw) : [];

      const items = pageItems.map(ev => {
        // Separar fecha y hora si viene en formato ISO
        let fecha = 'Fecha no definida';
        let hora = 'Hora no definida';
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
          ubicacion: ev.ubicacion,
          precio: formatPrice(ev.precio, ev.moneda || 'USD'),
          categoria: Array.isArray(ev.categoria) ? ev.categoria.join(' ') : (ev.categoria || "Sin categoría"),
          categoriaColor: ev.categoriaColor || '#4f46e5',
          imagenes: ev.imagenes,
        };
      });

      setEventos(prev => {
        const merged = [...prev, ...items];
        const unique = [];
        const seen = new Set();
        for (const it of merged) {
          const key = it.id ?? `${it.titulo}-${it.fecha}-${it.hora}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(it);
          }
        }
        return unique;
      });

      const hasMore = Array.isArray(raw)
        ? (raw.slice ? raw.length > offset + items.length : items.length === limit)
        : items.length === limit;
      setEventosHasMore(hasMore);
    } catch (error) {
      if (error.response) {
        console.error('❌ Error HTTP:', error.response.status, error.response.data);
      } else {
        console.error('❌ Error:', error.message);
      }
      setEventosHasMore(false);
    } finally {
      setEventosLoading(false);
    }
  };

  useEffect(() => {
    // Reset y cargar primera página al cambiar de empresa
    setEventos([]);
    setEventosPage(1);
    setEventosHasMore(true);
    fetchEventos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaIdParam]);

  const handleMainScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
    if (nearBottom && eventosHasMore && !eventosLoading) {
      const next = eventosPage + 1;
      setEventosPage(next);
      fetchEventos(next);
    }
  };
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
    <NotificationsModal visible={modalVisible.notifications} onClose={() => setModalVisible({ ...modalVisible, notifications: false })} />
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
              onPress={async () => {
                if (rating > 0) {
                  const result = await enviarCalificacion({ empresaId: empresaIdParam, rating, comentario: comment });
                  if (result !== false) {
                    Alert.alert('¡Gracias!', 'Tu calificación ha sido enviada.');
                    setModalVisible({ ...modalVisible, rating: false });
                    setRating(0);
                    setComment('');
                  }
                  // Si no hay token, el modal de login se muestra automáticamente
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
        {/* Instruction above profile photo (informative only) */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.contactHintText}>
            {isLogged ? 'Presiona la foto para ver información de contacto' : 'Inicia sesión para ver la información de la empresa'}
          </Text>
        </View>
        {/* Foto de perfil */}
        <View style={styles.fotoContainer}>
          <TouchableOpacity
            style={styles.fotoPerfil}
            onPress={() => { if (isLogged) setEmpresaInfoVisible(true); else setLoginVisible(true); }}
            activeOpacity={0.7}
          >
          {empresaData?.logo ? (
          <Image
            source={{ uri: empresaData.logo }}
            style={{ width: '100%', height: '100%', borderRadius: 100 }}
          />
        ) : (
          <Text style={styles.fotoIcon}>👤</Text>
        )}
          </TouchableOpacity>
        </View>
        {/* Modal con información de la empresa */}
        <Modal visible={empresaInfoVisible} transparent animationType="fade">
          <View style={styles.backdropCentered}>
            <View style={styles.alertBox}>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                {empresaData?.logo ? (
                  <Image source={{ uri: empresaData.logo }} style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 8 }} />
                ) : (
                  <Text style={{ fontSize: 48, marginBottom: 8 }}>👤</Text>
                )}
                <Text style={styles.alertTitle}>{empresaData?.nombre || empresaData1.nombre}</Text>
              </View>
              {/* Contact info: try several possible keys for email and phone */}
              <Text style={styles.alertMessage}>Nombre: {empresaData?.contact_name || empresaData?.owner_name || empresaData?.nombre_contacto || empresaData1.nombre}</Text>
              <TouchableOpacity onPress={() => openEmail(empresaData?.email_contacto || empresaData?.email || empresaData?.correo)} disabled={!(empresaData?.email_contacto || empresaData?.email || empresaData?.correo)}>
                <Text style={[styles.alertMessage, (empresaData?.email_contacto || empresaData?.email || empresaData?.correo) ? styles.linkText : {}]}>Email: {empresaData?.email_contacto || empresaData?.email || empresaData?.correo || 'No disponible'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openPhone(empresaData?.telefono || empresaData?.phone || empresaData?.telefono_contacto)} disabled={!(empresaData?.telefono || empresaData?.phone || empresaData?.telefono_contacto)}>
                <Text style={[styles.alertMessage, (empresaData?.telefono || empresaData?.phone || empresaData?.telefono_contacto) ? styles.linkText : {}]}>Teléfono: {empresaData?.telefono || empresaData?.phone || empresaData?.telefono_contacto || 'No disponible'}</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
                <TouchableOpacity onPress={() => setEmpresaInfoVisible(false)} style={[styles.alertBtn, styles.alertConfirm]}>
                  <Text style={[styles.alertBtnText, styles.alertConfirmText]}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* App-styled alert modal */}
        <Modal visible={appAlertVisible} transparent animationType="fade">
          <View style={styles.backdropCentered}>
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>{appAlert.title}</Text>
              <Text style={styles.alertMessage}>{appAlert.message}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
                <TouchableOpacity onPress={() => setAppAlertVisible(false)} style={[styles.alertBtn, styles.alertConfirm]}>
                  <Text style={[styles.alertBtnText, styles.alertConfirmText]}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* Datos de empresa */}
        <View style={styles.datosContainer}>
          <Text style={styles.empresaNombre}>{empresaData1.nombre}</Text>
          {/* Mostrar promedio de ratings debajo del nombre si está disponible */}
          {avgRating != null ? (
            <Text style={styles.avgRatingText}>{avgRating.toFixed(1)} / 5 · <TouchableOpacity onPress={async () => {
                // Toggle panel y cargar reseñas si es la primera vez
                if (!showReviews && reviews.length === 0) {
                  setReviewsLoading(true);
                  try {
                    const empresaId = empresaIdParam || empresaData?.id;
                    const rr = await api.get(`/api/empresas/${empresaId}/ratings/`);
                    const items = Array.isArray(rr.data) ? rr.data : rr.data.results || [];
                    // Mapear ids de usuario a username (author_name)
                    const userIds = [...new Set(items.map(i => i.usuario || i.usuario_id).filter(Boolean))];
                    const usersMap = {};
                    if (userIds.length) {
                      try {
                        const toFetch = userIds.filter(id => !usersCacheRef.current[id]);
                        const userPromises = toFetch.map(id =>
                          api.get(`/api/usuarios/${id}/`).then(res => ({ id, data: res.data })).catch(() => ({ id, data: null }))
                        );
                        const usersResults = await Promise.all(userPromises);
                        usersResults.forEach(u => {
                          if (u.data) {
                            usersCacheRef.current[u.id] = u.data.username || u.data.nombre || u.data.name || `Usuario #${u.id}`;
                          } else {
                            usersCacheRef.current[u.id] = `Usuario #${u.id}`;
                          }
                        });
                        // Rellenar usersMap desde el cache
                        userIds.forEach(id => { usersMap[id] = usersCacheRef.current[id]; });
                      } catch (e) {
                        console.warn('Error cargando usuarios de reseñas', e);
                      }
                    }
                    const itemsConAutor = items.map(it => ({
                      ...it,
                      author_name: usersMap[it.usuario] || usersMap[it.usuario_id] || it.usuario_nombre || it.username || it.author_name || `Usuario #${it.usuario || it.usuario_id || 'desconocido'}`
                    }));
                    // Ordenar por fecha ascendente (más antiguas primero) y paginar de 3 en 3
                    const parseTime = (x) => new Date(x?.creado_en || x?.created_at || x?.createdAt || 0).getTime();
                    const sorted = itemsConAutor.sort((a,b) => parseTime(a) - parseTime(b));
                    setAllReviews(sorted);
                    setReviews(sorted.slice(0, REVIEWS_PAGE_SIZE));
                    setReviewsPage(0);
                  } catch (e) {
                    setReviews([]);
                  } finally {
                    setReviewsLoading(false);
                    setShowReviews(s => !s);
                  }
                } else {
                  setShowReviews(s => !s);
                }
              }}>
                <Text style={styles.ratingsCountText}>Ver reseña</Text>
              </TouchableOpacity></Text>
          ) : (
            <TouchableOpacity onPress={async () => {
              // intentar abrir panel de reseñas aunque avg sea null (posible que existan sin promedio)
              if (!showReviews && reviews.length === 0) {
                setReviewsLoading(true);
                try {
                  const empresaId = empresaIdParam || empresaData?.id;
                  const rr = await api.get(`/api/empresas/${empresaId}/ratings/`);
                  const items = Array.isArray(rr.data) ? rr.data : rr.data.results || [];
                  // Mapear ids de usuario a username (author_name)
                  const userIds = [...new Set(items.map(i => i.usuario || i.usuario_id).filter(Boolean))];
                  const usersMap = {};
                    if (userIds.length) {
                      try {
                        const toFetch = userIds.filter(id => !usersCacheRef.current[id]);
                        const userPromises = toFetch.map(id =>
                          api.get(`/api/usuarios/${id}/`).then(res => ({ id, data: res.data })).catch(() => ({ id, data: null }))
                        );
                        const usersResults = await Promise.all(userPromises);
                        usersResults.forEach(u => {
                          if (u.data) {
                            usersCacheRef.current[u.id] = u.data.username || u.data.nombre || u.data.name || `Usuario #${u.id}`;
                          } else {
                            usersCacheRef.current[u.id] = `Usuario #${u.id}`;
                          }
                        });
                        // Rellenar usersMap desde el cache
                        userIds.forEach(id => { usersMap[id] = usersCacheRef.current[id]; });
                      } catch (e) {
                        console.warn('Error cargando usuarios de reseñas', e);
                      }
                    }
                  const itemsConAutor = items.map(it => ({
                    ...it,
                    author_name: usersMap[it.usuario] || usersMap[it.usuario_id] || it.usuario_nombre || it.username || it.author_name || `Usuario #${it.usuario || it.usuario_id || 'desconocido'}`
                  }));
                  // Ordenar ascendente y preparar paginado de 3 en 3
                  const parseTime = (x) => new Date(x?.creado_en || x?.created_at || x?.createdAt || 0).getTime();
                  const sorted = itemsConAutor.sort((a,b) => parseTime(a) - parseTime(b));
                  setAllReviews(sorted);
                  setReviews(sorted.slice(0, REVIEWS_PAGE_SIZE));
                  setReviewsPage(0);
                } catch (e) {
                  setReviews([]);
                } finally {
                  setReviewsLoading(false);
                  setShowReviews(s => !s);
                }
              } else {
                setShowReviews(s => !s);
              }
            }}>
              <Text style={styles.avgRatingText}>Sin reseñas todavía</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.seguidoresText}>RIF: <Text style={styles.seguidoresCount}>{empresaData1.rif}</Text></Text>
          
          <Text style={styles.seguidoresText}>Seguidores de la empresa: <Text style={styles.seguidoresCount}>{empresaData1.seguidores}</Text></Text>
          <Text style={styles.eventosText}>Total de eventos publicados: <Text style={styles.eventosCount}>{empresaData1.eventosPublicados}</Text></Text>
          {!isEmpresaAccount && (
            <View style={styles.accionesRow}>
              <TouchableOpacity
                style={[styles.seguirButton, isFollowing && styles.seguirButtonActive]}
                onPress={seguir}
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
          )}
        </View>
      </View>
    </View>
  );

  // Panel desplegable de reseñas
  const renderReviewsPanel = () => {
    if (!showReviews) return null;
    return (
      <View style={styles.reviewsPanel}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsHeaderTitle}>Reseñas</Text>
          <TouchableOpacity onPress={() => setShowReviews(false)}>
            <Text style={styles.reviewsClose}>Cerrar</Text>
          </TouchableOpacity>
        </View>
        {reviewsLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (allReviews?.length || 0) === 0 ? (
          <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 12 }}>No hay reseñas todavía.</Text>
        ) : (
          <View>
            <ScrollView style={{ maxHeight: 300 }}>
              {reviews.map((r, idx) => (
                <View key={r.id || idx} style={styles.reviewCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.reviewUser}>{ r.author_name || 'Usuario'}</Text>
                    <Text style={styles.reviewRating}>{(r.rating || r.valor || r.score) ? `${Number(r.rating || r.valor || r.score).toFixed(1)} / 5` : ''}</Text>
                  </View>
                  {r.comentario ? (
                    <Text style={styles.reviewComment}>{r.comentario}</Text>
                  ) : null}
                  {r.creado_en || r.created_at ? (
                    <Text style={styles.reviewDate}>{new Date(r.creado_en || r.created_at).toLocaleString()}</Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  const prev = Math.max(0, reviewsPage - 1);
                  setReviewsPage(prev);
                  const start = prev * REVIEWS_PAGE_SIZE;
                  setReviews(allReviews.slice(start, start + REVIEWS_PAGE_SIZE));
                }}
                disabled={reviewsPage === 0}
                style={{ padding: 8, opacity: reviewsPage === 0 ? 0.5 : 1 }}
              >
                <Text style={{ color: '#60a5fa', fontSize: 16 }}>{'← Anteriores'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const maxPage = Math.max(0, Math.ceil(allReviews.length / REVIEWS_PAGE_SIZE) - 1);
                  const next = Math.min(maxPage, reviewsPage + 1);
                  setReviewsPage(next);
                  const start = next * REVIEWS_PAGE_SIZE;
                  setReviews(allReviews.slice(start, start + REVIEWS_PAGE_SIZE));
                }}
                disabled={(reviewsPage + 1) * REVIEWS_PAGE_SIZE >= allReviews.length}
                style={{ padding: 8, opacity: (reviewsPage + 1) * REVIEWS_PAGE_SIZE >= allReviews.length ? 0.5 : 1 }}
              >
                <Text style={{ color: '#60a5fa', fontSize: 16 }}>{'Siguientes →'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

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
  if (!empresaReady) return null;

  const arr = Array.isArray(empresaData?.redes_sociales) ? empresaData.redes_sociales : [];

  if (!arr.length) {
    // Fallback: intentar detectar campos directos en empresaData (por si el backend los expone así)
    const directKeys = ['instagram','facebook','tiktok','youtube','whatsapp','website','x','twitter'];
    const fallbackMap = {};
    directKeys.forEach(k => {
      if (empresaData?.[k]) fallbackMap[k] = empresaData[k];
    });
    if (Object.keys(fallbackMap).length === 0) return null;
  }

  const redesMap = {};

  const normalizeUrl = (u) => {
    if (!u) return null;
    let url = String(u).trim();
    // Mantener mailto: tal cual
    if (/^mailto:/i.test(url)) return url;
    // Si parece un correo y no tiene esquema, construir mailto:
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
    // Asegurar http(s) para enlaces web
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url.replace(/^\/+/, '');
    }
    return url;
  };

  arr.forEach(red => {
    const tipoRaw = (red?.tipo || red?.platform || red?.nombre || '').toString().toLowerCase().trim();
    let key = tipoRaw;
    if (['ig','insta'].includes(key)) key = 'instagram';
    if (['x','twitter'].includes(key)) key = 'twitter';
    if (['fb','face'].includes(key)) key = 'facebook';
    if (['tt','tik_tok','tiktoc'].includes(key)) key = 'tiktok';
  if (['yt','you_tube'].includes(key)) key = 'youtube';
    if (['wa','wasap','whats','whatsapp'].includes(key)) key = 'whatsapp';
  if (['mail','correo','email'].includes(key)) key = 'email';
  if (['web','site','pagina','website'].includes(key)) key = 'website';

    const rawUrl = red?.url || red?.link || red?.enlace || red?.full_url;
    const finalUrl = normalizeUrl(rawUrl);
    if (key && finalUrl) {
      redesMap[key] = finalUrl;
    }
  });

  // Merge fallback direct fields
  ['instagram','twitter','facebook','tiktok','youtube','whatsapp','website','email'].forEach(k => {
    if (!redesMap[k] && empresaData?.[k]) {
      const u = normalizeUrl(empresaData[k]);
      if (u) redesMap[k] = u;
    }
  });

  const redes = [
    { id: 'ig', label: 'Instagram', icon: '📸', color: '#d946ef', url: redesMap.instagram },
    { id: 'x', label: 'X', icon: '𝕏', color: '#0ea5e9', url: redesMap.twitter },
    { id: 'fb', label: 'Facebook', icon: '📘', color: '#3b82f6', url: redesMap.facebook },
    { id: 'tt', label: 'TikTok', icon: '🎵', color: '#14b8a6', url: redesMap.tiktok },
    { id: 'yt', label: 'YouTube', icon: '▶️', color: '#ef4444', url: redesMap.youtube },
    { id: 'wa', label: 'WhatsApp', icon: '💬', color: '#22c55e', url: redesMap.whatsapp },
    { id: 'email', label: 'Email', icon: '✉️', color: '#f97316', url: redesMap.email },
    { id: 'web', label: 'Web', icon: '🌐', color: '#f59e0b', url: redesMap.website },
  ];

  const visibles = redes.filter(r => !!r.url);
  if (!visibles.length) return null;

  return (
    <View style={styles.socialStripContainer}>
      <Text style={styles.socialStripTitle}>Redes sociales</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {visibles.map(r => (
          <TouchableOpacity
            key={r.id}
            style={[styles.socialCircle, { borderColor: r.color }]}
            activeOpacity={0.75}
            onPress={() => Linking.openURL(r.url)}
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
          <Text style={styles.eventosTotalLinea}>Total de eventos publicados: <Text style={styles.eventosCount}>{eventos.length}</Text></Text>
        </View>
      </View>

      <View style={styles.eventosGrid}>
        {eventosLoading && eventos.length === 0 ? (
          <View style={{ width: '100%', alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={{ color: '#94a3b8', marginTop: 8 }}>Cargando eventos…</Text>
          </View>
        ) : eventos.length === 0 ? (
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
                          <Text style={styles.verDetallesText}>{'Ver detalles'}</Text>
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
  <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Modal de Login SIEMPRE al nivel más alto */}
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

      {renderHeader()}
      {renderNotificationsModal()}
      {renderRatingModal()}
      
      <ScrollView style={[styles.scrollView, { marginTop: 16 }]} showsVerticalScrollIndicator={false} onScroll={handleMainScroll} scrollEventThrottle={100}>
        <View style={styles.content}>
          {renderPerfilEmpresa()}
          {renderReviewsPanel()}
          {renderSocialCircles()}
          {renderEventos()}
          {eventosLoading && eventos.length > 0 && (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text style={{ color: '#94a3b8', marginTop: 8 }}>Cargando más eventos…</Text>
            </View>
          )}
          {!eventosLoading && !eventosHasMore && eventos.length > 0 && (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: '#64748b' }}>Has llegado al final</Text>
            </View>
          )}
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
    textAlign: 'center',
  },
  alertMessage: {
    color: '#cbd5e1',
    fontSize: 15,
    marginBottom: 6,
    lineHeight: 20,
    textAlign: 'center',
  },
  alertBtnsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  alertBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginLeft: 10 },
  alertCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155' },
  alertConfirm: { backgroundColor: '#0ea5e9' },
  alertBtnText: { fontSize: 15, fontWeight: '600' },
  alertCancelText: { color: '#94a3b8' },
  alertConfirmText: { color: '#012a36' },
  linkText: { color: '#0ea5e9', textDecorationLine: 'underline' },
  contactHintText: { color: '#cbd5e1', fontSize: 13, textAlign: 'center', marginBottom: 6 },
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
  avgRatingText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  ratingsCountText: {
    color: '#d1d5db',
    fontWeight: '600',
  },
  reviewsPanel: {
    backgroundColor: 'rgba(17,24,39,0.95)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewsHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  reviewsClose: { color: '#60a5fa', fontWeight: '600' },
  reviewCard: { backgroundColor: '#0f172a', padding: 10, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#1f2a44' },
  reviewUser: { color: '#fff', fontWeight: '700' },
  reviewRating: { color: '#fbbf24', fontWeight: '700' },
  reviewComment: { color: '#e2e8f0', marginTop: 6 },
  reviewDate: { color: '#94a3b8', marginTop: 6, fontSize: 12 },
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
   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, width: width < 400 ? width - 32 : 320, alignItems: 'center', position: 'relative' },
  modalClose: { position: 'absolute', top: 8, right: 12, zIndex: 2 },
  loginTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  loginInput: { backgroundColor: '#fff', borderRadius: 8, padding: 10, width: '100%', marginBottom: 12 },
  loginBtnModal: { backgroundColor: '#0ea5e9', borderRadius: 8, padding: 10, alignItems: 'center', width: '100%', marginTop: 8 },
  loginLinks: { flexDirection: 'row', marginTop: 12 },
  loginLink: { color: '#0ea5e9', marginHorizontal: 6 },
});
