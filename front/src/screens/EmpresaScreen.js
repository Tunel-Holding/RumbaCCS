  // ...existing code...
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
  ActivityIndicator,
  StatusBar,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import EmpresaMenu from '../components/EmpresaMenu';
import NotificationsModal from '../components/NotificationsModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { formatPrice } from '../utils/priceUtils';

const { width } = Dimensions.get('window');

export default function EmpresaScreen() {
  // Estado y lógica para seguidores
  const [seguidores, setSeguidores] = useState([]);
  const [seguidoresModal, setSeguidoresModal] = useState(false);
  const [seguidoresLoading, setSeguidoresLoading] = useState(false);
  const [seguidoresPage, setSeguidoresPage] = useState(1);
  const [seguidoresHasMore, setSeguidoresHasMore] = useState(true);
  const [empresaReady, setEmpresaReady] = useState(false);


  // Función para obtener los seguidores de la empresa
  const fetchSeguidores = async (page = 1) => {
    setSeguidoresLoading(true);
    try {
      const empresaId = await AsyncStorage.getItem('empresaId');
      if (!empresaId) {
        setSeguidores([]);
        setSeguidoresLoading(false);
        setSeguidoresHasMore(false);
        return;
      }
      const res = await api.get(`/api/empresas/${empresaId}/seguidores/?limit=10&offset=${(page-1)*10}`);
      const data = res.data || [];
      
      // Si la API devuelve { results: [...] } usa eso
      const items = Array.isArray(data) ? data : (data.results || []);
      setSeguidores(prev => page === 1 ? items : [...prev, ...items]);
      setSeguidoresHasMore(items.length === 10);
    } catch (e) {
      setSeguidores([]);
      setSeguidoresHasMore(false);
    } finally {
      setSeguidoresLoading(false);
    }
  };


  // Modal para mostrar los seguidores
  const seguidoresScrollRef = useRef();
  const handleSeguidoresScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isBottom && seguidoresHasMore && !seguidoresLoading) {
      setSeguidoresPage(prev => {
        const next = prev + 1;
        fetchSeguidores(next);
        return next;
      });
    }
  };

  const renderSeguidoresModal = () => (
    <Modal
      visible={seguidoresModal}
      animationType="slide"
      transparent
      onRequestClose={() => setSeguidoresModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSeguidoresModal(false)}>
            <Text style={{ fontSize: 24, color: '#0ea5e9' }}>×</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18, marginBottom: 12 }}>Usuarios que te siguen</Text>

          <ScrollView
            style={{ maxHeight: 320, width: '100%' }}
            ref={seguidoresScrollRef}
            onScroll={handleSeguidoresScroll}
            scrollEventThrottle={100}
            showsVerticalScrollIndicator={false}
          >
            {seguidores.length === 0 && !seguidoresLoading ? (
              <View style={{ paddingVertical: 28 }}>
                <Text style={{ color: '#94a3b8', textAlign: 'center' }}>No tienes seguidores aún.</Text>
              </View>
            ) : (
              seguidores.map((seguidor, idx) => (
                <View key={seguidor.id || idx} style={styles.seguidorCard}>
                  
                    <View style={styles.seguidorAvatarPlaceholder}>
                      <Text style={{ fontSize: 20, color: '#94a3b8' }}>👤</Text>
                    </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={styles.seguidorName}>{seguidor.username || seguidor.nombre || 'Usuario'}</Text>
                    {seguidor.email && <Text style={styles.seguidorMeta}>{seguidor.email}</Text>}
                  </View>
                </View>
              ))
            )}

            {seguidoresLoading && (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0ea5e9" />
                <Text style={{ color: '#94a3b8', marginTop: 8 }}>Cargando...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [modalVisible, setModalVisible] = useState({ cart: false, calendar: false, notifications: false });
  const [showRatingsPanel, setShowRatingsPanel] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [notifAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(true);
  const [avatarLoading, setAvatarLoading] = useState(false);


  // Animaciones
  const menuAnim = useRef(new Animated.Value(0)).current;

  const [empresaData, setEmpresaData] = useState(null);

  // Estado derivado para controlar UI cuando la empresa está pendiente o rechazada
  const status = empresaData?.status;
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';
  const isBlocked = isPending || isRejected;

  const parseRejectionReasons = (text) => {
    if (!text) return [];
    // 1. Unificar saltos y sustituir separadores comunes por "\n"
    let cleaned = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u2022/g, '\n')   // bullet •
      .replace(/•/g, '\n')
      .replace(/;/g, '\n');

    // 2. Si hay muchos '.' seguidos de espacio que separan frases, los convertimos provisionalmente
    //    (solo si no hay ya varios saltos)
    if (!cleaned.includes('\n')) {
      cleaned = cleaned.replace(/\. +/g, '\n');
    }

    // 3. Split final
    let parts = cleaned
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    // 4. Si todavía quedó todo en una sola línea, intentar dividir por punto final
    if (parts.length <= 1) {
      const dotParts = text
        .split('.')
        .map(s => s.trim())
        .filter(Boolean);
      if (dotParts.length > 1) parts = dotParts;
    }

    // 5. Eliminar duplicados accidentales
    const unique = [];
    const seen = new Set();
    for (const p of parts) {
      if (!seen.has(p.toLowerCase())) {
        seen.add(p.toLowerCase());
        unique.push(p);
      }
    }
    return unique;
  };

  useEffect(() => {
  const fetchEmpresa = async () => {
    try {
     const empresaId = await AsyncStorage.getItem("empresaId");
      if (!empresaId) {
        console.warn("Falta empresaId");
        setLoading(false);
        return;
      }

      const response = await api.get(`/api/empresas/${empresaId}/`);

      
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

useEffect(() => {
  if (empresaData && empresaData.id) {
    setEmpresaReady(true);
  }
}, [empresaData]);


  // Datos de empresa con valores por defecto si no hay datos
  const empresaData1 = {
    nombre: empresaData?.nombre || 'Empresa',
    rif : empresaData?.rif || 'no disponible',
    seguidores: empresaData?.total_seguidores || 0,
    total_eventos: empresaData?.total_eventos || 0,
  }

const handleUploadFoto = async (empresaId) => {
  if (!empresaId) return { ok: false, error: 'No empresa id' };

  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permisos', 'Se requieren permisos para acceder a la galería.');
      return { ok: false, cancelled: true };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker?.MediaType?.Images
        ? ImagePicker.MediaType.Images
        : (ImagePicker?.MediaTypeOptions?.Images || undefined),
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
      base64: false,
      exif: false,
    });

    if (!result || result.canceled) return { ok: false, cancelled: true };

    const uri = result.assets?.[0]?.uri || result.uri;
    if (!uri) return { ok: false, cancelled: true };

    setAvatarLoading(true);

    let uploadUri = uri;
    try {
      const manip = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (manip?.uri) uploadUri = manip.uri;
    } catch (_) {}

    const fileName = uploadUri.split('/').pop();
    const match = (fileName || '').match(/\.([0-9a-z]+)(?:\?|$)/i);
    const ext = match ? match[1] : 'jpg';
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: uploadUri,
      name: fileName || `logo_${Date.now()}.${ext}`,
      type: mime,
    });

    const response = await api.post(
      `/api/empresas/${empresaId}/upload-foto/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    setAvatarLoading(false);

    const logoUrlRaw = response.data?.logo || null;
    const cleanLogoUrl = typeof logoUrlRaw === 'string' ? logoUrlRaw.replace(/\?$/, '') : logoUrlRaw;

    setEmpresaData((prev) => ({ ...prev, logo: cleanLogoUrl }));

    return { ok: true };
  } catch (err) {
    if (err.response) {
    console.log('Respuesta con error:', err.response.status, err.response.data);
    } else {
      console.log('Error de red:', err.message);
    }
    console.log('Error al subir logo (client):', err);
    setAvatarLoading(false);
    const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Error inesperado';
    Alert.alert('Error', msg);
    return { ok: false, error: msg };
  }
};

  const [eventos, setEventos] = useState([]);

// useEffect(() => {
//   const fetchEventos = async () => {
//     try {
//      const empresaId = await AsyncStorage.getItem("empresaId");

//       if (!empresaId) {
//         console.log("El usuario todavía no tiene empresa asociada.");
//         setEventos([]);
//         return;
//       }

//       const res = await api.get(`/api/empresas/${empresaId}/eventos/`);

//       const resultadosRaw = Array.isArray(res.data.results) ? res.data.results : [];

//       // Filtrar para mostrar solo eventos cuya fecha >= fecha actual (comparación por día)
//       // Eventos sin `fecha_evento` se mostrarán (no se consideran 'pasados')
//       const hoy = new Date();
//       hoy.setHours(0,0,0,0);
//       const futurosRaw = resultadosRaw.filter(ev => {
//         if (!ev || !ev.fecha_evento) return true;
//         const d = new Date(ev.fecha_evento);
//         if (isNaN(d.getTime())) return true; // si la fecha no es válida, mostrar
//         d.setHours(0,0,0,0);
//         return d >= hoy;
//       });

//       const eventosTransformados = futurosRaw.map(ev => ({
//         id: ev.id,
//         titulo: ev.titulo,
//         fecha: ev.fecha_evento
//             ? new Date(ev.fecha_evento).toLocaleDateString()
//             : (ev.creado_en ? new Date(ev.creado_en).toLocaleDateString() : 'Fecha no definida'),
//         hora: ev.fecha_evento
//           ? new Date(ev.fecha_evento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
//           : null,
//         // fecha: ev.fecha_evento || "Fecha no definida",
//         // hora: ev.hora_evento || "Hora no definida",
//   ubicacion: ev.ubicacion,
//   precio: formatPrice(ev.precio, ev.moneda || 'USD'),
//         categoria: Array.isArray(ev.categoria) ? ev.categoria.join(' ') : (ev.categoria || "Sin categoría"),
//         categoriaColor: ev.categoriaColor || "#4f46e5",
//         imagen: ev.imagen || "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png",
//         imagenes: ev.imagenes,
//         ownerName: ev.ownerName || `Empresa #${empresaId}`,
//         empresaId: ev.empresaId || empresaId,
//       }));

//       setEventos(eventosTransformados);
//    } catch (error) {
//       if (error.response) {
//         console.error("❌ Error HTTP:", error.response.status, error.response.data);
//       } else {
//         console.error("❌ Error:", error.message);
//       }
//    }
//   };

//   fetchEventos(); }, []);

  // Animación de notificaciones
  
useEffect(() => {
  const fetchEventos = async () => {
    try {
      const empresaId = await AsyncStorage.getItem("empresaId");

      if (!empresaId) {
        console.log("El usuario todavía no tiene empresa asociada.");
        setEventos([]);
        return;
      }

      const res = await api.get(`/api/empresas/${empresaId}/eventos/`);

      const resultadosRaw = Array.isArray(res.data.results) ? res.data.results : [];

      // ✅ Ya no filtramos por fecha, usamos todos los eventos
      const eventosTransformados = resultadosRaw.map(ev => ({
        id: ev.id,
        titulo: ev.titulo,
        fecha: ev.fecha_evento
          ? new Date(ev.fecha_evento).toLocaleDateString()
          : (ev.creado_en ? new Date(ev.creado_en).toLocaleDateString() : "Fecha no definida"),
        hora: ev.fecha_evento
          ? new Date(ev.fecha_evento).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : null,
        ubicacion: ev.ubicacion,
        precio: formatPrice(ev.precio, ev.moneda || "USD"),
        categoria: Array.isArray(ev.categoria) ? ev.categoria.join(" ") : (ev.categoria || "Sin categoría"),
        categoriaColor: ev.categoriaColor || "#4f46e5",
        imagen: ev.imagen || "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png",
        imagenes: ev.imagenes,
        ownerName: ev.ownerName || `Empresa #${empresaId}`,
        empresaId: ev.empresaId || empresaId,
      }));

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
}, []);

  
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
        />
      </View>
    </View>
  );

  const renderNotificationsModal = () => (
    <NotificationsModal visible={modalVisible.notifications} onClose={() => setModalVisible({ ...modalVisible, notifications: false })} />
  );

  const [profilePicModal, setProfilePicModal] = useState(false);
  const [profilePicLoading, setProfilePicLoading] = useState(false);
  const [profilePicEdit, setProfilePicEdit] = useState(null); // { uri }
  const [profilePicEditVisible, setProfilePicEditVisible] = useState(false);
  // Settings modal for empresa (similar to PerfilScreen)
  const [settingsModal, setSettingsModal] = useState(false);
  const [editNameModalEmpresa, setEditNameModalEmpresa] = useState(false);
  const [editEmpresaNameText, setEditEmpresaNameText] = useState('');
  const [editEmpresaNameLoading, setEditEmpresaNameLoading] = useState(false);

  const renderPerfilEmpresa = () => (
    <View style={styles.perfilContainer}>
      <View style={styles.perfilContent}>
 <View style={{ marginBottom: 8 }}>
          <Text style={styles.profileHintText}>Presione aquí para ver ajustes de cuenta</Text>
        </View>
        {/* Foto de perfil */}
        <View style={styles.fotoContainer}>
          <TouchableOpacity
            style={styles.fotoPerfil}
            onPress={async () => {
              // Abrir modal de ajustes en vez de iniciar la carga directa
              if (isBlocked) {
                Alert.alert('Aviso', 'No se puede acceder a los ajustes hasta que la empresa esté verificada');
                return;
              }
              setSettingsModal(true);
            }}
            activeOpacity={0.7}
          >
            {avatarLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            ) : empresaData?.logo ? (
              <Image
                source={{ uri: empresaData.logo }}
                style={{ width: '100%', height: '100%', borderRadius: 100 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: '100%', height: '100%', borderRadius: 64, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                            <Image
                              source={require('../../assets/cotele.png')}
                              // Imagen más pequeña (96x96) centrada; la desplazamos levemente hacia arriba para ocultar texto inferior
                              style={{ width: '100%', height: '100%'}}
                              resizeMode="cover"
                            />
                          </View>
            )}
        </TouchableOpacity>
        </View>

        {/* Modal de ajustes de cuenta para la empresa (similar a PerfilScreen) */}
        <Modal
          visible={settingsModal}
          animationType="fade"
          transparent
          onRequestClose={() => setSettingsModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.settingsCard}>
              <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setSettingsModal(false)}>
                <Text style={{ color:'#ffffffff', fontSize: 18, fontWeight:'700' }}>X</Text>
              </TouchableOpacity>
              <Text style={styles.settingsTitle}>Ajustes de empresa</Text>

              <View style={styles.settingsAvatarRow}>
                <View style={styles.avatarPreviewOuter}>
                  {profilePicLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : empresaData?.logo ? (
                    <Image source={{ uri: empresaData.logo }} style={styles.avatarPreview} />
                  ) : (
                    <View style={styles.avatarPlaceholder}><Text style={{ color:'#94a3b8' }}>🏢</Text></View>
                  )}
                </View>

                <View style={{ marginLeft: 12, flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.settingsName}>{empresaData?.nombre || 'Empresa'}</Text>
                      <TouchableOpacity onPress={() => {
                        setEditEmpresaNameText(empresaData?.nombre || '');
                        setSettingsModal(false);
                        setTimeout(() => setEditNameModalEmpresa(true), 120);
                      }} style={{ marginLeft: 8 }} accessibilityLabel="Editar nombre de empresa">
                        {/* reuse Ionicons if available */}
                        <Text style={{ color: '#9ca3af', fontSize: 16 }}>✎</Text>
                      </TouchableOpacity>
                    </View>
                    {empresaData?.email && <Text style={styles.settingsEmail}>{empresaData?.email}</Text>}
                  </View>

                 
                </View>
              </View>

              <TouchableOpacity
                style={styles.settingsButton}
                onPress={async () => {
                  setSettingsModal(false);
                  const empresaId = empresaData?.id || await AsyncStorage.getItem('empresaId');
                  if (!empresaId) { Alert.alert('Error','Empresa no identificada'); return; }
                  const res = await handleUploadFoto(empresaId);
                  if (res?.ok) Alert.alert('Éxito','Foto de perfil actualizada correctamente.');
                }}
              >
                <Text style={styles.settingsButtonText}>Cambiar foto de empresa</Text>
              </TouchableOpacity>

              {/* Botón para añadir redes sociales desde ajustes */}
              <TouchableOpacity
                style={[styles.settingsButton, { backgroundColor: '#0b1220', borderWidth:1, borderColor:'#0ea5e9' }]}
                onPress={async () => {
                  // Abrir modal para añadir red social
                  setSettingsModal(false);
                  // esperar un pelín para evitar que dos modals se solapen
                  setTimeout(() => setAddSocialModal(true), 120);
                }}
              >
                <Text style={[styles.settingsButtonText, { color: '#0ea5e9' }]}>Añadir redes sociales</Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>
        {/* Modal para editar nombre de la empresa (nuevo) */}
        <Modal visible={editNameModalEmpresa} animationType="fade" transparent onRequestClose={() => setEditNameModalEmpresa(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Editar nombre de empresa</Text>
              <TextInput value={editEmpresaNameText} onChangeText={setEditEmpresaNameText} placeholder="Nombre de la empresa" placeholderTextColor="#94a3b8" style={{ backgroundColor: '#0b1220', color:'#fff', padding:10, borderRadius:8 }} />
              <View style={{ flexDirection:'row', marginTop:12 }}>
                <TouchableOpacity style={[styles.settingsButton, { flex:1, marginRight:8 }]} onPress={async () => {
                  try {
                    setEditEmpresaNameLoading(true);
                    const empresaId = empresaData?.id || await AsyncStorage.getItem('empresaId');
                    if (!empresaId) { Alert.alert('Error','Empresa no identificada'); setEditEmpresaNameLoading(false); return; }
                    const payload = { nombre: editEmpresaNameText };
                    await api.patch(`/api/empresas/${empresaId}/`, payload);
                    setEmpresaData(prev => ({ ...prev, nombre: editEmpresaNameText }));
                    setEditNameModalEmpresa(false);
                    setSettingsModal(true);
                  } catch (e) {
                    console.log('Error guardando nombre de empresa', e);
                    Alert.alert('Error','No se pudo guardar el nombre.');
                  } finally { setEditEmpresaNameLoading(false); }
                }} disabled={editEmpresaNameLoading}>
                  {editEmpresaNameLoading ? <ActivityIndicator color="#051025" /> : <Text style={styles.settingsButtonText}>Guardar</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.settingsButton, { flex:1, backgroundColor:'#374151' }]} onPress={() => { setEditNameModalEmpresa(false); setSettingsModal(true); }}>
                  <Text style={[styles.settingsButtonText, { color:'#fff' }]}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Datos de empresa */}
        <View style={styles.datosContainer}>
          <Text style={styles.empresaNombre}>{empresaData1.nombre}</Text>
          <Text style={styles.seguidoresText}>RIF: <Text style={styles.seguidoresCount}>{empresaData1.rif}</Text></Text>
          {!isBlocked && (
            <>
              <Text style={styles.seguidoresText}>Seguidores de la empresa: <Text style={styles.seguidoresCount}>{empresaData1.seguidores}</Text></Text>

              {/* Botón para ver seguidores justo debajo del texto de seguidores */}
              <TouchableOpacity
                style={{ backgroundColor: '#0ea5e9', borderRadius: 8, padding: 12, alignItems: 'center', marginVertical: 10 }}
                onPress={async () => {
                  setSeguidores([]);
                  setSeguidoresPage(1);
                  setSeguidoresHasMore(true);
                  setSeguidoresLoading(true);
                  setSeguidoresModal(true);
                  await fetchSeguidores(1);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Ver usuarios que te siguen</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.accionesRow}>
            {/* Botón de seguir eliminado */}
            {!isBlocked && (
              <TouchableOpacity
                style={styles.clasificarButton}
                activeOpacity={0.85}
                onPress={async () => {
                  const next = !showRatingsPanel;
                  setShowRatingsPanel(next);
                  if (next && ratings.length === 0) {
                    try {
                      setRatingsLoading(true);

                      const empresaId = await AsyncStorage.getItem('empresaId');
                      if (!empresaId) { setRatingsLoading(false); return; }

                      const res = await api.get(`/api/empresas/${empresaId}/ratings/`);

                      const data = await res.data;
                      if (res.status >= 200 && res.status < 300) {
                        setRatings(Array.isArray(data) ? data : (data.results || []));
                      } else {
                        console.log('Error ratings', data);
                      }
                    } catch(e){
                      console.log('Error fetch ratings', e.message);
                    } finally {
                      setRatingsLoading(false);
                    }
                  }
                }}
              >
                <Text style={styles.clasificarStar}>★</Text>
                <Text style={styles.clasificarText}>{showRatingsPanel ? 'Ver eventos' : 'Valoraciones y reseñas'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const openRedSocial = (item) => {
    if (item.url) {
      Linking.openURL(item.url).catch(err => console.log('No se pudo abrir', err));
    }
  };

  // ...
const renderSocialCircles = () => {
  // Mostrar siempre la sección, incluso si aún no está "ready"

  const redesMap = {};
  const normalizeSocialType = (t) => {
    const v = String(t || '').toLowerCase();
    if (v === 'x' || v === 'twitter') return 'twitter';
    if (v === 'ig' || v === 'instagram') return 'instagram';
    if (v === 'fb' || v === 'facebook') return 'facebook';
    if (v === 'tt' || v === 'tiktok') return 'tiktok';
    if (v === 'yt' || v === 'youtube') return 'youtube';
    if (v === 'wa' || v === 'whatsapp') return 'whatsapp';
    if (v === 'mail' || v === 'email' || v === 'correo') return 'email';
    if (v === 'web' || v === 'website' || v === 'pagina' || v === 'página') return 'website';
    return v; // fallback to original
  };

  const redesFromEmpresa = Array.isArray(empresaData?.redes_sociales) ? empresaData.redes_sociales : [];
  redesFromEmpresa.forEach(red => {
    const key = normalizeSocialType(red.tipo);
    if (key) redesMap[key] = red.url;
  });

  const redes = [
    { id: 'ig', label: 'Instagram', icon: '📸', color: '#d946ef', url: redesMap?.instagram || null },
    { id: 'x', label: 'X', icon: '𝕏', color: '#0ea5e9', url: redesMap?.twitter || null },
    { id: 'fb', label: 'Facebook', icon: '📘', color: '#3b82f6', url: redesMap?.facebook || null },
    { id: 'tt', label: 'TikTok', icon: '🎵', color: '#14b8a6', url: redesMap?.tiktok || null },
    { id: 'yt', label: 'YouTube', icon: '▶️', color: '#ef4444', url: redesMap?.youtube || null },
    { id: 'wa', label: 'WhatsApp', icon: '💬', color: '#22c55e', url: redesMap?.whatsapp || null },
    { id: 'email', label: 'Email', icon: '✉️', color: '#f97316', url: redesMap?.email || null },
    { id: 'web', label: 'Web', icon: '🌐', color: '#f59e0b', url: redesMap?.website || null },
  ];

  const hasAny = redes.some(r => !!r.url);

  if (!hasAny) return null;

  return (
    <View style={styles.socialStripContainer}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginRight:4 }}>
        <Text style={styles.socialStripTitle}>Redes sociales</Text>
        {!isBlocked && (
          <TouchableOpacity onPress={() => setManageSocialModal(true)}>
            <Text style={{ color:'#0ea5e9', fontWeight:'700' }}>Editar/Eliminar</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {redes.filter(r => r.url).map(r => (
          <TouchableOpacity
            key={r.id}
            style={[styles.socialCircle, { borderColor: r.color }]}
            activeOpacity={0.75}
            onPress={() => Linking.openURL(r.url)}
          >
            <Text style={styles.socialIcon}>{r.icon}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.socialCircle, { borderColor: '#9ca3af' }]}
          onPress={() => setAddSocialModal(true)}
        >
          <Text style={[styles.socialIcon, { fontSize: 20 }]}>+</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

  // Social add modal state
  const [addSocialModal, setAddSocialModal] = useState(false);
  const [newSocialType, setNewSocialType] = useState('ig');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [savingSocial, setSavingSocial] = useState(false);
  const [manageSocialModal, setManageSocialModal] = useState(false);
  const [editingSocialIndex, setEditingSocialIndex] = useState(-1);

  const availableSocials = [
    { id: 'instagram', label: 'Instagram', key: 'ig' },
    { id: 'x', label: 'X / Twitter', key: 'x' },
    { id: 'facebook', label: 'Facebook', key: 'fb' },
    { id: 'tiktok', label: 'TikTok', key: 'tt' },
    { id: 'youtube', label: 'YouTube', key: 'yt' },
    { id: 'whatsapp', label: 'WhatsApp', key: 'wa' },
    { id: 'website', label: 'Website', key: 'web' },
  ];

  const handleSaveSocial = async () => {
    if (!newSocialUrl || !newSocialType) return;
    setSavingSocial(true);
    try {
      // Update local state
      const canonicalType = (type => {
        const v = String(type || '').toLowerCase();
        if (v === 'x' || v === 'twitter') return 'twitter';
        if (v === 'ig' || v === 'instagram') return 'instagram';
        if (v === 'fb' || v === 'facebook') return 'facebook';
        if (v === 'tt' || v === 'tiktok') return 'tiktok';
        if (v === 'yt' || v === 'youtube') return 'youtube';
        if (v === 'wa' || v === 'whatsapp') return 'whatsapp';
        if (v === 'web' || v === 'website' || v === 'pagina' || v === 'página') return 'website';
        return v;
      })(newSocialType);
      const entry = { tipo: canonicalType, url: newSocialUrl.trim() };
      const prevRedes = empresaData?.redes_sociales || [];
      let next;
      if (editingSocialIndex >= 0 && Array.isArray(empresaData?.redes_sociales)) {
        next = [...empresaData.redes_sociales];
        next[editingSocialIndex] = entry;
      } else {
        const prev = Array.isArray(empresaData?.redes_sociales) ? empresaData.redes_sociales : [];
        const filtered = prev.filter(i => String(i?.tipo || '').toLowerCase() !== canonicalType);
        next = [...filtered, entry];
      }

      // Optimistic update
      setEmpresaData(prev => ({ ...prev, redes_sociales: next }));

      // Try to persist to backend if empresa id exists
      const empresaId = empresaData?.id || await AsyncStorage.getItem('empresaId');
      if (empresaId) {
        try {
          await api.patch(`/api/empresas/${empresaId}/`, { redes_sociales: next });
          Alert.alert('Éxito', 'Red social guardada correctamente.');
        } catch (err) {
          console.log('No se pudo persistir redes sociales', err?.response?.data || err.message || err);
          // Rollback
          setEmpresaData(prev => ({ ...prev, redes_sociales: prevRedes }));
          Alert.alert('Error', 'No se pudo guardar la red social en el servidor.');
          return; // Keep modal open maybe? Actually modal closes below.
        }
      }

      setAddSocialModal(false);
      setEditingSocialIndex(-1);
      setNewSocialUrl('');
      setNewSocialType('ig');
    } finally {
      setSavingSocial(false);
    }
  };

  const startEditSocial = (index) => {
    if (!Array.isArray(empresaData?.redes_sociales)) return;
    const item = empresaData.redes_sociales[index];
    if (!item) return;
    setEditingSocialIndex(index);
    setNewSocialType(item.tipo);
    setNewSocialUrl(item.url);
    setManageSocialModal(false);
    setAddSocialModal(true);
  };

  const handleDeleteSocial = async (index) => {
    if (!Array.isArray(empresaData?.redes_sociales)) return;
    Alert.alert(
      'Eliminar red social',
      '¿Deseas eliminar esta red social?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const prev = empresaData.redes_sociales;
            const next = prev.filter((_, i) => i !== index);
            setEmpresaData(old => ({ ...old, redes_sociales: next }));
            const empresaId = empresaData?.id || await AsyncStorage.getItem('empresaId');
            if (empresaId) {
              try {
                await api.patch(`/api/empresas/${empresaId}/`, { redes_sociales: next });
              } catch (err) {
                console.log('Error eliminando red social', err?.response?.data || err.message || err);
                // Rollback
                setEmpresaData(old => ({ ...old, redes_sociales: prev }));
                Alert.alert('Error', 'No se pudo eliminar de forma permanente. Revisa tu conexión.');
              }
            }
          }
        }
      ]
    );
  };



  const renderEventos = () => {
    // Si la empresa está pendiente o rechazada, ocultamos la lista de eventos y mostramos un aviso claro
    if (isBlocked) {
      if (isRejected) {
        const raw = empresaData?.rejection_reason || '';
        const lines = parseRejectionReasons(raw);
        const cleanLines = lines.length ? lines : (raw ? [raw] : []);

        return (
          <View style={[styles.eventosContainer, { alignItems: 'flex-start', paddingVertical: 20 }]}>
            <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: '700' }}>Solicitud rechazada</Text>
            <Text style={{ color: '#94a3b8', marginTop: 8, textAlign: 'left', maxWidth: 520 }}>
              Tu solicitud fue rechazada por los siguientes motivos:
            </Text>

            {!raw && (
              <Text style={{ color: '#94a3b8', marginTop: 12 }}>
                No se especificó un motivo. Contacta soporte para más detalles.
              </Text>
            )}

            {raw && cleanLines.length === 1 && (
              <Text style={{ color: '#e2e8f0', marginTop: 12, maxWidth: 520 }}>
                {cleanLines[0]}
              </Text>
            )}

            {raw && cleanLines.length > 1 && (
              <View style={{ marginTop: 12, width: '100%', maxWidth: 520 }}>
                {cleanLines.map((ln, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      marginBottom: 6,
                      alignItems: 'flex-start',
                      width: '100%',
                      maxWidth: 520
                    }}
                  >
                    <Text style={{ color: '#fff', marginRight: 8 }}>•</Text>
                    <Text style={{ color: '#e2e8f0', flexShrink: 1 }}>{ln}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      }

      return (
        <View style={[styles.eventosContainer, { alignItems: 'center', paddingVertical: 40 }]}> 
          <Text style={{ color: '#f59e0b', fontSize: 18, fontWeight: '700' }}>Esperando verificación</Text>
          <Text style={{ color: '#94a3b8', marginTop: 8, textAlign: 'center', maxWidth: 480 }}>Tu empresa está en proceso de revisión. Este proceso de verificación puede tardar de 24 a 48 horas.</Text>
        </View>
      );
    }

    if (showRatingsPanel) {
      return (
        <View style={styles.eventosContainer}>
          <View style={styles.eventosHeader}>
            <View style={{ flex:1 }}>
              <Text style={styles.eventosTitle}>Valoraciones y reseñas</Text>
              {(() => {
                if (ratingsLoading) {
                  return <Text style={styles.eventosTotalLinea}>Calculando...</Text>;
                }
                if (!ratings.length) {
                  return <Text style={styles.eventosTotalLinea}>Sin valoraciones</Text>;
                }
                const sum = ratings.reduce((acc,r)=> acc + (Number(r.rating || r.valor || 0) || 0), 0);
                const avg = sum / ratings.length;
                const full = Math.round(avg * 10) / 10; // 1 decimal
                const stars = [0,1,2,3,4];
                return (
                  <View style={{ flexDirection:'row', alignItems:'center', marginTop:4 }}>
                    {stars.map(i => (
                      <Text key={i} style={{ fontSize:22, marginRight:2, color: i < Math.round(avg) ? '#facc15' : '#475569' }}>★</Text>
                    ))}
                    <Text style={{ color:'#f1f5f9', marginLeft:8, fontWeight:'600' }}>{full}/5 ({ratings.length})</Text>
                  </View>
                );
              })()}
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            {ratingsLoading ? (
              <ActivityIndicator color="#facc15" size="large" />
            ) : ratings.length === 0 ? (
              <Text style={{ color:'#94a3b8', textAlign:'center', marginTop:32 }}>No hay reseñas todavía.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {ratings.map((r, idx) => {
                  const filled = Math.max(0, Math.min(5, r.rating || r.valor || 0));
                  const stars = Array.from({ length: 5 });
                  return (
                    <View key={r.id || idx} style={{ backgroundColor:'#1e293b', padding:16, borderRadius:16, marginBottom:14, borderWidth:1, borderColor:'rgba(255,255,255,0.07)' }}>
                      <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
                        <Text style={{ color:'#fff', fontWeight:'600' }}>{r.usuario_username || r.user_name || 'Usuario'}</Text>
                        <Text style={{ color:'#facc15', fontWeight:'700' }}>{filled}/5</Text>
                      </View>
                      <View style={{ flexDirection:'row', marginBottom:6 }}>
                        {stars.map((_, i) => (
                          <Text key={i} style={{ color: i < filled ? '#facc15' : '#475569', fontSize:18 }}>★</Text>
                        ))}
                      </View>
                      {!!r.comentario && <Text style={{ color:'#e2e8f0', lineHeight:20 }}>{r.comentario}</Text>}
                      {r.created_at && <Text style={{ color:'#64748b', marginTop:6, fontSize:12 }}>{new Date(r.created_at).toLocaleDateString()}</Text>}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      );
    }


    return (
      <View style={styles.eventosContainer}>
        {/* Botón superior para agregar red social (eliminado por solicitud) */}
        <View style={styles.eventosHeader}>
          <View style={{ flex:1 }}>
            <Text style={styles.eventosTitle}>Eventos publicados</Text>
            <Text style={styles.eventosTotalLinea}>Total de eventos publicados: <Text style={styles.eventosCount}>{empresaData1.total_eventos}</Text></Text>
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
                  {/* <Image source={{ uri: evento.imagenes }} style={styles.eventoImage} resizeMode="cover" /> */}
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
                      style={[styles.verDetallesButton, { backgroundColor: '#ef4444', marginRight: 8 }]}
                      onPress={async () => {
                        // Confirmar antes de borrar
                        Alert.alert(
                          'Eliminar evento',
                          '¿Estás seguro de que deseas eliminar este evento?',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: async () => {
                                try {
                                  await api.delete(`/api/empresas/${evento.empresaId}/eventos/${evento.id}/`);
                                  setEventos(prev => prev.filter(ev => ev.id !== evento.id));
                                  Alert.alert('Éxito', 'El evento ha sido eliminado');
                                  Alert.alert('Éxito', 'El evento ha sido eliminado');
                                } catch (e) {
                                  Alert.alert('Error', 'No se pudo eliminar el evento');
                                }
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.verDetallesText}>Borrar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.verDetallesButton}
                        onPress={() => {
                          navigation.navigate('Reservar/Comprar', {
                            idEvento: evento.id,
                            idEmpresa: evento.ownerName?.startsWith('Empresa #')
                              ? evento.ownerName.replace('Empresa #', '')
                              : undefined
                          });
                        }}
                      >
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
  };
  
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
      {/* Modal de cambiar foto de perfil */}
      <Modal
        visible={profilePicModal}
        animationType="fade"
        transparent
        onRequestClose={() => setProfilePicModal(false)}
      >
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ backgroundColor:'#fff', borderRadius:16, padding:24, alignItems:'center', width:300 }}>
            <Text style={{ fontWeight:'bold', fontSize:18, marginBottom:16 }}>Cambiar foto de perfil</Text>
            <TouchableOpacity style={{ backgroundColor:'#0ea5e9', borderRadius:8, padding:12, marginBottom:12, width:'100%' }} onPress={() => {/* lógica de selección */}}>
              <Text style={{ color:'#fff', textAlign:'center' }}>Seleccionar imagen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop:8 }} onPress={() => setProfilePicModal(false)}>
              <Text style={{ color:'#0ea5e9', fontWeight:'bold' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
  {renderHeader()}
  {renderNotificationsModal()}
  {renderSeguidoresModal()}
  <ScrollView style={[styles.scrollView, { marginTop: 16 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {renderPerfilEmpresa()}
          {renderSocialCircles()}
          {renderEventos()}
        </View>
      </ScrollView>

      {/* Modal para editar y aceptar la imagen de perfil */}
      <Modal
        visible={profilePicEditVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setProfilePicEditVisible(false)}
      >
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ backgroundColor:'#1e293b', borderRadius:16, padding:24, alignItems:'center', width:320, borderWidth:1, borderColor:'#334155' }}>
            <Text style={{ fontWeight:'bold', fontSize:18, marginBottom:16, color:'#fff' }}>Ajusta tu foto de perfil</Text>
            {profilePicEdit && (
              <View style={{ width: 200, height: 200, borderRadius: 100, overflow: 'hidden', backgroundColor: '#334155', marginBottom: 16, justifyContent:'center', alignItems:'center' }}>
                <Image
                  source={{ uri: profilePicEdit.uri }}
                  style={{ width: 200, height: 200, borderRadius: 100 }}
                  resizeMode="cover"
                />
              </View>
            )}
            <View style={{ flexDirection:'row', gap:16 }}>
              <TouchableOpacity
                style={{ backgroundColor:'#0ea5e9', borderRadius:8, padding:12, marginRight:8 }}
                onPress={async () => {
                  // Bloquear actualización si la cuenta no está verificada
                  if (isBlocked) {
                    Alert.alert('Aviso', 'No se pudo actualizar la foto hasta que este verificado');
                    setProfilePicEditVisible(false);
                    return;
                  }
                  setProfilePicLoading(true);
                  // Recorte circular
                  let finalUri = profilePicEdit.uri;
                  const manipResult = await ImageManipulator.manipulateAsync(
                    profilePicEdit.uri,
                    [{ resize: { width: 400, height: 400 } }],
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                  );
                  finalUri = manipResult.uri;
                  // Subir imagen
                  const file = {
                    uri: finalUri,
                    name: "profile.jpg",
                    type: "image/jpeg",
                  };
                  const formData = new FormData();
                  formData.append("file", file);
                  try {
                    const response = await api.post(
                      `/api/empresas/${empresaData?.id}/upload-foto/`,
                      formData
                    );
                    setEmpresaData(prev => ({ ...prev, logo: response.data.logo }));
                    setProfilePicEditVisible(false);
                  } catch (error) {
                    Alert.alert('Error', 'No se pudo actualizar la foto de perfil');
                  } finally {
                    setProfilePicLoading(false);
                  }
                }}
              >
                <Text style={{ color:'#fff', fontWeight:'bold' }}>Aceptar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor:'#e5e7eb', borderRadius:8, padding:12 }}
                onPress={() => setProfilePicEditVisible(false)}
              >
                <Text style={{ color:'#0ea5e9', fontWeight:'bold' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para gestionar redes sociales (editar/eliminar) */}
      <Modal
        visible={manageSocialModal}
        animationType="fade"
        transparent
        onRequestClose={() => setManageSocialModal(false)}
      >
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ backgroundColor:'#0b1220', borderRadius:16, padding:20, width: width < 400 ? width - 32 : 360, borderWidth:1, borderColor:'#111827' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>Gestionar redes</Text>
              <TouchableOpacity onPress={() => setManageSocialModal(false)}>
                <Text style={{ color:'#0ea5e9', fontSize:18 }}>×</Text>
              </TouchableOpacity>
            </View>
            {(!empresaData?.redes_sociales || empresaData.redes_sociales.length === 0) ? (
              <Text style={{ color:'#94a3b8' }}>No hay redes sociales agregadas.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {empresaData.redes_sociales.map((r, i) => (
                  <View key={`${r.tipo}-${i}`} style={styles.manageSocialRow}>
                    <View style={{ flex:1 }}>
                      <Text style={{ color:'#e2e8f0', fontWeight:'600' }}>{String(r.tipo).toUpperCase()}</Text>
                      <Text style={{ color:'#94a3b8' }} numberOfLines={1}>{r.url}</Text>
                    </View>
                    <TouchableOpacity style={[styles.manageSocialBtn, { backgroundColor:'#0ea5e9' }]} onPress={() => startEditSocial(i)}>
                      <Text style={styles.manageSocialBtnText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.manageSocialBtn, { backgroundColor:'#ef4444' }]} onPress={() => handleDeleteSocial(i)}>
                      <Text style={styles.manageSocialBtnText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para añadir red social */}
      <Modal
        visible={addSocialModal}
        animationType="slide"
        transparent
        onRequestClose={() => setAddSocialModal(false)}
      >
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ backgroundColor:'#0b1220', borderRadius:12, padding:18, width:320, borderWidth:1, borderColor:'#111827' }}>
            <Text style={{ color:'#fff', fontWeight:'700', fontSize:16, marginBottom:8 }}>Añadir red social</Text>

            <Text style={{ color:'#cbd5e1', marginBottom:6 }}>Red</Text>
            <View style={{ backgroundColor:'#071029', padding:8, borderRadius:8, marginBottom:12 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {availableSocials.map(s => (
                  <TouchableOpacity key={s.key} onPress={() => setNewSocialType(s.key)} style={{ padding:8, marginRight:8, borderRadius:8, borderWidth: newSocialType === s.key ? 2 : 1, borderColor: newSocialType === s.key ? '#0ea5e9' : 'rgba(255,255,255,0.04)' }}>
                    <Text style={{ color: newSocialType === s.key ? '#0ea5e9' : '#cbd5e1' }}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={{ color:'#cbd5e1', marginBottom:6 }}>URL</Text>
            <TextInput
              value={newSocialUrl}
              onChangeText={setNewSocialUrl}
              placeholder="https://..."
              placeholderTextColor="#6b7280"
              style={{ backgroundColor:'#071029', color:'#e2e8f0', padding:10, borderRadius:8, marginBottom:12 }}
              autoCapitalize="none"
            />

            <View style={{ flexDirection:'row', justifyContent:'flex-end', gap:8 }}>
              <TouchableOpacity style={{ padding:10, borderRadius:8, marginRight:8 }} onPress={() => setAddSocialModal(false)}>
                <Text style={{ color:'#9ca3af' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor:'#0ea5e9', padding:10, borderRadius:8 }} onPress={handleSaveSocial} disabled={savingSocial}>
                {savingSocial ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'700' }}>{editingSocialIndex >= 0 ? 'Actualizar' : 'Guardar'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    height: 300,
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
  // Top button to add social
  addSocialTopButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  addSocialTopText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  // Estilos para el modal (agrega al final del objeto styles):
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#0b1220', borderRadius: 16, padding: 20, width: width < 400 ? width - 32 : 360, alignItems: 'center', position: 'relative', borderWidth:1, borderColor:'#111827' },
  modalClose: { position: 'absolute', top: 8, right: 12, zIndex: 2 },
  profileHintText: { color: '#cbd5e1', textAlign: 'center', marginBottom: 6 },
  seguidorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)'
  },
  seguidorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    backgroundColor: '#334155'
  },
  seguidorAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0ea5e9'
  },
  seguidorName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  seguidorMeta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  socialLinksList: { marginTop: 8 },
  socialLinkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  socialLinkLabel: { color: '#cbd5e1', marginRight: 6, fontWeight: '600', width: 88 },
  socialLinkUrl: { color: '#0ea5e9', flexShrink: 1 },
  manageSocialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  manageSocialBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  manageSocialBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center' },
  settingsCard: { width: 340, backgroundColor: '#071029', borderRadius: 14, padding: 18, alignItems: 'stretch' },
  settingsTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  settingsAvatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarPreviewOuter: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center' },
  avatarPreview: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220' },
  settingsName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  settingsEmail: { color: '#9ca3af', fontSize: 13 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  deleteLink: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  settingsButton: { backgroundColor: '#0ea5e9', paddingVertical: 10, borderRadius: 10, marginTop: 8, alignItems: 'center' },
  settingsButtonText: { color: '#051025', fontWeight: '700' },
});
