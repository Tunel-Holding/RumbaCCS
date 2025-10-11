import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'; // <-- useCallback es buena práctica con useFocusEffect
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // <-- Importa useFocusEffect
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, Dimensions, Alert, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginConFallback } from '../utils/auth';
import axios from 'axios';


import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

import * as Location from 'expo-location';
import HeaderBase from '../components/HeaderBase';

const { width } = Dimensions.get('window');


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const heroScrollRef = useRef(null);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  // Carousel events state (independent)
  const [carouselEvents, setCarouselEvents] = useState([]);

  const scrollToHeroIndex = (index) => {
    const cardW = width; // full-bleed card width (no gap)
    if (heroScrollRef.current && typeof heroScrollRef.current.scrollTo === 'function') {
      try {
        heroScrollRef.current.scrollTo({ x: index * cardW, animated: true });
      } catch (e) {
        // some RN versions expose different refs; ignore
      }
    }
  };

  useEffect(() => {
    // Auto-advance every 4s
    const maxCards = Math.max(1, (carouselEvents && carouselEvents.length > 0 ? Math.min(carouselEvents.length, 3) : 3));
    const interval = setInterval(() => {
      setCurrentHeroIndex(prev => {
        const next = (prev + 1) % maxCards;
        scrollToHeroIndex(next);
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselEvents]);

  // Fetch first 3 events for carousel (independent of filters/search)
  useEffect(() => {
    const fetchCarouselEvents = async () => {
      try {
        const res = await api.get('/api/eventos-publicos/', { params: { page: 1, page_size: 3 } });
        const responseData = res.data || {};
        const resultadosRaw = Array.isArray(responseData.results)
          ? responseData.results
          : Array.isArray(responseData)
          ? responseData
          : [];
        const eventosTransformados = resultadosRaw.map(ev => ({
          id: ev.id,
          rawEmpresaId: ev.empresa,
          title: ev.titulo,
          date: ev.fecha_evento
            ? new Date(ev.fecha_evento).toLocaleDateString()
            : ev.creado_en
            ? new Date(ev.creado_en).toLocaleDateString()
            : "Fecha no definida",
          time: ev.fecha_evento
            ? new Date(ev.fecha_evento).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : null,
          location: ev.ubicacion || "Ubicación no definida",
          price: ev.precio === "0.00" ? "Entrada libre" : `$${parseFloat(ev.precio).toLocaleString()}`,
          type: Array.isArray(ev.categoria) ? ev.categoria : ev.categoria ? [ev.categoria] : ["Sin categoría"],
          tag: Array.isArray(ev.categoria) ? ev.categoria[0] : ev.categoria || "Sin categoría",
          imagenes: ev.imagenes,
          image: ev.imagen || "https://storage.googleapis.com/.../placeholder.png",
          ownerName: `Empresa #${ev.empresa}`,
          ownerLogo: null,
        }));
        setCarouselEvents(eventosTransformados);
      } catch (error) {
        setCarouselEvents([]);
      }
    };
    fetchCarouselEvents();
  }, []);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [eventoPromoted, setEventoPromoted] = useState(null);
  const [loginVisible, setLoginVisible] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingline, setLoadingline] = useState(false); // <-- Nuevo estado para loading inline
  const [hasEmpresa, setHasEmpresa] = useState(false);
  const [ownEmpresaId, setOwnEmpresaId] = useState(null);
  const [empresaData, setEmpresaData] = useState(null);
  const [userData, setUserData] = useState(null); // Estado para datos del usuario
  // Memo para evitar recrear el objeto avatar_url en cada render
  const userAvatarUrl = useMemo(() => userData?.avatar_url ? `${userData.avatar_url}` : null, [userData?.avatar_url]);
  const [isEmpresaAccount, setIsEmpresaAccount] = useState(false); // <-- NUEVO ESTADO
  const [isUserAccount, setIsUserAccount] = useState(false); // Estado para saber si es cuenta de usuario
  const [hasMore, setHasMore] = useState(true);      // CAMBIO: controla si hay más páginas en backend
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // Consistente con el backend

  let searchTimeout;
  
// useEffect(() => {
//   if (filter === "nearby" && !userLocation) return; // espera ubicación
//   fetchEventos(1, false);
// }, [filter, userLocation, search]);


  // --- FUNCIÓN PARA RECARGAR DATOS DE LA EMPRESA ---
  const refreshEmpresaData = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, []);

  // --- EFECTO PARA RECARGAR DATOS CUANDO LA PANTALLA ESTÁ EN FOCO ---
  useFocusEffect(
    useCallback(() => {
      const checkLoginAndRefresh = async () => {
        setLoading(true);
        const token = await AsyncStorage.getItem('accessToken');
        const isEmpresaAcc = await AsyncStorage.getItem('isEmpresaAccount'); // Leemos el valor guardado
        const isUserAcc = await AsyncStorage.getItem('isUserAccount'); // <-- AÑADE ESTA LÍNEA
        const userId = await AsyncStorage.getItem('userId');

        if (userId) {
            const userResponse = await api.get(`/api/usuarios/${userId}/`);
            setUserData(userResponse.data);
          }
        
        setIsLogged(!!token); // Primero, actualiza el estado de login
        setIsEmpresaAccount(isEmpresaAcc === 'true'); // Actualizamos el estado de tipo de cuenta
        setIsUserAccount(isUserAcc === 'true');
       

        if (token) {
          console.log("HomeScreen en foco y logueado, actualizando datos...");
          await refreshEmpresaData(); // Luego, refresca los datos de la empresa
        } else {
          // Si no hay token, limpia los datos de la empresa
          setEmpresaData(null);
          setHasEmpresa(false);
          setOwnEmpresaId(null);
          setIsEmpresaAccount(false); // Aseguramos limpiar este estado 
          setIsUserAccount(false);
        }
      };
      checkLoginAndRefresh();
      setLoading(false);
    }, [refreshEmpresaData])
  );

  // ELIMINAMOS LOS OTROS useEffect que llamaban a checkSession.
  // useFocusEffect ahora es la única fuente de verdad para los datos de sesión.

  //Funcion de logout
  const handleLogout = async () => {
    // ... (tus otros AsyncStorage.removeItem)
    await AsyncStorage.removeItem('empresaId');
    await AsyncStorage.removeItem('isEmpresaAccount'); // Limpiamos el tipo de cuenta
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('isUserAccount');
    await AsyncStorage.clear(); // Opcional: clear() ya limpia todo
    setIsLogged(false);
    setIsEmpresaAccount(false); // Limpiamos el estado

  };

const handleLogin = async () => {
  setLoginError('');
  setLoginLoading(true);
  try {
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
      return; // Salimos de la función si hay un error
    }
    console.log("Login exitoso, datos recibidos:", resultado.data);

    // --- LÓGICA DE DIFERENCIACIÓN DE CUENTAS ---
    // (Tu lógica existente se mantiene aquí)
     // 1. Limpiamos el estado anterior para evitar datos mezclados
    await AsyncStorage.clear();

    // 2. Determinamos el tipo de cuenta y los datos a guardar
    if (resultado.data?.empresa) {
      // --- CASO: Cuenta de Empresa Pura ---
      console.log("Es una cuenta de Empresa Pura");
      const empresa = resultado.data.empresa;
      
      // Guardamos todos los datos de la sesión de empresa
      await AsyncStorage.setItem('accessToken', resultado.data.access);
      await AsyncStorage.setItem('refreshToken', resultado.data.refresh);
      await AsyncStorage.setItem('empresaId', empresa.id.toString());
      await AsyncStorage.setItem('isEmpresaAccount', 'true');
      await AsyncStorage.setItem('isUserAccount', 'false');

      // Actualizamos el estado del componente
      setEmpresaData(empresa);
      setHasEmpresa(true);
      setIsEmpresaAccount(true);
      setIsUserAccount(false);

    } else if (resultado.data?.user) {
      // --- CASO: Cuenta de Usuario (con o sin empresa asociada) ---
      console.log("Es una cuenta de Usuario");
      const userData = resultado.data.user;

      // Guardamos todos los datos de la sesión de usuario
      await AsyncStorage.setItem('accessToken', resultado.data.access);
      await AsyncStorage.setItem('refreshToken', resultado.data.refresh);
      await AsyncStorage.setItem('userId', userData.id.toString());
      await AsyncStorage.setItem('userName', userData.username);
      await AsyncStorage.setItem('isUserAccount', 'true');
      await AsyncStorage.setItem('isEmpresaAccount', 'false');

      setUserData(userData); // Guardamos los datos del usuario en el estado

      // Si tiene empresa asociada, guardamos también su ID
      if (resultado.data?.empresa_id) {
        console.log("Usuario con empresa vinculada (ID):", resultado.data.empresa_id);
        await AsyncStorage.setItem('empresaId', resultado.data.empresa_id.toString());
        setHasEmpresa(true);
      } else {
        console.log("Usuario sin empresa vinculada.");
        setHasEmpresa(false);
      }
      
      // Actualizamos el estado del componente
      setEmpresaData(null); // Una cuenta de usuario no gestiona directamente los datos de la empresa
      setIsUserAccount(true);
      setIsEmpresaAccount(false);
    }

    // 3. Finalizamos el flujo de login
    setIsLogged(true);
    setLoginVisible(false);
    // Alert.alert('Login correcto', `Bienvenido/a`); // Opcional: puedes quitar el alert para un UX más fluido

  } finally {
    // Este bloque se ejecuta SIEMPRE, tanto si hay éxito como si hay error.
    setLoginLoading(false);
  }
};


  const [events, setEventos] = useState([]);
  // Cache local de datos de empresas para evitar múltiples llamadas.
  const [companyCache, setCompanyCache] = useState({}); // { empresaId: { nombre, logo } }
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

  const [debouncedSearch, setDebouncedSearch] = useState("");
const searchCancelToken = useRef(null);

// 🔹 Debounce: solo actualizar debouncedSearch 600ms después de que el usuario deje de escribir
useEffect(() => {
  const handler = setTimeout(() => {
    setDebouncedSearch(search.trim());
  }, 600);

  return () => clearTimeout(handler);
}, [search]);

// 🔹 Fetch de eventos solo cuando cambia debouncedSearch o filter
useEffect(() => {
  fetchEventos(1, false);
}, [debouncedSearch, filter]);


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

const fetchEventos = async (pageNumber = 1, append = false) => {
  setLoadingline(true);

  if (!append) scrollRef.current?.scrollTo({ y: 0, animated: true });

  // Cancelar request anterior si existe
  if (searchCancelToken.current) {
    searchCancelToken.current.cancel("Nueva búsqueda, cancelando anterior");
  }
  searchCancelToken.current = axios.CancelToken.source();

  try {
    const isNearbyFilter = filter === "nearby";
    const hasLocation = !!userLocation;

    let url = "/api/eventos-publicos/";
    if (isNearbyFilter && hasLocation) url = "/api/eventos-publicos/nearby/";

    const params = { page: pageNumber, page_size: pageSize };

    if (isNearbyFilter && hasLocation) {
      params.lat = userLocation.latitude;
      params.lng = userLocation.longitude;
      params.radius = 5;
    }

    if (!isNearbyFilter) {
      if (filter && filter !== "all") params.categoria = filter;
      if (debouncedSearch) params.search = debouncedSearch;
    }

    const res = await api.get(url, {
      params,
      timeout: 25000,
      cancelToken: searchCancelToken.current.token,
    });

    const responseData = res.data || {};
    const resultadosRaw = Array.isArray(responseData.results)
      ? responseData.results
      : Array.isArray(responseData)
      ? responseData
      : [];

    if (responseData.count !== undefined) {
      setNextPage(responseData.next ? pageNumber + 1 : null);
      setPrevPage(responseData.previous ? pageNumber - 1 : null);
      setTotalCount(responseData.count);
      setCurrentPage(pageNumber);
    }

    const eventosTransformados = resultadosRaw.map(ev => ({
      id: ev.id,
      rawEmpresaId: ev.empresa,
      title: ev.titulo,
      date: ev.fecha_evento
        ? new Date(ev.fecha_evento).toLocaleDateString()
        : ev.creado_en
        ? new Date(ev.creado_en).toLocaleDateString()
        : "Fecha no definida",
      time: ev.fecha_evento
        ? new Date(ev.fecha_evento).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      location: ev.ubicacion || "Ubicación no definida",
      price: ev.precio === "0.00" ? "Entrada libre" : `$${parseFloat(ev.precio).toLocaleString()}`,
      type: Array.isArray(ev.categoria) ? ev.categoria : ev.categoria ? [ev.categoria] : ["Sin categoría"],
      tag: Array.isArray(ev.categoria) ? ev.categoria[0] : ev.categoria || "Sin categoría",
      imagenes: ev.imagenes,
      image: ev.imagen || "https://storage.googleapis.com/.../placeholder.png",
      ownerName: companyCache[ev.empresa]?.nombre || `Empresa #${ev.empresa}`,
      ownerLogo: companyCache[ev.empresa]?.logo || null,
    }));

    setEventos(prev => (append ? [...prev, ...eventosTransformados] : eventosTransformados));
    setHasMore(Boolean(responseData.next));

    // Actualización de empresas
    const idsPendientes = [
      ...new Set(eventosTransformados.map(ev => ev.rawEmpresaId).filter(id => id && !companyCache[id])),
    ];
    if (idsPendientes.length) {
      const resp = await api.get("/api/public/empresas/bulk/", {
        params: { ids: idsPendientes.join(",") },
        timeout: 25000,
      });
      const empresas = Array.isArray(resp.data) ? resp.data : [];
      const nuevosDatosEmpresa = {};
      empresas.forEach(emp => (nuevosDatosEmpresa[emp.id] = { nombre: emp.nombre, logo: emp.logo }));
      idsPendientes.forEach(id => {
        if (!nuevosDatosEmpresa[id]) nuevosDatosEmpresa[id] = { nombre: `Empresa #${id}`, logo: null };
      });
      setCompanyCache(prev => ({ ...prev, ...nuevosDatosEmpresa }));
      setEventos(prev =>
        prev.map(ev =>
          ev.rawEmpresaId && nuevosDatosEmpresa[ev.rawEmpresaId]
            ? { ...ev, ownerName: nuevosDatosEmpresa[ev.rawEmpresaId].nombre, ownerLogo: nuevosDatosEmpresa[ev.rawEmpresaId].logo }
            : ev
        )
      );
    }
  } catch (error) {
    if (!axios.isCancel(error)) console.error(error);
  } finally {
    setLoadingline(false);
  }
};

 // tu función fetchPromotedEventos (la que ya tienes)
  const fetchPromotedEventos = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/eventos-publicos/promoted/", { timeout: 15000 });
      const resultadosRaw = Array.isArray(res.data) ? res.data : [];

      const eventosTransformados = resultadosRaw.map(ev => ({
        id: ev.id,
        rawEmpresaId: ev.empresa,
        title: ev.titulo,
        date: ev.fecha_evento
          ? new Date(ev.fecha_evento).toLocaleDateString()
          : ev.creado_en
          ? new Date(ev.creado_en).toLocaleDateString()
          : "Fecha no definida",
        time: ev.fecha_evento
          ? new Date(ev.fecha_evento).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : null,
        location: ev.ubicacion || "Ubicación no definida",
        price: ev.precio === "0.00" ? "Entrada libre" : `$${parseFloat(ev.precio).toLocaleString()}`,
        type: Array.isArray(ev.categoria) ? ev.categoria : ev.categoria ? [ev.categoria] : ["Sin categoría"],
        tag: Array.isArray(ev.categoria) ? ev.categoria[0] : ev.categoria || "Sin categoría",
        imagenes: ev.imagenes,
        image: ev.imagen || "https://storage.googleapis.com/.../placeholder.png",
        ownerName: `Empresa #${ev.empresa}`, // puedes enriquecer con companyCache si quieres
        ownerLogo: null,
      }));

      setEventoPromoted(eventosTransformados);
    } catch (error) {
      console.error("Error cargando eventos promovidos:", error);
    } finally {
      setLoading(false);
    }
  };


// 🔑 Llamar al fetch al montar el componente
  useEffect(() => {
    fetchPromotedEventos();
  }, []);
// const fetchPromotedEventos = async () => {
//   setLoading(true);

//   // Cancelar request anterior si existe
//   if (searchCancelToken.current) {
//     searchCancelToken.current.cancel("Nueva búsqueda, cancelando anterior");
//   }
//   searchCancelToken.current = axios.CancelToken.source();

//   try {
//     const res = await api.get("/api/eventos-publicos/promoted/", {
//       timeout: 15000,
//       cancelToken: searchCancelToken.current.token,
//     });

//     const resultadosRaw = Array.isArray(res.data) ? res.data : [];

//     const eventosTransformados = resultadosRaw.map(ev => ({
//       id: ev.id,
//       rawEmpresaId: ev.empresa,
//       title: ev.titulo,
//       date: ev.fecha_evento
//         ? new Date(ev.fecha_evento).toLocaleDateString()
//         : ev.creado_en
//         ? new Date(ev.creado_en).toLocaleDateString()
//         : "Fecha no definida",
//       time: ev.fecha_evento
//         ? new Date(ev.fecha_evento).toLocaleTimeString([], {
//             hour: "2-digit",
//             minute: "2-digit",
//           })
//         : null,
//       location: ev.ubicacion || "Ubicación no definida",
//       price: ev.precio === "0.00" ? "Entrada libre" : `$${parseFloat(ev.precio).toLocaleString()}`,
//       type: Array.isArray(ev.categoria) ? ev.categoria : ev.categoria ? [ev.categoria] : ["Sin categoría"],
//       tag: Array.isArray(ev.categoria) ? ev.categoria[0] : ev.categoria || "Sin categoría",
//       imagenes: ev.imagenes,
//       image: ev.imagen || "https://storage.googleapis.com/.../placeholder.png",
//       ownerName: companyCache[ev.empresa]?.nombre || `Empresa #${ev.empresa}`,
//       ownerLogo: companyCache[ev.empresa]?.logo || null,
//     }));

//     setEventoPromoted(eventosTransformados);

//     // Actualización de empresas
//     const idsPendientes = [
//       ...new Set(eventosTransformados.map(ev => ev.rawEmpresaId).filter(id => id && !companyCache[id])),
//     ];
//     if (idsPendientes.length) {
//       const resp = await api.get("/api/public/empresas/bulk/", {
//         params: { ids: idsPendientes.join(",") },
//         timeout: 15000,
//       });
//       const empresas = Array.isArray(resp.data) ? resp.data : [];
//       const nuevosDatosEmpresa = {};
//       empresas.forEach(emp => (nuevosDatosEmpresa[emp.id] = { nombre: emp.nombre, logo: emp.logo }));
//       idsPendientes.forEach(id => {
//         if (!nuevosDatosEmpresa[id]) nuevosDatosEmpresa[id] = { nombre: `Empresa #${id}`, logo: null };
//       });
//       setCompanyCache(prev => ({ ...prev, ...nuevosDatosEmpresa }));
//       setEventoPromoted(prev =>
//         prev.map(ev =>
//           ev.rawEmpresaId && nuevosDatosEmpresa[ev.rawEmpresaId]
//             ? { ...ev, ownerName: nuevosDatosEmpresa[ev.rawEmpresaId].nombre, ownerLogo: nuevosDatosEmpresa[ev.rawEmpresaId].logo }
//             : ev
//         )
//       );
//     }
//   } catch (error) {
//     if (!axios.isCancel(error)) console.error(error);
//   } finally {
//     setLoading(false);
//   }
// };

// --- FUNCIONES DE NAVEGACION / INFINITE SCROLL (CAMBIO: loadMore pide la siguiente página) ---





  // Footer links
  const footerLinks = [
    { title: 'Reservas' },
    { title: 'Promoción de eventos' },
    { title: 'Soporte al organizador' },
    { title: 'API para desarrolladores' }
  ];


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

  // Reiniciar página si cambian filtro o búsqueda
  useEffect(() => { setPage(0); }, [filter, search]);
  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const pageEvents = filteredEvents.slice(page * pageSize, (page + 1) * pageSize);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;
  const goPrev = () => { if (canPrev) { setPage(p => p - 1); scrollRef.current?.scrollTo({ y: 0, animated: true }); } };
  const goNext = () => { if (canNext) { setPage(p => p + 1); scrollRef.current?.scrollTo({ y: 0, animated: true }); } };

  // Cuando cambia filtro o búsqueda, reinicia página y sube arriba
//   useEffect(() => {
//   scrollRef.current?.scrollTo({ y: 0, animated: true });
// }, [filter]);



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
        <HeaderBase
          isLogged={isLogged}
          onLoginPress={() => setLoginVisible(true)}
          onLogoutPress={handleLogout}
          navigation={navigation}
          isEmpresaAccount={isEmpresaAccount}
          isUserAccount={isUserAccount}
          userAvatarUrl={userAvatarUrl}
          empresaData={empresaData}
          styles={styles}
        />

        {/* Hero: carrusel de fotos de eventos publicados (independiente, solo los 3 primeros) */}
        <View style={styles.heroSection}>
          <ScrollView
            ref={heroScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.heroCarousel}
            contentContainerStyle={{ paddingHorizontal: 0 }}
            snapToInterval={width}
            decelerationRate={'fast'}
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const w = width; // full-bleed card width
              const idx = Math.round(x / w);
              setCurrentHeroIndex(idx);
            }}
          >
            {(carouselEvents && carouselEvents.length > 0 ? carouselEvents : [null, null, null]).map((ev, idx) => {
              const uri = ev?.imagenes?.[0]?.url || ev?.image || 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png';
              return (
                <TouchableOpacity key={idx} activeOpacity={0.9} style={styles.heroCard} onPress={() => {
                  if (ev && ev.id) {
                    navigation.navigate('Reservar/Comprar', { idEvento: ev.id, idEmpresa: ev.rawEmpresaId });
                  }
                }}>
                  <Image source={{ uri }} style={styles.heroCardImage} resizeMode="cover" />
                  <View style={styles.heroCardOverlay} />
                  <View style={styles.heroCardText}>
                    <Text style={styles.heroCardTitle}>{ev?.title || 'Próximo evento'}</Text>
                    {ev?.location ? <Text style={styles.heroCardLocation}>📍 {ev.location}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
              onPress={async () => {
                if (!isLogged) {
                  Alert.alert('Inicia sesión', 'Debes iniciar sesión para ver eventos cerca de ti.');
                  return;
                }
                // Si está logueado, ejecutamos la solicitud de ubicación
                solicitarUbicacion();
              }}
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

      {/* Loading inline */}
      {loadingline && (
        <View style={{ paddingVertical: 20, alignItems: 'center', width: '100%' }}>
          <ActivityIndicator size="small" color="#4f46e5" />
          <Text style={{ color: '#fff', marginTop: 5 }}>Cargando eventos...</Text>
        </View>
      )}

      {/* No hay eventos */}
      {!loadingline && events.length === 0 && (
        <Text style={{ color: '#fff', textAlign: 'center', marginVertical: 20, width: '100%' }}>
          No hay eventos para mostrar.
        </Text>
      )}

      {/* Lista de eventos */}
      {!loadingline && events.map(event => (
        <View key={event.id} style={styles.eventCard}>
          <View style={styles.ownerRow}>
            {event.ownerLogo ? (
              <Image
                source={{ uri: event.ownerLogo }}
                style={styles.ownerAvatar}
              />
            ) : (
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>{(event.ownerName || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  let empresaIdTarget = event.rawEmpresaId || null;
                  if (!empresaIdTarget && event.ownerName?.startsWith('Empresa #')) {
                    empresaIdTarget = event.ownerName.replace('Empresa #', '');
                  }
                  if (!empresaIdTarget) return;

                  if (ownEmpresaId && String(empresaIdTarget) === String(ownEmpresaId)) {
                    navigation.navigate('Empresa');
                  } else {
                    navigation.navigate('EmpresaScreenUser', { empresaId: empresaIdTarget });
                  }
                }}
              >
                <Text style={[styles.ownerName, (event.rawEmpresaId || event.ownerName?.startsWith('Empresa #')) && { textDecorationLine: 'underline' }]}>
                  {event.ownerName}
                </Text>
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
              navigation.navigate('Reservar/Comprar', {
                idEvento: event.id,
                idEmpresa: event.ownerName?.startsWith('Empresa #') ? event.ownerName.replace('Empresa #', '') : undefined
              });
            }}
          >
            <Text style={styles.reserveText}>Ver detalles</Text>
          </TouchableOpacity>
        </View>
      ))}

    </View>
  </>
)}


            {totalCount > events.length && (
            <View style={styles.paginationBar}>
              <TouchableOpacity
                onPress={() => prevPage && fetchEventos(prevPage)}
                disabled={!prevPage}
                style={[styles.pageArrow, !prevPage && styles.pageArrowDisabled]}
              >
                <Text style={styles.pageArrowText}>{'<'}</Text>
              </TouchableOpacity>

              <Text style={styles.pageIndicator}>
                Página {currentPage} de {Math.ceil(totalCount / pageSize)}
              </Text>

              <TouchableOpacity
                onPress={() => nextPage && fetchEventos(nextPage)}
                disabled={!nextPage}
                style={[styles.pageArrow, !nextPage && styles.pageArrowDisabled]}
              >
                <Text style={styles.pageArrowText}>{'>'}</Text>
              </TouchableOpacity>

            </View>
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
          <Text style={styles.footerCopyright}>© 2025 Tunel Holding. Todos los derechos reservados.</Text>
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

  heroCarousel: { flexDirection: 'row' },
  // Full-bleed hero card: match window width and remove gap
  heroCard: { width: width, height: '100%', borderRadius: 0, overflow: 'hidden', marginRight: 0, backgroundColor: '#111827' },
  heroCardImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  heroCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  heroCardText: { position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 2 },
  heroCardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroCardLocation: { color: '#e6edf3', fontSize: 12, marginTop: 4, opacity: 0.95 },
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
