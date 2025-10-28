import React, { useState, useEffect, useRef} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from "../services/api"
import AsyncStorage from '@react-native-async-storage/async-storage';
import StandardHeader from '../components/StandardHeader';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Image, Modal, Animated, StatusBar, ActivityIndicator, TextInput, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';


// SVGs originales
const svgGuardados = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V26C24 26.5523 23.4477 27 23 27C22.7893 27 22.5858 26.9216 22.4375 26.7812L16 20.3438L9.5625 26.7812C9.41421 26.9216 9.21071 27 9 27C8.55228 27 8 26.5523 8 26V6Z" stroke="#2563eb" stroke-width="2" fill="#e0e7ff"/></svg>`;
const svgComentarios = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M6 24V8C6 6.89543 6.89543 6 8 6H24C25.1046 6 26 6.89543 26 8V20C26 21.1046 25.1046 22 24 22H10L6 26V24Z" stroke="#a21caf" stroke-width="2" fill="#f3e8ff"/></svg>`;

// --- Lógica migrada del JS para React Native ---
// Títulos de sección para el enunciado principal
const sectionTitles = {
  guardados: 'Eventos guardados',

  comentarios: 'Comentarios publicados',
};

export default function PerfilScreen({ navigation }) {
  const [modalVisible, setModalVisible] = useState({ cart: false, calendar: false, notifications: false });
  const [userName, setUserName] = useState('');
  // Loader para imagen de perfil
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [hasEmpresa, setHasEmpresa] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [profilePicModal, setProfilePicModal] = useState(false);
  const [editNameModal, setEditNameModal] = useState(false);
  const [editNameText, setEditNameText] = useState('');
  const [editNameLoading, setEditNameLoading] = useState(false);
  // Estado para empresas seguidas (usuario normal)
  const [empresasSeguidas, setEmpresasSeguidas] = useState([]);
  const [empresasModal, setEmpresasModal] = useState(false);
  const [loadingEmpresasSeguidas, setLoadingEmpresasSeguidas] = useState(false);
  // Estado para seguidores (usuario empresa)
  const [seguidores, setSeguidores] = useState([]);
  const [seguidoresModal, setSeguidoresModal] = useState(false);
  const [mostrarEmpresasAbajo, setMostrarEmpresasAbajo] = useState(false);
  const [userData, setUserData] = useState(null); // Datos del usuario logueado
  const avatarSrc = userData?.avatar_url || userData?.avatar || null;
  const [loading, setLoading] = useState(false);
  // Estado para controlar el modal/flujo de login (StandardHeader usa setLoginVisible)
  const [loginVisible, setLoginVisible] = useState(false);
  // Alias esperado por StandardHeader
  const userAvatarUrl = avatarSrc;
  // Datos de la empresa vinculada (si aplica)
  const [empresaData, setEmpresaData] = useState(null);


  // Función para cargar las empresas que sigue el usuario y mantener el contador actualizado
  const fetchEmpresasSeguidas = async () => {
    setLoadingEmpresas(true);
    
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        setEmpresasSeguidas([]);
        return;
      }
      const res = await api.get(`/api/usuarios/${userId}/empresas-seguidas/`);
      // Normalizar distintas formas de respuesta
      const dataArray = Array.isArray(res?.data)
        ? res.data
        : (res?.data?.empresas && Array.isArray(res.data.empresas) ? res.data.empresas : (Array.isArray(res?.data?.results) ? res.data.results : []));
      if (!Array.isArray(res?.data) && !Array.isArray(res?.data?.empresas) && !Array.isArray(res?.data?.results)) {
        console.warn('PerfilScreen.fetchEmpresasSeguidas: unexpected response shape:', res?.data);
      }
      setEmpresasSeguidas(dataArray || []);
    } catch (e) {
      console.log('Error al cargar empresas seguidas:', e);
      setEmpresasSeguidas([]);
    } finally {
      
      setLoadingEmpresas(false);
    }
  };

  // Normalizar posibles valores no-array que puedan venir de la API
  const empresasArray = Array.isArray(empresasSeguidas) ? empresasSeguidas : [];

  // contador derivado
const totalEmpresasSeguidas = Array.isArray(empresasSeguidas) ? empresasSeguidas.length : 0;

  
const handleUploadAvatar = async (userId) => {
  if (!userId) return { ok: false, error: 'No user id' };
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status && perm.status !== 'granted') {
      Alert.alert('Permisos', 'Se requieren permisos para acceder a la galería.');
      return { ok: false, cancelled: true };
    }

    const mediaTypesOption = ImagePicker?.MediaType?.Images
      ? ImagePicker.MediaType.Images
      : (ImagePicker?.MediaTypeOptions?.Images || undefined);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaTypesOption,
      quality: 0.9,
      // Muestra UI nativa para recortar la imagen
      allowsEditing: true,
      aspect: [1, 1], // cuadrado para avatar
      exif: false,
      base64: false,
    });

    if (!result || result.canceled) return { ok: false, cancelled: true };

    const uri = result.assets?.[0]?.uri || result.uri;
    if (!uri) return { ok: false, cancelled: true };

    setAvatarLoading(true);

    // Compresión opcional para reducir tamaño antes de subir
    let uploadUri = uri;
    try {
      const manip = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (manip?.uri) uploadUri = manip.uri;
    } catch (_) {
      // si falla la compresión, seguimos con la uri original
    }

    const fileName = uploadUri.split('/').pop();
    // try to infer mime type
    const match = (fileName || '').match(/\.([0-9a-z]+)(?:\?|$)/i);
    const ext = match ? match[1] : 'jpg';
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: uploadUri,
      name: fileName || `avatar_${Date.now()}.${ext}`,
      type: mime,
    });

    // Build absolute URL from api base
    const base = api.defaults?.baseURL || 'http://localhost:8000';
    const url = `${base.replace(/\/$/, '')}/api/usuarios/${userId}/upload-avatar/`;

    const token = await AsyncStorage.getItem('accessToken');

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        Accept: 'application/json',
        // DO NOT set Content-Type; let fetch set the multipart boundary
      },
      body: formData,
    });

    const json = await resp.json().catch(() => ({}));

    setAvatarLoading(false);

    if (!resp.ok) {
      const msg = json?.error || json?.detail || `Error ${resp.status}`;
      console.log('Upload avatar server error:', msg, json);
      return { ok: false, error: msg };
    }

    const avatarUrlRaw = json?.avatar_url || json?.avatar || null;
    const cleanAvatarUrl = typeof avatarUrlRaw === 'string' ? avatarUrlRaw.replace(/\?$/, '') : avatarUrlRaw;

    setUserData((prev) => ({ ...prev, avatar_url: cleanAvatarUrl, avatar_path: json?.avatar_path || prev?.avatar_path }));

    return { ok: true };
  } catch (err) {
    console.log('Error al subir avatar (client):', err);
    setAvatarLoading(false);
    if (err?.message === 'Network request failed') {
      Alert.alert('Error de red', 'No se pudo conectar con el servidor. Revisa la URL y la conexión.');
    }
    return { ok: false, error: err?.message || String(err) };
  }
};

const openEditName = () => {
  const current = userData?.nombre || userData?.name || userName || '';
  setEditNameText(current);
  setEditNameModal(true);
};

const handleSaveName = async () => {
  setEditNameLoading(true);
  try {
    let id = userData?.id;
    if (!id) id = await AsyncStorage.getItem('userId');
    if (!id) return Alert.alert('Error', 'Usuario no identificado');

    // Intentar parchear el nombre
    const payload = { nombre: editNameText };
    await api.patch(`/api/usuarios/${id}/`, payload);

    // Actualizar estado local
    setUserData(prev => ({ ...(prev || {}), nombre: editNameText, name: editNameText }));
    setUserName(editNameText);
    setEditNameModal(false);
  } catch (err) {
    console.log('Error actualizando nombre:', err);
    Alert.alert('Error', 'No se pudo actualizar el nombre. Intenta de nuevo.');
  } finally {
    setEditNameLoading(false);
  }
};

useFocusEffect(
    React.useCallback(() => {
      const loadScreenData = async () => {
        setLoading(true);
        try {
          // 1. Obtener datos de la sesión desde AsyncStorage
          const name = await AsyncStorage.getItem('userName');
          const empresaId = await AsyncStorage.getItem('empresaId');
          const token = await AsyncStorage.getItem('accessToken');
          const userId = await AsyncStorage.getItem('userId');

          if (userId) {
            const userResponse = await api.get(`/api/usuarios/${userId}/`);
            setUserData(userResponse.data);
          }

          // Si hay empresaId, intentar obtener datos de la empresa para pasar al header
          if (empresaId) {
            try {
              const empresaRes = await api.get(`/api/empresas/${empresaId}/`);
              setEmpresaData(empresaRes.data);
            } catch (e) {
              // no bloquear si falla
              console.log('No se pudo cargar empresaData en PerfilScreen', e);
            }
          }

          // 2. Actualizar el estado del componente
          setUserName(name || '');
          setHasEmpresa(!!(empresaId && empresaId !== ''));
          setIsLogged(!!token);

          // 3. Si hay un usuario logueado, cargar sus datos asociados (empresas seguidas)
          if (userId) {
            await fetchEmpresasSeguidas();
          } else {
            setEmpresasSeguidas([]); // Limpiar si no hay usuario
          }

        } catch (error) {
          console.log('Error al cargar los datos del perfil:', error);
          // Limpiar estado en caso de error
          setUserName('');
          setHasEmpresa(false);
          setIsLogged(false);
          setEmpresasSeguidas([]);
        }finally {
          setLoading(false);
        }
      };

      loadScreenData(); // Ejecutar la función de carga

      // No se necesita una función de limpieza aquí si solo estamos cargando datos.
    }, []) // El array vacío asegura que la lógica se define una vez.
  );

 const handleLogout = async () => {
  await Promise.all([
    AsyncStorage.removeItem('userName'),
    AsyncStorage.removeItem('userEmail'),
    AsyncStorage.removeItem('accessToken'),
    AsyncStorage.removeItem('empresaId'),
    AsyncStorage.removeItem('isEmpresaAccount'),
    AsyncStorage.removeItem('userId'),
  ]);

  setUserName('');
};
  const [notifAnim] = useState(new Animated.Value(0));
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  // Fade in animation when notifications modal opens (kept for other uses)
  React.useEffect(() => {
    if (modalVisible.notifications) {
      Animated.timing(notifAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisible.notifications]);

  // Cambia el título del enunciado según el botón seleccionado
  const getEnunciado = () => {
    if (!selectedSection) return 'Escoge que quieres hacer';
    return sectionTitles[selectedSection] || '';
  };

  // Renderiza los botones de sección con efecto de selección
  const renderSectionButtons = () => (
    <View style={styles.buttonRow}>
      <TouchableOpacity
        style={[styles.sectionButton, styles.blue, selectedSection === 'guardados' && styles.sectionButtonActive]}
        onPress={async () => {
          setLoadingGuardados(true);
          setSelectedSection('guardados');
          if (!hasLoadedGuardados.current) {
            await fetchGuardados();
            hasLoadedGuardados.current = true;
          }
          setLoadingGuardados(false);
        }}
        activeOpacity={0.8}
      >
        <SvgXml xml={svgGuardados} width={24} height={24} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sectionButton, styles.purple, selectedSection === 'comentarios' && styles.sectionButtonActive]}
        onPress={() => setSelectedSection('comentarios')}
        activeOpacity={0.8}
      >
        <SvgXml xml={svgComentarios} width={24} height={24} />
      </TouchableOpacity>
      {/* Botón de empresas que sigues, como icono SVG, junto a los otros botones */}
      <TouchableOpacity
        style={[styles.sectionButton, styles.blue, selectedSection === 'empresas' && styles.sectionButtonActive]}
        onPress={async () => {
          setLoadingEmpresasSeguidas(true);
          setSelectedSection('empresas');
          setLoadingEmpresasSeguidas(false);
        }}
        activeOpacity={0.8}
      >
        <SvgXml xml={`<svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
  <circle cx='12' cy='8' r='4' stroke='#0ea5e9' stroke-width='2' fill='#dbeafe'/>
  <path d='M4 20c0-3.3137 3.134-6 7-6s7 2.6863 7 6' stroke='#0ea5e9' stroke-width='2' fill='#dbeafe'/>
</svg>`} width={24} height={24} />
      </TouchableOpacity>
    </View>
  );

  // --- Estado para eventos guardados ---
  const [guardados, setGuardados] = useState([]);
  const [loadingGuardados, setLoadingGuardados] = useState(false);
  // Estado para comentarios relacionados a empresas
  const [comentarios, setComentarios] = useState([]);
  const [loadingComentarios, setLoadingComentarios] = useState(false);

  // Estado para empresas seguidas
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  // Función para cargar eventos guardados desde el backend
  const fetchGuardados = async () => {
    setLoadingGuardados(true);
    try {
      const response = await api.get('api/eventos-guardados/');
      // Normalizar la respuesta: puede venir como array o como objeto paginado
      const dataArray = Array.isArray(response?.data)
        ? response.data
        : (response?.data && Array.isArray(response.data.results) ? response.data.results : []);
      if (!Array.isArray(response?.data) && !Array.isArray(response?.data?.results)) {
        console.warn('PerfilScreen: /api/eventos-guardados returned non-array response:', response?.data);
      }
      setGuardados(dataArray.map(e => ({
        id: e.id, // id del registro UsuarioEvento
        eventoId: e.evento_obj.id, // id del evento original
        titulo: e.evento_obj.titulo,
        fecha: e.evento_obj.fecha_evento,
        date: e.evento_obj.fecha_evento
          ? new Date(e.evento_obj.fecha_evento).toLocaleDateString()
          : (e.evento_obj.creado_en ? new Date(e.evento_obj.creado_en).toLocaleDateString() : 'Fecha no definida'),
        time: e.evento_obj.fecha_evento
          ? new Date(e.evento_obj.fecha_evento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null,
        ubicacion: e.evento_obj.ubicacion,
        precio: e.evento_obj.precio,
        imagen: e.evento_obj.imagenes?.[0]?.url || 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png',
      })));
    } catch (error) {
      console.log('Error al cargar eventos guardados:', error);
      setGuardados([]);
    } finally {
      setLoadingGuardados(false);
    }
  };

  // Llama a fetchGuardados cuando el usuario selecciona la sección "guardados"
  

  const hasLoadedGuardados = useRef(false);

  useEffect(() => {
    if (selectedSection === 'guardados') {
      if (!hasLoadedGuardados.current) {
        console.log('useEffect: cargando eventos guardados por primera vez');
        fetchGuardados();
        hasLoadedGuardados.current = true; // ✅ marcamos que ya se cargó
      }
    }

    if (selectedSection === 'comentarios') {
      fetchComentarios();
    }
    if (selectedSection === 'empresas') {
      fetchEmpresasSeguidas();
    }
  }, [selectedSection]);

  // Llama a fetchGuardados cuando el usuario regresa a la pantalla de guardados
  useFocusEffect(
    React.useCallback(() => {
      if (selectedSection === 'comentarios') {
        fetchComentarios();
      }
      if (selectedSection === 'empresas') {
        fetchEmpresasSeguidas();
      }
    }, [selectedSection])
  );

  // --- Función para cargar comentarios de empresas ---
  const fetchComentarios = async () => {
    setLoadingComentarios(true);
    try {
      // Si el usuario es una empresa propia, pedimos los ratings de su empresa
      const empresaId = await AsyncStorage.getItem('empresaId');
      if (hasEmpresa && empresaId) {
        const res = await api.get(`/api/empresas/${empresaId}/ratings/`);
        const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.results) ? res.data.results : []);
        setComentarios((data || []).map(c => ({ ...c, empresa_nombre: res.data?.empresa?.nombre || 'Mi empresa' })) || []);
        return;
      }

      // Usuario normal: mostremos SOLO comentarios que el usuario haya escrito
      const userId = await AsyncStorage.getItem('userId');
      let empresas = empresasSeguidas;
      if ((!empresas || empresas.length === 0) && userId) {
        // intentar obtener directamente
        const resSeg = await api.get(`/api/usuarios/${userId}/empresas-seguidas/`);
        empresas = Array.isArray(resSeg.data) ? resSeg.data : (Array.isArray(resSeg.data.empresas) ? resSeg.data.empresas : (Array.isArray(resSeg.data.results) ? resSeg.data.results : []));
      }

      if (!empresas || empresas.length === 0) {
        setComentarios([]);
        return;
      }

      // Para cada empresa pedimos sus ratings en paralelo y filtramos por usuario == userId y comentario no vacío
      const promises = empresas.map(emp => api.get(`/api/empresas/${emp.id}/ratings/`).then(r => ({ empresa: emp, data: r.data })).catch(e => ({ empresa: emp, data: [] })));
      const results = await Promise.all(promises);

      // Aplanar, normalizar y filtrar solo comentarios del usuario
      const all = [];
      results.forEach(r => {
        const arr = Array.isArray(r.data) ? r.data : (Array.isArray(r.data.results) ? r.data.results : []);
        const mapped = (arr || []).map(c => ({ ...c, empresa_nombre: r.empresa?.nombre || r.empresa?.name || 'Empresa' }));
        // Filtramos: solo los ratings cuyo campo usuario coincida con userId y que tengan comentario no vacío
        const filtered = mapped.filter(c => {
          const usuarioId = c.usuario || c.usuario_id || (c.usuario && c.usuario.id) || null;
          const hasComentario = c.comentario && String(c.comentario).trim().length > 0;
          return usuarioId && String(usuarioId) === String(userId) && hasComentario;
        });
        all.push(...filtered);
      });

      // Ordenar por fecha reciente para mejor UX (si existe creado_en o creadoAt)
      all.sort((a,b) => {
        const ta = new Date(a.creado_en || a.created_at || a.createdAt || 0).getTime();
        const tb = new Date(b.creado_en || b.created_at || b.createdAt || 0).getTime();
        return tb - ta;
      });

      setComentarios(all);
    } catch (e) {
      console.log('Error fetchComentarios', e);
      setComentarios([]);
    } finally {
      setLoadingComentarios(false);
    }
  };

  // --- Función para borrar evento guardado ---
  const borrarGuardado = async (id) => {
    // Elimina visualmente
    setGuardados(prev => prev.filter(e => e.id !== id));
    try {
      await api.delete(`api/eventos-guardados/${id}/`); // id del registro UsuarioEvento
      fetchGuardados();
    } catch (error) {
      console.log('Error al borrar evento guardado:', error);
    }
  };

  // Cierra la lista de empresas seguidas al cambiar de sección o salir de la pantalla
  useEffect(() => {
    if (mostrarEmpresasAbajo && selectedSection !== null) {
      setMostrarEmpresasAbajo(false);
    }
  }, [selectedSection]);
  useFocusEffect(
    React.useCallback(() => {
      return () => setMostrarEmpresasAbajo(false);
    }, [])
  );

  // Handler centralizado para acciones del menú (asegura que exista cuando se pase a StandardHeader)
  const handleMenuItemPress = async (item) => {
    try {
      setMenuVisible(false);
      if (item === 'calendar') {
        // Asegura que guardados esté actualizado antes de mostrar el calendario
        try {
          setLoadingGuardados(true);
          await fetchGuardados();
        } catch (_) {}
        setLoadingGuardados(false);
        setModalVisible({ ...modalVisible, calendar: true });
        return;
      }

      if (item === 'notifications') {
        setModalVisible({ ...modalVisible, notifications: true });
        return;
      }

      if (item === 'inicio') {
        navigation.navigate('HomeScreen');
        return;
      }

      if (item === 'register') {
        // Cambiar a contexto empresa y navegar a Empresa
        try {
          const empresaId = await AsyncStorage.getItem('empresaId');
          if (!empresaId) {
            Alert.alert('No tienes empresa afiliada', 'No se encontró una empresa asociada a tu cuenta.');
            return;
          }
          await AsyncStorage.setItem('sessionMode', 'empresa');
          await AsyncStorage.setItem('isEmpresaAccount', 'true');
          await AsyncStorage.setItem('isUserAccount', 'true');
          navigation.navigate('Empresa', { empresaId });
        } catch (e) {
          console.log('Error switching to empresa account from menu', e);
          Alert.alert('Error', 'No se pudo cambiar a la cuenta empresa. Intenta nuevamente.');
        }
        return;
      }

      if (item === 'empresa_form') {
        navigation.navigate('FormularioScreen');
        return;
      }
    } catch (e) {
      console.log('handleMenuItemPress error', e);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: '#0f172a', flex: 1 }]}> 
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00ff00" /> 
          <Text style={{ color: '#ffffff', marginTop: 10, fontSize: 16 }}>Cargando datos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      {/* Overlay superior color fondo app */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, backgroundColor: '#0f172a', zIndex: 10 }} pointerEvents="none" />
      {/* Overlay inferior color fondo app (más grande) */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, backgroundColor: '#0f172a', zIndex: 10 }} pointerEvents="none" />
      <ScrollView
        style={[styles.container, { marginTop: 32, marginBottom: 48 }]}
        contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1, paddingBottom: 96 }}
        scrollEnabled={!modalVisible.calendar}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <StandardHeader
          isLogged={isLogged}
          onLoginPress={() => setLoginVisible(true)}
          onLogoutPress={handleLogout}
          onMenuPress={handleMenuItemPress}
          hasEmpresa={hasEmpresa}
          isEmpresaAccount={hasEmpresa}
          isUserAccount={!hasEmpresa}
          userAvatarUrl={userAvatarUrl}
          isHomeScreen={false}
          style={styles.headerHome}
          logoContainerStyle={styles.logoContainerHome}
          menuButtonStyle={styles.headerRightHome}
        />

      {/* Perfil principal móvil */}
      
      <View style={styles.profileContainer}>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.profileHintText}>Presione aquí para ver ajustes de cuenta</Text>
        </View>
        <TouchableOpacity
          style={styles.profileImage}
          onPress={() => setProfilePicModal(true)}
          activeOpacity={0.7}
        >
          {avatarLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          ) : avatarSrc ? (
            <Image
              source={{ uri: avatarSrc }}
              style={{ width: '100%', height: '100%', borderRadius: 64 }}
              resizeMode="cover"
            />
          ) : (
            // Mostrar la imagen mocky.jpg como placeholder, más pequeña y centrada dentro del contenedor
            <View style={{ width: '100%', height: '100%', borderRadius: 64, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={require('../../assets/mocky.jpg')}
                // Imagen más pequeña (96x96) centrada; la desplazamos levemente hacia arriba para ocultar texto inferior
                style={{ width: '100%', height: '100%'}}
                resizeMode="cover"
              />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.userName}>{userName ? userName : 'Usuario'}</Text>
        {/* Mostrar solo el botón correspondiente según el tipo de usuario */}
        {!hasEmpresa && (
          <>
            <Text style={styles.userStats}>Empresas seguidas: <Text style={styles.highlight}>{empresasArray.length}</Text></Text>

            {/* Modal lista de empresas seguidas */}
            <Modal
              visible={empresasModal}
              animationType="slide"
              transparent
              onRequestClose={() => setEmpresasModal(false)}
            >
              <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center' }}>
                <View style={{ backgroundColor:'#fff', borderRadius:16, padding:24, alignItems:'center', width:320, maxHeight:'80%' }}>
                  <Text style={{ fontWeight:'bold', fontSize:18, marginBottom:16, color:'#0ea5e9' }}>Empresas que sigues</Text>
                  <ScrollView style={{ width:'100%' }}>
                    {empresasArray.length === 0 ? (
                      <Text style={{ color:'#64748b', textAlign:'center' }}>No sigues ninguna empresa.</Text>
                    ) : (
                      empresasArray.map((emp, idx) => (
                        <View key={emp.id || idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'center' }}>
                          {emp.logo_url || emp.logo ? (
                            <Image
                              source={{ uri: emp.logo_url || emp.logo }}
                              style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#e5e7eb' }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: '#94a3b8', fontSize: 18 }}>🏢</Text>
                            </View>
                          )}
                          <Text style={{ color:'#1e293b', fontSize:16, textAlign:'center', flexShrink: 1 }}>{emp.nombre || emp.name || 'Empresa sin nombre'}</Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                  <TouchableOpacity style={{ marginTop:16 }} onPress={() => setEmpresasModal(false)}>
                    <Text style={{ color:'#0ea5e9', fontWeight:'bold' }}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </>
        )}
          {/* Si el usuario tiene una empresa afiliada, permitir cambiar a su perfil empresa */}
          
        {hasEmpresa && (
          <>
            <Text style={styles.userStats}>Empresas que sigues: <Text style={styles.highlight}>{totalEmpresasSeguidas}</Text></Text>
            
            {/* Modal lista de seguidores */}
            <Modal
              visible={seguidoresModal}
              animationType="slide"
              transparent
              onRequestClose={() => setSeguidoresModal(false)}
            >
              <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center' }}>
                <View style={{ backgroundColor:'#fff', borderRadius:16, padding:24, alignItems:'center', width:320, maxHeight:'80%' }}>
                  <Text style={{ fontWeight:'bold', fontSize:18, marginBottom:16, color:'#0ea5e9' }}>Empresas que sigues</Text>
                  <ScrollView style={{ width:'100%' }}>
                    {seguidores.length === 0 ? (
                      <Text style={{ color:'#64748b', textAlign:'center' }}>No sigues ninguna empresa aún.</Text>
                    ) : (
                      seguidores.map((user, idx) => (
                        <View key={user.id || idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'center' }}>
                          {user.logo || user.avatar ? (
                            <Image
                              source={{ uri: user.logo || user.avatar }}
                              style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#e5e7eb' }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: '#94a3b8', fontSize: 18 }}>👤</Text>
                            </View>
                          )}
                          <Text style={{ color:'#1e293b', fontSize:16, textAlign:'center', flexShrink: 1 }}>{user.nombre || user.name || user.username || 'Usuario sin nombre'}</Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                  <TouchableOpacity style={{ marginTop:16 }} onPress={() => setSeguidoresModal(false)}>
                    <Text style={{ color:'#0ea5e9', fontWeight:'bold' }}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </>
        )}
        {/* Bloque duplicado de modal de seguidores eliminado para corregir error de sintaxis */}
        {renderSectionButtons()}
      </View>

      {/* Enunciado principal e instrucciones solo si no hay sección seleccionada */}
      {!selectedSection && (
        <>
          <Text style={styles.enunciado}>{getEnunciado()}</Text>
          <View style={styles.instructionsColumn}>
            <TouchableOpacity onPress={() => setSelectedSection('guardados')} activeOpacity={0.85}>
              <View style={[styles.infoBox, { backgroundColor: '#dbeafe', maxWidth: 340, alignSelf: 'center' }]}> 
                <View style={[styles.infoIconCircle, { backgroundColor: '#dbeafe' }] }>
                  <SvgXml xml={svgGuardados} width={32} height={32} />
                </View>
                <Text style={[styles.infoTitle, { color: '#2563eb' }]}>Eventos guardados</Text>
                <Text style={[styles.infoDesc, { color: '#2563eb' }]}>Este ícono representa los eventos que marcaste como favoritos para revisarlos más tarde fácilmente.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedSection('comentarios')} activeOpacity={0.85}>
              <View style={[styles.infoBox, { backgroundColor: '#ede9fe', maxWidth: 340, alignSelf: 'center' }]}> 
                <View style={[styles.infoIconCircle, { backgroundColor: '#ede9fe' }] }>
                  <SvgXml xml={svgComentarios} width={32} height={32} />
                </View>
                <Text style={[styles.infoTitle, { color: '#7c3aed' }]}>Comentarios publicados</Text>
                <Text style={[styles.infoDesc, { color: '#7c3aed' }]}>Este ícono representa tus reseñas y opiniones públicas sobre los eventos que has experimentado.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}
      {/* Si hay sección seleccionada, muestra solo el contenido correspondiente */}
      {selectedSection === 'guardados' && (
        <View style={[styles.sectionContent, { padding: 16, backgroundColor: 'transparent', margin: 0 }]}> 
          <Text style={styles.sectionTitle}>Eventos guardados</Text>
          {loadingGuardados ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={{ color: '#9ca3af', marginTop: 8 }}>Cargando eventos guardados...</Text>
            </View>
            ) : guardados.length === 0 ? (
            <Text style={{ color: '#d1d5db', textAlign: 'center', marginTop: 32, fontSize: 18 }}>
              <Text style={{ fontWeight: 'bold', color: '#d1d5db' }}>No</Text> se han encontrado más elementos
            </Text>
            ) : (
            guardados.map(evento => (
              <View key={evento.id} style={{ backgroundColor: '#334155', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: evento.imagen }}
                    style={{ width: '100%', height: 180, resizeMode: 'cover' }}
                  />
                </View>
                <View style={{ padding: 16 }}>
                  <Text style={styles.eventTitle}>{evento.titulo}</Text>

                  {evento.time && evento.time !== 'Hora no definida' && (
                    <View style={styles.eventoInfo}>
                      <Text style={styles.eventoInfoText}>📅 {evento.date}  ⏰ {evento.time}</Text>
                    </View>
                  )}
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventoInfoText}>📍 {evento.ubicacion}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
                      <TouchableOpacity style={{ backgroundColor: '#2563eb', paddingVertical: 8, borderRadius: 10, paddingHorizontal: 18, marginRight: 8 }} onPress={() => navigation.navigate('Reservar/Comprar', { idEvento: evento.eventoId })}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Ver detalles</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ backgroundColor: '#0ea5e9', paddingVertical: 8, borderRadius: 10, paddingHorizontal: 14, marginRight: 8, justifyContent: 'center', alignItems: 'center' }} onPress={async () => { try { await Share.share({ message: `${evento.titulo} - ${evento.date || ''} ${evento.time || ''}` }); } catch (e) { console.warn('share guardado', e); } }}>
                        <Ionicons name="share-social" size={18} color="#ffffffff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={{ backgroundColor: '#ef4444', paddingVertical: 8, borderRadius: 10, paddingHorizontal: 18 }} onPress={() => borrarGuardado(evento.id)}>
                        <SvgXml xml={`<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='#fff'><path stroke-linecap='round' stroke-linejoin='round' d='m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0' /></svg>`} width={22} height={22} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}
      {selectedSection === 'comentarios' && (
        <View style={[styles.sectionContent, {backgroundColor: 'transparent', margin: 0}] }>
          <Text style={styles.sectionTitle}>Comentarios publicados</Text>
            {loadingComentarios ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#7c3aed" />
                <Text style={{ color: '#9ca3af', marginTop: 8 }}>Cargando comentarios...</Text>
              </View>
            ) : comentarios.length === 0 ? (
              hasEmpresa ? (
                <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 16 }}>No se han encontrado mensajes afiliados a tu cuenta.</Text>
              ) : (
                <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 16 }}>No hay comentarios públicos de empresas para mostrar.</Text>
              )
            ) : (
              comentarios.map((c, idx) => (
                <View key={c.id || idx} style={{ backgroundColor: '#334155', borderRadius: 12, padding: 16, marginBottom: 16, width: '100%' }}>
                  {/* Header con nombre de empresa y rating */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: '#6366f1', fontWeight: 'bold', fontSize: 16 }}>{c.empresa_nombre || c.empresa || 'Empresa'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <SvgXml xml={`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='#fbbf24' viewBox='0 0 24 24' stroke-width='1.5' stroke='#fbbf24'><path stroke-linecap='round' stroke-linejoin='round' d='M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z' /></svg>`} width={16} height={16} />
                      <Text style={{ color: '#fbbf24', marginLeft: 4, fontWeight: 'bold' }}>{c.rating || c.valor || '-'}/5</Text>
                    </View>
                  </View>
                  
                  {/* Comentario */}
                  <Text style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
                    {c.comentario || c.comentario_text || c.text || '(sin comentario)'}
                  </Text>
                  
                  {/* Footer con fecha */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                      Publicado el {c.creado_en ? new Date(c.creado_en).toLocaleDateString('es-ES') : 
                        (c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES') : 'fecha no disponible')}
                    </Text>
                    {c.actualizado_en && c.actualizado_en !== c.creado_en && (
                      <Text style={{ color: '#94a3b8', fontSize: 10 }}>
                        (editado)
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
        </View>
      )}
      {selectedSection === 'empresas' && (
        <View style={[styles.sectionContent, { padding: 16, backgroundColor: 'transparent', margin: 0 }]}> 
          <Text style={styles.sectionTitle}>Empresas que sigues</Text>
          {loadingEmpresasSeguidas ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text style={{ color: '#9ca3af', marginTop: 8 }}>Cargando empresas...</Text>
            </View>
          ) : empresasSeguidas.length === 0 ? (
            <Text style={{ color: '#d1d5db', textAlign: 'center', marginTop: 32, fontSize: 18 }}>
              Aún no sigues ninguna empresa
            </Text>
          ) : (
            empresasSeguidas.map((emp, idx) => (
              <TouchableOpacity
                key={emp.id || idx}
                style={{ backgroundColor: '#334155', borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 16 }}
                onPress={() => navigation.navigate('EmpresaScreenUser', { empresaId: emp.id })}
              >
                {emp.logo_url || emp.logo ? (
                  <Image
                    source={{ uri: emp.logo_url || emp.logo }}
                    style={{ width: 40, height: 40, borderRadius: 20, marginRight: 14, backgroundColor: '#111827' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 20, marginRight: 14, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 22 }}>🏢</Text>
                  </View>
                )}
                <Text style={{ color: '#e0e7ff', fontSize: 17, fontWeight: '500' }}>{emp.nombre || emp.name || 'Empresa sin nombre'}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}


      {/* Modal para cambiar foto de perfil */}
      <Modal
        visible={profilePicModal}
        animationType="fade"
        transparent
        onRequestClose={() => setProfilePicModal(false)}
      >
        <View style={styles.modalBackdrop}>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setProfilePicModal(false)}>
              <Text style={{ color:'#ffffffff', fontSize: 18, fontWeight:'700' }}>X</Text>
            </TouchableOpacity>
            <Text style={styles.settingsTitle}>Ajustes de cuenta</Text>
            <View style={styles.settingsAvatarRow}>
              <View style={styles.avatarPreviewOuter}>
                {avatarLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : avatarSrc ? (
                  <Image source={{ uri: avatarSrc }} style={styles.avatarPreview} />
                ) : (
                  <View style={styles.avatarPlaceholder}><Text style={{ color:'#94a3b8' }}>👤</Text></View>
                )}
              </View>
              <View style={{ marginLeft: 12, flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.settingsName}>{userData?.nombre || userData?.name || userName || 'Usuario'}</Text>
                    <TouchableOpacity onPress={openEditName} style={{ marginLeft: 8 }} accessibilityLabel="Editar nombre">
                      <Ionicons name="pencil" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.settingsEmail}>{userData?.email || 'Correo no disponible'}</Text>
                </View>

                <TouchableOpacity style={styles.deleteLink} onPress={async () => {
                  Alert.alert('Borrar cuenta', '¿Estás seguro? Esta acción es irreversible.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Borrar', style: 'destructive', onPress: async () => {
                      try {
                        let id = userData?.id;
                        if (!id) id = await AsyncStorage.getItem('userId');
                        if (!id) return Alert.alert('Error', 'Usuario no identificado');
                        const token = await AsyncStorage.getItem('accessToken');
                        const base = api.defaults?.baseURL || 'http://localhost:8000';
                        const url = `${base.replace(/\/$/, '')}/api/usuarios/${id}/`;
                        const resp = await fetch(url, { method: 'DELETE', headers: { Authorization: token ? `Bearer ${token}` : undefined } });
                        if (!resp.ok) {
                          const txt = await resp.text().catch(() => '');
                          return Alert.alert('Error', `No se pudo borrar la cuenta (${resp.status}) ${txt}`);
                        }
                        await Promise.all([
                          AsyncStorage.removeItem('userName'),
                          AsyncStorage.removeItem('userEmail'),
                          AsyncStorage.removeItem('accessToken'),
                          AsyncStorage.removeItem('empresaId'),
                          AsyncStorage.removeItem('isEmpresaAccount'),
                          AsyncStorage.removeItem('userId'),
                        ]);
                        setProfilePicModal(false);
                        Alert.alert('Cuenta borrada', 'Tu cuenta ha sido eliminada.');
                        navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
                      } catch (e) {
                        console.log('Error borrando cuenta:', e);
                        Alert.alert('Error', 'No se pudo borrar la cuenta. Intenta de nuevo.');
                      }
                    }}
                  ]);
                }}>
                  <Text style={{ color: '#fecaca', fontWeight: '700' }}>Borrar</Text>
                  <Text style={{ color: '#fecaca', fontWeight: '700' }}>cuenta</Text>
                  
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.settingsButton}
              onPress={async () => {
                setProfilePicModal(false);
                let id = userData?.id;
                try { if (!id) id = await AsyncStorage.getItem('userId'); } catch(_){}
                if (!id) { Alert.alert('Error','Usuario no identificado'); return; }
                const res = await handleUploadAvatar(id);
                if (res?.ok) Alert.alert('Éxito','Foto de perfil actualizada correctamente.');
              }}
            >
              <Text style={styles.settingsButtonText}>Cambiar foto de perfil</Text>
            </TouchableOpacity>
           

            

            
          </View>
        </View>
      </Modal>

      {/* Modal para editar nombre de usuario */}
      <Modal visible={editNameModal} animationType="fade" transparent onRequestClose={() => setEditNameModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Editar nombre</Text>
            <TextInput value={editNameText} onChangeText={setEditNameText} placeholder="Tu nombre" placeholderTextColor="#94a3b8" style={{ backgroundColor: '#0b1220', color:'#fff', padding:10, borderRadius:8 }} />
            <View style={{ flexDirection:'row', marginTop:12 }}>
              <TouchableOpacity style={[styles.settingsButton, { flex:1, marginRight:8 }]} onPress={handleSaveName} disabled={editNameLoading}>
                {editNameLoading ? <ActivityIndicator color="#051025" /> : <Text style={styles.settingsButtonText}>Guardar</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.settingsButton, { flex:1, backgroundColor:'#374151' }]} onPress={() => setEditNameModal(false)}>
                <Text style={[styles.settingsButtonText, { color:'#fff' }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>

      {/* Nueva sección: Empresas que sigues en la parte inferior */}
      {/* Lista de empresas que sigues, con estilo similar a eventos guardados */}
      {mostrarEmpresasAbajo && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#334155', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, zIndex: 100, maxHeight: '60%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#0ea5e9', fontWeight: 'bold', fontSize: 18 }}>Empresas que sigues</Text>
            <TouchableOpacity onPress={() => setMostrarEmpresasAbajo(false)}>
              <Text style={{ color: '#0ea5e9', fontWeight: 'bold', fontSize: 18 }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {empresasSeguidas && empresasSeguidas.length > 0 ? (
              empresasSeguidas.map((emp, idx) => (
                <TouchableOpacity
                  key={emp.id || idx}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: idx !== empresasSeguidas.length - 1 ? 1 : 0, borderColor: '#475569', backgroundColor: '#475569', borderRadius: 12, marginBottom: 10, paddingHorizontal: 10 }}
                  onPress={() => {
                    setMostrarEmpresasAbajo(false);
                    navigation.navigate('EmpresaScreen', { empresaId: emp.id });
                  }}
                >
                  {emp.logo_url || emp.logo ? (
                    <Image
                      source={{ uri: emp.logo_url || emp.logo }}
                      style={{ width: 40, height: 40, borderRadius: 20, marginRight: 14, backgroundColor: '#111827' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, marginRight: 14, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#94a3b8', fontSize: 22 }}>🏢</Text>
                    </View>
                  )}
                  <Text style={{ color: '#e0e7ff', fontSize: 17, fontWeight: '500' }}>{emp.nombre || emp.name || 'Empresa sin nombre'}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: '#d1d5db', textAlign: 'center', marginTop: 16, fontSize: 16 }}>Aún no sigues ninguna empresa</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#0f172a' },
  logoContainer: { flexDirection: 'row', alignItems: 'flex-end' },
  logoText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  logoSubText: { fontSize: 18, fontWeight: '600', color: '#ff007f', marginLeft: 8 },
  menuContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuItem: { color: '#fff', fontSize: 16, marginHorizontal: 8 },
  profileContainer: { alignItems: 'center', padding: 16, backgroundColor: '#1e293b', borderRadius: 16, margin: 16 },
  profileImage: { width: 128, height: 128, borderRadius: 64, borderWidth: 4, borderColor: '#e5e7eb', marginBottom: 12 },
  profileHintText: { color: '#cbd5e1', textAlign: 'center', marginBottom: 6 },
  editButton: { borderWidth: 1, borderColor: '#d1d5db', padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6', marginBottom: 8 },
  editButtonText: { color: '#374151', fontSize: 14 },
  userName: { fontSize: 24, fontWeight: '600', color: '#fff', marginBottom: 4 },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
    alignSelf: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userStats: { fontSize: 16, color: '#fff', marginBottom: 8 },
  highlight: { color: '#ff007f', fontWeight: 'bold' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginHorizontal: 4,
    minWidth: 56,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionButtonText: { fontSize: 14, fontWeight: '600' },
  blue: { backgroundColor: '#dbeafe', color: '#2563eb' },
  green: { backgroundColor: '#bbf7d0', color: '#059669' },
  purple: { backgroundColor: '#ede9fe', color: '#7c3aed' },
  enunciado: { fontSize: 24, color: '#fff', textAlign: 'center', marginVertical: 16 },
  instructionsColumn: {
    flexDirection: 'column',
    gap: 18,
    marginBottom: 16,
    alignItems: 'center',
    width: '100%',
  },
  infoBox: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    marginHorizontal: 4,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  blueBox: { backgroundColor: 'rgba(37,99,235,0.65)' },
  greenBox: { backgroundColor: 'rgba(34,197,94,0.65)' },
  purpleBox: { backgroundColor: 'rgba(162,28,175,0.65)' },
  infoTitle: { color: '#e0e7ff', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  infoDesc: { color: '#e0e7ff', fontSize: 12 },
  infoIconCircle: {
    borderRadius: 48,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContent: { backgroundColor: '#334155', padding: 16, borderRadius: 12, margin: 16 },
  sectionTitle: { color: '#fff', fontWeight: '400', fontSize: 26, marginBottom: 8 },
  sectionText: { color: '#fff', fontSize: 14 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  closeModal: { color: '#ff007f', fontSize: 16, marginTop: 12 },
  menuButton: { padding: 8, marginLeft: 12 },
  headerHome: {},
  logoContainerHome: {},
  headerRightHome: {},
  mobileMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  mobileMenuBox: {
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 260,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
  },
  mobileMenuItem: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(51,65,85,0.95)',
    width: '100%',
    alignItems: 'center',
  },
  mobileMenuText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  closeMobileMenuBtn: { marginTop: 8 },
  // Estilos extra para el botón activo
  sectionButtonActive: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    backgroundColor: '#c7d2fe', // Un poco más oscuro para el efecto
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
  eventoInfoText: { color: '#ffffff', fontSize: 14 },
  eventTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold', marginTop: 8 },
  eventInfo: { color: '#fff', marginBottom: 4 },
  eventPrice: { color: '#bef264', fontWeight: 'bold', marginBottom: 8 },
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
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  settingsButton: { backgroundColor: '#0ea5e9', paddingVertical: 10, borderRadius: 10, marginTop: 8, alignItems: 'center' },
  settingsButtonText: { color: '#051025', fontWeight: '700' },
  logoutBtn: { backgroundColor: '#ef4444' },
});
