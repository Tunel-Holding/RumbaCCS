import React, { useState, useRef, useEffect, useCallback } from 'react'; // <-- useCallback es buena práctica con useFocusEffect
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // <-- Importa useFocusEffect
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, Dimensions, Alert, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginConFallback } from '../utils/auth';

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

/*
Ejemplo de función para obtener eventos paginados, filtrados y con búsqueda desde el backend
Puedes usarla cuando el backend soporte estos parámetros:

const fetchEventos = async ({
  page = 0,
  pageSize = 10,
  search = '',
  categoria = '',
  fecha = '',
} = {}) => {
  try {
    const params = {
      limit: pageSize,
      offset: page * pageSize,
    };
    if (search) params.search = search;
    if (categoria) params.categoria = categoria;
    if (fecha) params.fecha = fecha;

    const res = await api.get('/api/eventos-publicos/', { params });
    // Si el backend usa DRF, los datos estarán en res.data.results y el total en res.data.count
    const eventos = res.data.results || res.data;
    const total = res.data.count || eventos.length;

    return { eventos, total };
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    return { eventos: [], total: 0 };
  }
};


const { eventos, total } = await fetchEventos({ page: 1, search: 'concierto', categoria: 'Festival' });
*/

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loginVisible, setLoginVisible] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasEmpresa, setHasEmpresa] = useState(false);
  const [ownEmpresaId, setOwnEmpresaId] = useState(null);
  const [empresaData, setEmpresaData] = useState(null);
  const [isEmpresaAccount, setIsEmpresaAccount] = useState(false); // <-- NUEVO ESTADO

  // --- FUNCIÓN PARA RECARGAR DATOS DE LA EMPRESA ---
  const refreshEmpresaData = useCallback(async () => {
    const token = await AsyncStorage.getItem('accessToken');
    const empresaId = await AsyncStorage.getItem('empresaId');
    
    // Actualizamos los estados base
    setHasEmpresa(!!empresaId);
    setOwnEmpresaId(empresaId);

    if (token && empresaId) {
      try {
        console.log(`Refrescando datos para empresaId: ${empresaId}`);
        const response = await api.get(`/api/public/empresas/${empresaId}/`);
        setEmpresaData(response.data);
      } catch (error) {
        console.error("Error refrescando datos de la empresa:", error);
        setEmpresaData(null); // Limpiamos si hay error
      }
    } else {
      setEmpresaData(null); // Limpiamos si no hay ID o token
    }
  }, []);

  // --- EFECTO PARA RECARGAR DATOS CUANDO LA PANTALLA ESTÁ EN FOCO ---
  useFocusEffect(
    useCallback(() => {
      const checkLoginAndRefresh = async () => {
        const token = await AsyncStorage.getItem('accessToken');
        const isEmpresaAcc = await AsyncStorage.getItem('isEmpresaAccount'); // Leemos el valor guardado
        
        setIsLogged(!!token); // Primero, actualiza el estado de login
        setIsEmpresaAccount(isEmpresaAcc === 'true'); // Actualizamos el estado de tipo de cuenta

        if (token) {
          console.log("HomeScreen en foco y logueado, actualizando datos...");
          await refreshEmpresaData(); // Luego, refresca los datos de la empresa
        } else {
          // Si no hay token, limpia los datos de la empresa
          setEmpresaData(null);
          setHasEmpresa(false);
          setOwnEmpresaId(null);
          setIsEmpresaAccount(false); // Aseguramos limpiar este estado también
        }
      };
      checkLoginAndRefresh();
    }, [refreshEmpresaData])
  );

  // ELIMINAMOS LOS OTROS useEffect que llamaban a checkSession.
  // useFocusEffect ahora es la única fuente de verdad para los datos de sesión.

  //Funcion de logout
  const handleLogout = async () => {
    // ... (tus otros AsyncStorage.removeItem)
    await AsyncStorage.removeItem('empresaId');
    await AsyncStorage.removeItem('isEmpresaAccount'); // Limpiamos el tipo de cuenta
    await AsyncStorage.clear(); // Opcional: clear() ya limpia todo
    setIsLogged(false);
    setIsEmpresaAccount(false); // Limpiamos el estado
    Alert.alert('Sesión cerrada', 'Has cerrado sesión correctamente');
  };

const handleLogin = async () => {
  setLoginError('');
  setLoginLoading(true);
  const resultado = await loginConFallback(user, pass);
  if (resultado.error) {
    switch (resultado.tipo) {
      case 'validacion':
        setLoginError('Por favor ingresa email y contraseña');
        break;
      case 'error':
        setLoginError('Error inesperado: ' + resultado.error);
        break;
      case 'credenciales':
        setLoginError('Usuario o contraseña incorrectos');
        break;
    }
    return;
  }
  console.log("Login exitoso, datos recibidos:", resultado.data);

  // --- LÓGICA DE DIFERENCIACIÓN DE CUENTAS ---
  // Si el login fue exitoso y trajo el objeto 'empresa', es una cuenta de empresa.
  if (resultado.data?.empresa) {
    console.log("Es una cuenta de Empresa:", resultado.data.empresa);
    setEmpresaData(resultado.data.empresa);
    setHasEmpresa(true); // Una cuenta de empresa, por definición, tiene empresa.
    setIsEmpresaAccount(true); // Marcamos que es una cuenta de tipo empresa.
    await AsyncStorage.setItem('isEmpresaAccount', 'true');
  } else {
    // Si no trae el objeto 'empresa', es una cuenta de usuario.
    console.log("Es una cuenta de Usuario.");
    setIsEmpresaAccount(false); // No es una cuenta de tipo empresa.
    
    // Verificamos si este usuario tiene una empresa vinculada.
    if (resultado.data?.empresa_id) {
      console.log("Usuario con empresa vinculada (ID):", resultado.data.empresa_id);
      setHasEmpresa(true);
    } else {
      console.log("Usuario sin empresa vinculada.");
      setHasEmpresa(false);
    }
    // En ambos casos de usuario, no tenemos los datos completos de la empresa aún.
    setEmpresaData(null);
    await AsyncStorage.setItem('isEmpresaAccount', 'false');
  }

  setIsLogged(true);
  setLoginVisible(false);
  Alert.alert('Login correcto', `Bienvenido/a`);
  // No es necesario navegar, el estado se actualizará y la UI cambiará sola.
};



  const [events, setEventos] = useState([]);
  // Cache local de datos de empresas para evitar múltiples llamadas.
  const [companyCache, setCompanyCache] = useState({}); // { empresaId: { nombre, logo } }
  const pageSize = 10;
  const [page, setPage] = useState(0); // página actual 0-index
  // Estados de ubicación (placeholder, sin llamadas nativas todavía)
  const [userLocation, setUserLocation] = useState(null); // { latitude, longitude }
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | requesting | granted | denied

  // Función real para solicitar permisos y ubicación usando expo-location
  const solicitarUbicacion = async () => {
    setLocationStatus('requesting');
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationStatus('denied');
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    setUserLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    setLocationStatus('granted');
  };

  // ---- Normalización y búsqueda difusa (fuzzy) ----
  const normalizeText = (str = '') => {
    try {
      return str
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '') // quita acentos y diacríticos
        .toLowerCase()
        .trim();
    } catch {
      return (str || '').toLowerCase();
    }
  };

  const levenshtein = (a, b) => {
    if (a === b) return 0;
    const al = a.length, bl = b.length;
    if (al === 0) return bl; if (bl === 0) return al;
    const dp = Array.from({ length: al + 1 }, (_, i) => Array(bl + 1).fill(0));
    for (let i = 0; i <= al; i++) dp[i][0] = i;
    for (let j = 0; j <= bl; j++) dp[0][j] = j;
    for (let i = 1; i <= al; i++) {
      for (let j = 1; j <= bl; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[al][bl];
  };

  const fuzzyMatch = (needleRaw, haystackRaw, maxRelative = 0.4) => {
    const needle = normalizeText(needleRaw);
    const haystack = normalizeText(haystackRaw);
    if (!needle || !haystack) return false;
    if (haystack.includes(needle)) return true; // substring directo
    const tokens = haystack.split(/\s+/).filter(Boolean);
    for (const tk of tokens) {
      if (tk.startsWith(needle)) return true; // prefijo
      const dist = levenshtein(needle, tk);
      const rel = dist / Math.max(needle.length, tk.length);
      if (rel <= maxRelative) return true;
    }
    return false;
  };

useEffect(() => {
  const fetchEventos = async () => {
    try {
      const res = await api.get('/api/eventos-publicos/');
      const data = res.data;

      // Transformamos eventos
      const eventosTransformados = data.map(ev => {
        const categorias = Array.isArray(ev.categoria)
          ? ev.categoria
          : (ev.categoria ? [ev.categoria] : ['Sin categoría']);

        return {
          id: ev.id,
          rawEmpresaId: ev.empresa,
          title: ev.titulo,
          date: ev.fecha_evento
            ? new Date(ev.fecha_evento).toLocaleDateString()
            : (ev.creado_en ? new Date(ev.creado_en).toLocaleDateString() : 'Fecha no definida'),
          time: ev.fecha_evento
            ? new Date(ev.fecha_evento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null,
          location: ev.ubicacion || 'Ubicación no definida',
          price: ev.precio === '0.00'
            ? 'Entrada libre'
            : `$${parseFloat(ev.precio).toLocaleString()}`,
          type: categorias,
          tag: categorias[0],
          imagenes: ev.imagenes,
          image: ev.imagen || 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png',
          // Usamos el caché si ya existe, si no, un placeholder
          ownerName: companyCache[ev.empresa]?.nombre || `Empresa #${ev.empresa}`,
          ownerLogo: companyCache[ev.empresa]?.logo || null,
        };
      });

      setEventos(eventosTransformados);

      // ---- Resolver datos de empresa usando el endpoint bulk ----
      const idsPendientes = [...new Set(
        eventosTransformados
          .filter(ev => ev.rawEmpresaId && !companyCache[ev.rawEmpresaId])
          .map(ev => ev.rawEmpresaId)
      )];

      if (idsPendientes.length) {
        try {
          const resp = await api.get(`/api/public/empresas/bulk/`, {
            params: { ids: idsPendientes.join(',') },
            timeout: 25000
          });

          const empresas = resp.data; // ← array de { id, nombre, logo }
          const nuevosDatosEmpresa = {};
          empresas.forEach(emp => {
            // Guardamos el objeto completo con nombre y logo
            nuevosDatosEmpresa[emp.id] = {
              nombre: emp.nombre,
              logo: emp.logo
            };
          });

          // fallback por si alguna empresa no existe en la respuesta
          idsPendientes.forEach(id => {
            if (!nuevosDatosEmpresa[id]) {
              nuevosDatosEmpresa[id] = { nombre: `Empresa #${id}`, logo: null };
            }
          });

          // Actualizamos el caché y el estado de los eventos con los nuevos datos
          setCompanyCache(prev => ({ ...prev, ...nuevosDatosEmpresa }));
          setEventos(prev =>
            prev.map(ev =>
              ev.rawEmpresaId && nuevosDatosEmpresa[ev.rawEmpresaId]
                ? {
                    ...ev,
                    ownerName: nuevosDatosEmpresa[ev.rawEmpresaId].nombre,
                    ownerLogo: nuevosDatosEmpresa[ev.rawEmpresaId].logo,
                  }
                : ev
            )
          );
        } catch (err) {
          console.error('Error resolviendo datos de empresa en bulk:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching eventos públicos:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchEventos();
}, []);

  // Filtros disponibles
  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'nearby', label: 'Eventos cerca de ti' },
    { key: 'Concierto', label: 'Concierto' },
    { key: 'Feria', label: 'Feria' },
    { key: 'Festival', label: 'Festival' },
    { key: 'Exposición', label: 'Exposición' },
    { key: 'Conferencia', label: 'Conferencia' },
    { key: 'Workshop', label: 'Workshop' },
    { key: 'Networking', label: 'Networking' },
    { key: 'Show', label: 'Show' },
    { key: 'Deportivo', label: 'Deportivo' },
    { key: 'Cultural', label: 'Cultural' },
    { key: 'Gastronómico', label: 'Gastronómico' },
    { key: 'Tecnológico', label: 'Tecnológico' },
    { key: 'Arte', label: 'Arte' },
    { key: 'Música', label: 'Música' },
    { key: 'Teatro', label: 'Teatro' },
  ];

  // Footer links
  const footerLinks = [
    { title: 'Reservas' },
    { title: 'Promoción de eventos' },
    { title: 'Soporte al organizador' },
    { title: 'API para desarrolladores' }
  ];

  // const fuente = filter === 'nearby' ? events /* placeholder: luego lista filtrada por distancia */ : events;
  // const filteredEvents = fuente.filter(e => {
  //   const categorias = Array.isArray(e.type) ? e.type : [e.type];
  //   const matchesFilter = filter === 'all' || filter === 'nearby' || categorias.includes(filter);
  //   const rawQuery = search.trim();
  //   if (!rawQuery) return matchesFilter; // sin búsqueda textual

  //   const qTokens = normalizeText(rawQuery).split(/\s+/).filter(Boolean);
  //   if (!qTokens.length) return matchesFilter;

  //   const fields = [e.title || '', e.location || '', categorias.join(' '), e.ownerName || ''];

  //   // Cada token debe hacer match aprox en algún campo
  //   const allTokens = qTokens.every(token => fields.some(f => fuzzyMatch(token, f)));
  //   return matchesFilter && allTokens;
  // });

  // --- estados extra ---
const [nearbyEvents, setNearbyEvents] = useState([]);

const fuente = filter === "nearby" ? nearbyEvents : events || [];

// --- filtro por categorías + búsqueda ---
const filteredEvents = fuente.filter(e => {
  const categorias = Array.isArray(e.type) ? e.type : [e.type];
  const matchesFilter = filter === 'all' || filter === 'nearby' || categorias.includes(filter);
  const rawQuery = search.trim();
  if (!rawQuery) return matchesFilter;

  const qTokens = normalizeText(rawQuery).split(/\s+/).filter(Boolean);
  if (!qTokens.length) return matchesFilter;

  const fields = [e.title || '', e.location || '', categorias.join(' '), e.ownerName || ''];

  return matchesFilter && qTokens.every(token => fields.some(f => fuzzyMatch(token, f)));
});

// --- useEffect: cuando el user da permiso y activa el filtro "nearby"
useEffect(() => {
  // Convertimos la lógica a async/await para manejar mejor las llamadas en cadena
  const fetchNearbyEvents = async () => {
    if (filter !== "nearby" || !userLocation) {
      return; // No hacer nada si el filtro no es 'nearby' o no hay ubicación
    }

    try {
      const res = await api.get(`/api/eventos-publicos/nearby/?lat=${userLocation.latitude}&lng=${userLocation.longitude}&radius=5`);
      const eventos = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);

      // 1. Adaptar al formato de Home, usando el caché si ya existe
      const adaptados = eventos.map(ev => {
        const categorias = Array.isArray(ev.categoria) ? ev.categoria : [ev.categoria];
        return {
          ...ev,
          id: ev.id,
          rawEmpresaId: ev.empresa,
          title: ev.titulo,
          date: ev.fecha_evento
            ? new Date(ev.fecha_evento).toLocaleDateString()
            : (ev.creado_en ? new Date(ev.creado_en).toLocaleDateString() : 'Fecha no definida'),
          time: ev.fecha_evento
            ? new Date(ev.fecha_evento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null,
          location: ev.ubicacion || 'Ubicación no definida',
          price: ev.precio === '0.00'
            ? 'Entrada libre'
            : `$${parseFloat(ev.precio).toLocaleString()}`,
          type: categorias,
          tag: categorias[0],
          imagenes: ev.imagenes,
          image: ev.imagen || 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png',
          // Usamos el caché existente para una carga inicial rápida
          ownerName: companyCache[ev.empresa]?.nombre || `Empresa #${ev.empresa}`,
          ownerLogo: companyCache[ev.empresa]?.logo || null,
        };
      });

      setNearbyEvents(adaptados); // Mostramos los eventos inmediatamente

      // 2. Buscar IDs de empresas que no estén en el caché
      const idsPendientes = [...new Set(
        adaptados
          .filter(ev => ev.rawEmpresaId && !companyCache[ev.rawEmpresaId])
          .map(ev => ev.rawEmpresaId)
      )];

      // 3. Si hay IDs pendientes, hacer la llamada bulk
      if (idsPendientes.length > 0) {
        const resp = await api.get(`/api/public/empresas/bulk/`, {
          params: { ids: idsPendientes.join(',') },
        });

        const empresas = resp.data; // array de { id, nombre, logo }
        const nuevosDatosEmpresa = {};
        empresas.forEach(emp => {
          nuevosDatosEmpresa[emp.id] = {
            nombre: emp.nombre,
            logo: emp.logo // <-- Usando 'logo' como especificaste
          };
        });

        // 4. Actualizar el caché y el estado de los eventos cercanos
        setCompanyCache(prev => ({ ...prev, ...nuevosDatosEmpresa }));
        setNearbyEvents(prev =>
          prev.map(ev =>
            ev.rawEmpresaId && nuevosDatosEmpresa[ev.rawEmpresaId]
              ? {
                  ...ev,
                  ownerName: nuevosDatosEmpresa[ev.rawEmpresaId].nombre,
                  ownerLogo: nuevosDatosEmpresa[ev.rawEmpresaId].logo,
                }
              : ev
          )
        );
      }
    } catch (err) {
      console.error("Error cargando o procesando eventos cercanos:", err);
    }
  };

  fetchNearbyEvents();
}, [filter, userLocation]);



  // Reiniciar página si cambian filtro o búsqueda
  useEffect(() => { setPage(0); }, [filter, search]);
  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const pageEvents = filteredEvents.slice(page * pageSize, (page + 1) * pageSize);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;
  const goPrev = () => { if (canPrev) { setPage(p => p - 1); scrollRef.current?.scrollTo({ y: 0, animated: true }); } };
  const goNext = () => { if (canNext) { setPage(p => p + 1); scrollRef.current?.scrollTo({ y: 0, animated: true }); } };

  // Cuando cambia filtro o búsqueda, reinicia página y sube arriba
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [filter, search]);


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
    <View style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top, paddingBottom: 0 }}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom, paddingTop: 32 }}
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
              {/* {empresaData?.logo ? (
                        <Image
                          source={{ uri: empresaData.logo }}
                          style={{ width: 100, height: 100, borderRadius: 50 }}
                        />
                      ) : (
                        <Text style={styles.fotoIcon}>👤</Text>
                      )} */}
              {isLogged && (
                <TouchableOpacity 
                  // Redirige a 'Empresa' si es una cuenta de empresa, si no, a 'Perfil'.
                  onPress={() => {
                    if (isEmpresaAccount) {
                      navigation.navigate('Empresa');
                    } else {
                      navigation.navigate('Perfil');
                    }
                  }}
                >
                  <Image
                    // Muestra el logo de la empresa si es una cuenta de empresa y tiene logo, si no, un avatar genérico.
                    source={{ uri: (isEmpresaAccount && empresaData?.logo) ? empresaData.logo : 'https://randomuser.me/api/portraits/men/32.jpg' }}
                    style={{ width: 32, height: 32, borderRadius: 100, marginLeft: 12, borderWidth: 1, borderColor: '#0ea5e9' }}
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

        {/* Filtros (revertido a una sola fila scrollable) */}
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

        {/* Eventos */}
        <Text style={styles.sectionTitle}>
          {filter === 'all' && 'Próximos eventos'}
          {filter === 'nearby' && 'Eventos cerca de ti'}
          {filter !== 'all' && filter !== 'nearby' && `Eventos de ${filter}`}
        </Text>

        {/* Mensaje de permiso de ubicación (placeholder) */}
        {filter === 'nearby' && !userLocation && (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>
              Debes otorgar permiso a RumbaCCS para acceder a tu ubicación y mostrar eventos cerca de ti.
            </Text>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={solicitarUbicacion}
              disabled={locationStatus === 'requesting'}
            >
              <Text style={styles.permissionBtnText}>
                {locationStatus === 'requesting' ? 'Solicitando...' : (locationStatus === 'denied' ? 'Intentar de nuevo' : 'Permitir ubicación')}
              </Text>
            </TouchableOpacity>
            {locationStatus === 'denied' && (
              <Text style={[styles.permissionText, { marginTop: 8, fontSize: 12, opacity: 0.8 }]}>Permiso denegado. Intenta nuevamente.</Text>
            )}
          </View>
        )}
        
        {/* Lista de eventos (oculta si se requiere ubicación para 'nearby') */}
        {!(filter === 'nearby' && !userLocation) && (
          <>
            <View style={styles.eventsGrid}>
              {pageEvents.length === 0 ? (
                <Text style={{ color: '#fff', textAlign: 'center', marginVertical: 20, width: '100%' }}>No hay eventos para mostrar.</Text>
              ) : (
                pageEvents.map(event => (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.ownerRow}>
                      {/* --- MODIFICACIÓN AQUÍ --- */}
                      {event.ownerLogo ? (
                        // Si hay un logo, muestra la imagen
                        <Image
                          source={{ uri: event.ownerLogo }}
                          style={styles.ownerAvatar} // Reutilizamos el estilo para que sea circular
                        />
                      ) : (
                        // Si no hay logo, muestra el avatar con la inicial (fallback)
                        <View style={styles.ownerAvatar}>
                          <Text style={styles.ownerAvatarText}>{(event.ownerName||'?').charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      {/* --- FIN DE LA MODIFICACIÓN --- */}
                      <View style={{ flex:1 }}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            // Preferimos el id real si está disponible
                            let empresaIdTarget = event.rawEmpresaId || null;
                            if (!empresaIdTarget && event.ownerName?.startsWith('Empresa #')) {
                              empresaIdTarget = event.ownerName.replace('Empresa #','');
                            }
                            if (!empresaIdTarget) return; // No es una empresa identificable

                            if (ownEmpresaId && String(empresaIdTarget) === String(ownEmpresaId)) {
                              // Es la propia empresa logueada
                              navigation.navigate('Empresa');
                            } else {
                              // Cualquier otro usuario (sea empresa o usuario normal) ve el perfil público
                              navigation.navigate('EmpresaScreenUser', { empresaId: empresaIdTarget });
                            }
                          }}
                        >
                          <Text style={[styles.ownerName, (event.rawEmpresaId || (event.ownerName?.startsWith('Empresa #'))) && { textDecorationLine: 'underline' }]}>{event.ownerName}</Text>
                        </TouchableOpacity>
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
                    {/* <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventInfo}>{event.date}{event.time ? ` · ${event.time}` : ''} · {event.location}</Text> */}
                    <Text style={styles.eventTitle}>{event.title}</Text>
                                                          
                    {event.time && event.time !== 'Hora no definida' && (
                      <View style={styles.eventoInfo}>
                        <Text style={styles.eventoInfoText}>📅 {event.date}  ⏰ {event.time}</Text>
                      </View>
                    )}
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventoInfoText}>📍 {event.location}</Text>
                    </View>
                    <Text style={styles.eventPrice}>{event.price}</Text>
                    <TouchableOpacity
                      style={styles.reserveBtn}
                      onPress={() => {
                        if (hasEmpresa) {
                          // Si es empresa: navegar a la pantalla de detalles (BuyScreen)
                          navigation.navigate('Reservar/Comprar', {
                            idEvento: event.id,
                            idEmpresa: event.ownerName?.startsWith('Empresa #') ? event.ownerName.replace('Empresa #','') : undefined
                          });
                        } else {
                          // Si es usuario: navegar a BuyScreen para ver detalles y poder guardar
                          navigation.navigate('Reservar/Comprar', {
                            idEvento: event.id,
                            idEmpresa: event.ownerName?.startsWith('Empresa #') ? event.ownerName.replace('Empresa #','') : undefined
                          });
                        }
                      }}
                    >
                      <Text style={styles.reserveText}>{hasEmpresa ? 'Ver detalles' : 'Ver detalles'}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {filteredEvents.length > pageSize && (
              <View style={styles.paginationBar}>
                <TouchableOpacity onPress={goPrev} disabled={!canPrev} style={[styles.pageArrow, !canPrev && styles.pageArrowDisabled]}>
                  <Text style={styles.pageArrowText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.pageIndicator}>Página {page + 1} de {totalPages}</Text>
                <TouchableOpacity onPress={goNext} disabled={!canNext} style={[styles.pageArrow, !canNext && styles.pageArrowDisabled]}>
                  <Text style={styles.pageArrowText}>{'>'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

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


            {loginError ? (
              <Text style={{ color: '#ef4444', marginBottom: 8, textAlign: 'center', fontWeight: 'bold' }}>{loginError}</Text>
            ) : null}
            <TouchableOpacity style={styles.loginBtnModal} onPress={handleLogin} disabled={loginLoading}>
              {loginLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Ingresar</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginLinks}>
              <TouchableOpacity
                onPress={() => {
                  setLoginVisible(false);
                  navigation.navigate('RecuperarContrasena');
                }}
              >
                <Text style={styles.loginLink}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
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
    </View>
  );
}

const CARD_WIDTH = width < 600 ? width - 32 : (width - 48) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 8 },
  // fixedBottomPad eliminado: ahora usamos padding dinámico con insets.bottom
  header: { backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b', marginBottom: 12 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoContainer: { flexDirection: 'row', alignItems: 'flex-end' },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  logoSubtext: { fontSize: 16, fontWeight: '600', color: '#db2777', marginLeft: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
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
  eventImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 8 },
  eventTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold', marginTop: 8 },
  eventInfo: { color: '#fff', marginBottom: 4 },
  eventPrice: { color: '#bef264', fontWeight: 'bold', marginBottom: 8 },
  reserveBtn: { backgroundColor: '#6366f1', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  reserveText: { color: '#fff', fontWeight: 'bold' },
  paginationBar: { flexDirection:'row', alignItems:'center', justifyContent:'center', marginTop:12, marginBottom:16, gap:16 },
  permissionBox: { backgroundColor:'#1e293b', borderRadius:12, padding:16, marginBottom:16, borderWidth:1, borderColor:'#334155' },
  permissionText: { color:'#fff', fontSize:14, lineHeight:18 },
  permissionBtn: { backgroundColor:'#0ea5e9', paddingVertical:8, paddingHorizontal:16, borderRadius:8, marginTop:12, alignSelf:'flex-start' },
  permissionBtnText: { color:'#fff', fontWeight:'600' },
  pageArrow: { backgroundColor:'#475569', paddingVertical:8, paddingHorizontal:16, borderRadius:8 },
  pageArrowDisabled: { backgroundColor:'#1e293b' },
  pageArrowText: { color:'#fff', fontSize:18, fontWeight:'700' },
  pageIndicator: { color:'#fff', fontSize:14, fontWeight:'600' },
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
  eventoInfo: { marginBottom: 4 },
  eventoInfoText: { color: '#ffffff', fontSize: 14 },
});
