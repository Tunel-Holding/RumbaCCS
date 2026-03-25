import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'; // <-- useCallback es buena práctica con useFocusEffect
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // <-- Importa useFocusEffect
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, Dimensions, Alert, StatusBar, ActivityIndicator, Share, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { loginConFallback } from '../utils/auth';
import axios from 'axios';
import { Calendar } from 'react-native-calendars'; // Si ya está importado, omite esta línea

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { formatPrice } from '../utils/priceUtils';
import EVENT_TYPES from '../constants/eventTypes';

import * as Location from 'expo-location';
import StandardHeader from '../components/StandardHeader';

const { width } = Dimensions.get('window');


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const heroScrollRef = useRef(null);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  // Carousel events state (independent)
  const [carouselEvents, setCarouselEvents] = useState([]);

  // index: target slide index (0-based). animated: whether to animate the scroll.
  const scrollToHeroIndex = (index, animated = true) => {
    const cardW = width; // full-bleed card width (no gap)
    if (heroScrollRef.current && typeof heroScrollRef.current.scrollTo === 'function') {
      try {
        const realCount = (carouselEvents && carouselEvents.length) ? carouselEvents.length : 0;
        const offsetIndex = realCount > 1 ? (index + 1) : index;
        heroScrollRef.current.scrollTo({ x: offsetIndex * cardW, animated });
      } catch (e) {
        // some RN versions expose different refs; ignore
      }
    }
  };

  useEffect(() => {
    // Auto-advance every 4s when there is more than one real item
    const realCount = (carouselEvents && carouselEvents.length) ? carouselEvents.length : 0;
    if (realCount <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex(prev => {
        const next = (prev + 1) % realCount;
        const wrappingForward = prev === (realCount - 1) && next === 0;
        if (wrappingForward) {
          // animate forward to the cloned first (offset = realCount+1), then onMomentumScrollEnd will snap to real first
          try { heroScrollRef.current?.scrollTo({ x: (realCount + 1) * width, animated: true }); } catch (e) { }
          return next;
        }
        // normal advance
        scrollToHeroIndex(next, true);
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselEvents]);

  // When carousel events change, position scroll at first real item (offset = width) if using clones
  useEffect(() => {
    const realCount = (carouselEvents && carouselEvents.length) ? carouselEvents.length : 0;
    if (realCount <= 1) {
      setCurrentHeroIndex(0);
      setTimeout(() => { try { heroScrollRef.current?.scrollTo({ x: 0, animated: false }); } catch (e) { } }, 50);
      return;
    }
    setCurrentHeroIndex(0);
    // position to the first real item (index 0 -> offset = 1 * width)
    setTimeout(() => { try { heroScrollRef.current?.scrollTo({ x: width, animated: false }); } catch (e) { } }, 60);
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
          price: formatPrice(ev.precio, ev.moneda || 'USD'),
          type: Array.isArray(ev.categoria) ? ev.categoria : ev.categoria ? [ev.categoria] : ["Sin categoría"],
          tag: Array.isArray(ev.categoria) ? ev.categoria[0] : ev.categoria || "Sin categoría",
          imagenes: ev.imagenes || [],
          image: ev.imagen || null,
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
  // scopeFilter: controla alcance (todos | nearby)
  const [scopeFilter, setScopeFilter] = useState('all');
  // typeFilter: controla tipo/categoría seleccionada ('all' = De todo tipo)
  const [typeFilter, setTypeFilter] = useState('all');
  const [typeOpen, setTypeOpen] = useState(false);
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
  const [loadingMore, setLoadingMore] = useState(false); // loading when appending next page
  const [atBottom, setAtBottom] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false); // true when first page (10 items) finished loading
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

  // Estado y helpers para status de empresa sin depender de empresaData
  const [empresaStatus, setEmpresaStatus] = useState(null); // string normalizada
  const normalizeStatus = (s) => (s || '').toString().trim().toLowerCase();
  const isStatusAprobada = (statusStr) => {
    const s = normalizeStatus(statusStr);
    return s === 'verificado' || s === 'verificada' || s === 'aceptado' || s === 'aceptada' || s === 'aprobado' || s === 'aprobada' || s === 'approved' || s === 'accepted' || s === 'verified';
  };

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
        const statusFromApi = (response?.data?.estado ?? response?.data?.status) || null;
        if (statusFromApi != null) {
          const normalized = (statusFromApi || '').toString().trim().toLowerCase();
          setEmpresaStatus(normalized);
          try { await AsyncStorage.setItem('empresaStatus', normalized); } catch (e) { }
        }
      } catch (error) {
        console.error("Error refrescando datos de la empresa:", error);
        setEmpresaData(null); // Limpiamos si hay error
        // Intentar leer último status cacheado
        try { const cached = await AsyncStorage.getItem('empresaStatus'); setEmpresaStatus(cached); } catch (e) { }
      }
    } else {
      setEmpresaData(null); // Limpiamos si no hay ID o token
      setEmpresaStatus(null);
    }
    setLoading(false);
  }, []);

  // --- EFECTO PARA RECARGAR DATOS CUANDO LA PANTALLA ESTÁ EN FOCO ---
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      const checkLoginAndRefresh = async () => {

        const token = await AsyncStorage.getItem('accessToken');
        const isEmpresaAcc = await AsyncStorage.getItem('isEmpresaAccount');
        const isUserAcc = await AsyncStorage.getItem('isUserAccount');
        const userId = await AsyncStorage.getItem('userId');
        const cachedEmpresaStatus = await AsyncStorage.getItem('empresaStatus');

        // Si no hay token, limpiar todo de inmediato
        if (!token) {
          setIsLogged(false);
          setIsEmpresaAccount(false);
          setIsUserAccount(false);
          setEmpresaData(null);
          setHasEmpresa(false);
          setOwnEmpresaId(null);
          setLoading(false);
          return;
        }

        // Intentar cargar datos del usuario — si el token expiró, el interceptor
        // lo eliminará de AsyncStorage durante esta llamada
        if (userId) {
          try {
            const userResponse = await api.get(`/api/usuarios/${userId}/`);
            setUserData(userResponse.data);
          } catch (e) {
            setUserData(null);
          }
        }

        // Re-leer el token DESPUÉS de las llamadas API: si el interceptor
        // lo borró por expiración, ahora estará vacío
        const tokenFinal = await AsyncStorage.getItem('accessToken');

        if (!tokenFinal) {
          // Token expirado — limpiar sesión
          setIsLogged(false);
          setIsEmpresaAccount(false);
          setIsUserAccount(false);
          setEmpresaData(null);
          setHasEmpresa(false);
          setOwnEmpresaId(null);
          setLoading(false);
          return;
        }

        setIsLogged(true);
        setIsEmpresaAccount(isEmpresaAcc === 'true');
        setIsUserAccount(isUserAcc === 'true');
        if (cachedEmpresaStatus) setEmpresaStatus(cachedEmpresaStatus);

        console.log("HomeScreen en foco y logueado, actualizando datos...");
        await refreshEmpresaData();
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

  // Compartir evento desde la tarjeta (icono de 3 puntitos)
  const handleShareEvent = async (event) => {
    try {
      const message = `${event.title} - ${event.date} ${event.time ? event.time : ''}\nOrganizada por: ${event.ownerName}`;
      await Share.share({ message });
    } catch (err) {
      console.warn('handleShareEvent error', err);
    }
  };

  // Handler para abrir la página de calificación de la app
  const RATING_URLS = {
    ios: 'https://apps.apple.com/app/idYOUR_APP_ID',
    android: 'https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME',
  };

  // Función para manejar la calificación de la app
  const handleRateApp = async () => {
    try {
      const url = Platform.OS === 'ios' ? RATING_URLS.ios : RATING_URLS.android;
      if (!url || url.includes('YOUR_')) {
        Alert.alert('Configurar enlace', 'Por favor configura la URL de la tienda en HomeScreen (RATING_URLS).');
        return;
      }
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else Alert.alert('No disponible', 'No se pudo abrir el enlace de la tienda.');
    } catch (e) {
      console.warn('handleRateApp error', e);
      Alert.alert('Error', 'No se pudo abrir la tienda.');
    }
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
        try {
          const st = (empresa?.estado ?? empresa?.status) || null;
          if (st != null) {
            const norm = (st || '').toString().trim().toLowerCase();
            setEmpresaStatus(norm);
            await AsyncStorage.setItem('empresaStatus', norm);
          }
        } catch (e) { }
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
          // No tenemos el objeto empresa aquí; pediremos en refresh, pero limpiamos status previo
          try { await AsyncStorage.removeItem('empresaStatus'); setEmpresaStatus(null); } catch (e) { }
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
      // Limpiar campos de login para evitar datos residuales
      try { setUser(''); setPass(''); } catch (e) { }
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

  // 🔹 Fetch de eventos solo cuando cambia búsqueda, alcance o tipo
  useEffect(() => {
    fetchEventos(1, false);
  }, [debouncedSearch, scopeFilter, typeFilter]);

  // Si el usuario otorga ubicación y estamos en filtro 'nearby', recargar eventos cercanos
  useEffect(() => {
    if (scopeFilter === 'nearby' && userLocation) {
      fetchEventos(1, false);
    }
  }, [userLocation, scopeFilter]);


  // Filtros disponibles (solo tipos, centralizados)
  // Sort event types alphabetically by label for display
  const sortedEventTypes = React.useMemo(() => {
    return [...EVENT_TYPES].sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }, []);

  const filters = sortedEventTypes.map(e => ({ key: e.key, label: e.label }));

  const fetchEventos = async (pageNumber = 1, append = false) => {
    // if appending, show separate loadingMore spinner; otherwise it's initial/refresh loadingline
    if (append) setLoadingMore(true); else setLoadingline(true);

    if (!append) scrollRef.current?.scrollTo({ y: 0, animated: true });

    // Cancelar request anterior si existe
    if (searchCancelToken.current) {
      searchCancelToken.current.cancel("Nueva búsqueda, cancelando anterior");
    }
    searchCancelToken.current = axios.CancelToken.source();

    try {
      const isNearbyFilter = scopeFilter === "nearby";
      const hasLocation = !!userLocation;

      let url = "/api/eventos-publicos/";
      if (isNearbyFilter && hasLocation) url = "/api/eventos-publicos/nearby/";

      const params = { page: pageNumber, page_size: pageSize };

      if (isNearbyFilter && hasLocation) {
        params.lat = userLocation.latitude;
        params.lng = userLocation.longitude;
        params.radius = 10;
      }

      if (!isNearbyFilter) {
        if (typeFilter && typeFilter !== "all") params.categoria = typeFilter;
        if (debouncedSearch) params.search = debouncedSearch;
      } else {
        // nearby also supports search
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
        price: formatPrice(ev.precio, ev.moneda || 'USD'),
        type: Array.isArray(ev.categoria) ? ev.categoria : ev.categoria ? [ev.categoria] : ["Sin categoría"],
        tag: Array.isArray(ev.categoria) ? ev.categoria[0] : ev.categoria || "Sin categoría",
        imagenes: ev.imagenes || [],
        image: ev.imagen || null,
        ownerName: companyCache[ev.empresa]?.nombre || `Empresa #${ev.empresa}`,
        ownerLogo: companyCache[ev.empresa]?.logo || null,
      }));

      // Si estamos en modo nearby, guardamos en nearbyEvents; si no, en eventos generales
      if (isNearbyFilter) {
        setNearbyEvents(prev => (append ? [...prev, ...eventosTransformados] : eventosTransformados));
      } else {
        setEventos(prev => (append ? [...prev, ...eventosTransformados] : eventosTransformados));
      }
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
        // Propagar companyCache update a la lista correspondiente
        const updateFn = (prevList) =>
          prevList.map(ev =>
            ev.rawEmpresaId && nuevosDatosEmpresa[ev.rawEmpresaId]
              ? { ...ev, ownerName: nuevosDatosEmpresa[ev.rawEmpresaId].nombre, ownerLogo: nuevosDatosEmpresa[ev.rawEmpresaId].logo }
              : ev
          );

        setEventos(prev => updateFn(prev));
        setNearbyEvents(prev => updateFn(prev));
      }
    } catch (error) {
      if (!axios.isCancel(error)) console.error(error);
    } finally {
      // clear the appropriate loading flag
      if (append) setLoadingMore(false); else setLoadingline(false);
      // mark that initial page has been loaded (so spinner only shows after first 10 are present)
      if (!append && pageNumber === 1) setInitialLoaded(true);
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
        price: formatPrice(ev.precio, ev.moneda || 'USD'),
        type: Array.isArray(ev.categoria) ? ev.categoria : ev.categoria ? [ev.categoria] : ["Sin categoría"],
        tag: Array.isArray(ev.categoria) ? ev.categoria[0] : ev.categoria || "Sin categoría",
        imagenes: ev.imagenes || [],
        image: ev.imagen || null,
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

  // --- estados extra ---
  const [nearbyEvents, setNearbyEvents] = useState([]);

  const fuente = scopeFilter === "nearby" ? nearbyEvents : events || [];

  // --- filtro por tipo + búsqueda ---
  const filteredEvents = fuente.filter(e => {
    const categorias = Array.isArray(e.type) ? e.type : [e.type];
    const matchesType = typeFilter === 'all' || categorias.includes(typeFilter);
    const rawQuery = search.trim();
    if (!rawQuery) return matchesType;

    const qTokens = normalizeText(rawQuery).split(/\s+/).filter(Boolean);
    if (!qTokens.length) return matchesType;

    const fields = [e.title || '', e.location || '', categorias.join(' '), e.ownerName || ''];

    return matchesType && qTokens.every(token => fields.some(f => fuzzyMatch(token, f)));
  });

  // Reiniciar página si cambian filtros o búsqueda
  useEffect(() => { setPage(0); }, [scopeFilter, typeFilter, search]);
  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  // With infinite scroll we render `filteredEvents` directly; keep page state for compatibility but disable client-side paging.
  const canPrev = false;
  const canNext = false;
  const goPrev = () => { };
  const goNext = () => { };

  // Cuando cambia filtro o búsqueda, reinicia página y sube arriba
  //   useEffect(() => {
  //   scrollRef.current?.scrollTo({ y: 0, animated: true });
  // }, [filter]);

  // --- ESTADOS PARA CALENDARIO DE EVENTOS GUARDADOS ---
  const [eventosPorMes, setEventosPorMes] = useState({}); // { '2025-10': [eventos] }
  const [mesActual, setMesActual] = useState({ year: 2025, month: 10 }); // Inicializa con el mes actual
  const [loadingEventosCalendario, setLoadingEventosCalendario] = useState(false);
  const [offsetPorMes, setOffsetPorMes] = useState({}); // { '2025-10': offset }
  const [totalPorMes, setTotalPorMes] = useState({}); // { '2025-10': total }
  const LIMIT_EVENTOS = 20;

  function getMonthRange(year, month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${endDate}`;
    return { start, end };
  }

  async function fetchEventosMes(year, month, offset = 0, append = false) {
    setLoadingEventosCalendario(true);
    try {
      const { start, end } = getMonthRange(year, month);
      const url = `/api/eventos-guardados/?calendar=1&fecha_inicio=${start}&fecha_fin=${end}&limit=${LIMIT_EVENTOS}&offset=${offset}`;
      const res = await api.get(url);
      const eventos = res.data.results || [];
      const total = res.data.total || eventos.length;
      setTotalPorMes(prev => ({ ...prev, [`${year}-${month}`]: total }));
      setOffsetPorMes(prev => ({ ...prev, [`${year}-${month}`]: offset + eventos.length }));
      setEventosPorMes(prev => ({
        ...prev,
        [`${year}-${month}`]: append && prev[`${year}-${month}`]
          ? [...prev[`${year}-${month}`], ...eventos]
          : eventos
      }));
    } catch (e) {
      // Puedes mostrar un error si lo deseas
    } finally {
      setLoadingEventosCalendario(false);
    }
  }

  // Solo carga el mes actual al montar
  useEffect(() => {
    const { year, month } = mesActual;
    const key = `${year}-${month}`;
    if (!eventosPorMes[key]) fetchEventosMes(year, month, 0, false);
  }, [mesActual]);

  function handleMesChange(year, month) {
    setMesActual({ year, month });
    const key = `${year}-${month}`;
    if (!eventosPorMes[key]) {
      fetchEventosMes(year, month, 0, false);
    }
  }

  function handleCargarMasEventos() {
    const key = `${mesActual.year}-${mesActual.month}`;
    const offset = offsetPorMes[key] || 0;
    fetchEventosMes(mesActual.year, mesActual.month, offset, true);
  }

  function renderCalendarioEventos() {
    const key = `${mesActual.year}-${mesActual.month}`;
    const eventosMes = eventosPorMes[key] || [];
    const total = totalPorMes[key] || 0;
    const offset = offsetPorMes[key] || 0;
    return (
      <View style={{ marginVertical: 24 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Tus eventos guardados</Text>
        <Calendar
          current={`${mesActual.year}-${String(mesActual.month).padStart(2, '0')}-01`}
          onMonthChange={date => handleMesChange(date.year, date.month)}
          markedDates={eventosMes.reduce((acc, ev) => {
            const fecha = ev.fecha_evento?.slice(0, 10);
            if (fecha) acc[fecha] = { marked: true };
            return acc;
          }, {})}
          theme={{
            calendarBackground: '#181A20',
            dayTextColor: '#fff',
            monthTextColor: '#fff',
            selectedDayBackgroundColor: '#0ea5e9',
            selectedDayTextColor: '#fff',
          }}
        />
        {loadingEventosCalendario && <ActivityIndicator color="#0ea5e9" style={{ marginTop: 16 }} />}
        <View style={{ marginTop: 16 }}>
          {eventosMes.length === 0 && !loadingEventosCalendario ? (
            <Text style={{ color: '#94a3b8', textAlign: 'center' }}>No tienes eventos guardados este mes.</Text>
          ) : (
            eventosMes.map(ev => (
              <View key={ev.id} style={{ backgroundColor: '#334155', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{ev.title}</Text>
                <Text style={{ color: '#cbd5e1' }}>{ev.fecha_evento?.replace('T', ' ').slice(0, 16)}</Text>
              </View>
            ))
          )}
          {/* Botón para cargar más si hay más eventos */}
          {offset < total && !loadingEventosCalendario && (
            <TouchableOpacity onPress={handleCargarMasEventos} style={{ backgroundColor: '#0ea5e9', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Ver más eventos</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

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
        contentContainerStyle={{ paddingTop: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={200}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          // Estimate average item height to detect when user reaches the penultimate item
          const itemCount = Math.max(filteredEvents.length, 1);
          const avgItemHeight = contentSize.height / itemCount;
          const remainingHeight = contentSize.height - (layoutMeasurement.height + contentOffset.y);
          const remainingItemsEstimate = remainingHeight / (avgItemHeight || 1);

          const isAtPenultimate = remainingItemsEstimate <= 2.0; // roughly two items left => start prefetch (penultimate threshold)
          const isAtLast = remainingItemsEstimate <= 0.5; // almost at the very end

          // update atBottom state so spinner can be shown when reaching the last event
          setAtBottom(isAtLast);

          // Only trigger load when penultimate is reached, not before, and when not already loading and there are more pages
          if (isAtPenultimate) {
            if (!loadingline && !loadingMore && hasMore && filteredEvents.length >= pageSize && initialLoaded) {
              // cargar siguiente página de la API (append)
              fetchEventos(currentPage + 1, true);
            }
          }
        }}
      >
        <StandardHeader
          isLogged={isLogged}
          isHomeScreen={true}
          onLoginPress={() => setLoginVisible(true)}
          onMenuPress={(item) => {
            // Si el usuario pide 'inicio' o 'Tu perfil', dirigimos según tipo de cuenta
            if (item === 'inicio') {
              if (isEmpresaAccount) {
                navigation.navigate('Empresa');
              } else {
                navigation.navigate('Perfil');
              }
              return;
            }
          }}
          isEmpresaAccount={isEmpresaAccount}
          isUserAccount={isUserAccount}
          userAvatarUrl={userAvatarUrl}
          empresaData={empresaData}
          style={styles.header}
          logoContainerStyle={styles.logoContainer}
          menuButtonStyle={styles.headerRight}
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
            pagingEnabled={true}
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const w = width; // full-bleed card width
              const idx = Math.round(x / w);
              const real = (carouselEvents && carouselEvents.length) ? carouselEvents : [];
              const realCount = real.length;
              if (realCount <= 1) {
                setCurrentHeroIndex(0);
                return;
              }
              // We render: [last, ...real, first]
              if (idx === 0) {
                // landed on cloned last -> jump to real last (index = realCount -1)
                try { heroScrollRef.current?.scrollTo({ x: realCount * w, animated: false }); } catch (e) { }
                setCurrentHeroIndex(realCount - 1);
                return;
              }
              if (idx === realCount + 1) {
                // landed on cloned first -> jump to real first (index = 0)
                try { heroScrollRef.current?.scrollTo({ x: w, animated: false }); } catch (e) { }
                setCurrentHeroIndex(0);
                return;
              }
              // otherwise idx corresponds to real item at idx - 1
              setCurrentHeroIndex(idx - 1);
            }}
          >
            {(function renderCircular() {
              const real = (carouselEvents && carouselEvents.length) ? carouselEvents : [];
              if (real.length === 0) {
                // placeholder 3 empty slides
                return [null, null, null].map((ev, idx) => {
                  const defaultImg = require('../../assets/register-bg.jpg');
                  return (
                    <TouchableOpacity key={`ph-${idx}`} activeOpacity={0.9} style={styles.heroCard}>
                      <Image source={defaultImg} style={styles.heroCardImage} resizeMode="cover" />
                      <View style={styles.heroCardOverlay} />
                      <View style={styles.heroCardText}>
                        <Text style={styles.heroCardTitle}>Próximo evento</Text>
                      </View>
                    </TouchableOpacity>
                  );
                });
              }

              // build circular list: [last, ...real, first]
              const items = [];
              const last = real[real.length - 1];
              items.push(last);
              real.forEach(it => items.push(it));
              items.push(real[0]);

              return items.map((ev, idx) => {
                const imgUri = ev?.imagenes?.[0]?.url || ev?.image;
                const source = imgUri ? { uri: imgUri } : require('../../assets/register-bg.jpg');
                const key = ev?.id ? `c-${ev.id}-${idx}` : `c-ph-${idx}`;
                return (
                  <TouchableOpacity key={key} activeOpacity={0.9} style={styles.heroCard} onPress={() => {
                    if (ev && ev.id) {
                      navigation.navigate('Reservar/Comprar', { idEvento: ev.id, idEmpresa: ev.rawEmpresaId });
                    }
                  }}>
                    <Image source={source} style={styles.heroCardImage} resizeMode="cover" />
                    <View style={styles.heroCardOverlay} />
                    <View style={styles.heroCardText}>
                      <Text style={styles.heroCardTitle}>{ev?.title || 'Próximo evento'}</Text>
                      {ev?.location ? <Text style={styles.heroCardLocation}>📍 {ev.location}</Text> : null}
                    </View>
                  </TouchableOpacity>
                );
              });
            })()}
          </ScrollView>
          {/* Flechas izquierda/derecha sobre el carrusel */}
          {(() => {
            const realCount = (carouselEvents && carouselEvents.length > 0) ? carouselEvents.length : 3;
            if (realCount <= 1) return null;
            return (
              <>
                <TouchableOpacity
                  accessibilityLabel="Ir al elemento anterior"
                  accessibilityRole="button"
                  style={[styles.heroArrow, styles.heroArrowLeft]}
                  onPress={() => {
                    const prev = (currentHeroIndex - 1 + realCount) % realCount;
                    const wrappingBackward = currentHeroIndex === 0 && prev === realCount - 1; // first -> last
                    if (wrappingBackward) {
                      // animate backward to the cloned last (offset = 0), then onMomentumScrollEnd will snap to real last
                      try { heroScrollRef.current?.scrollTo({ x: 0, animated: true }); } catch (e) { }
                      setCurrentHeroIndex(prev);
                      return;
                    }
                    scrollToHeroIndex(prev, true);
                    setCurrentHeroIndex(prev);
                  }}
                >
                  <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityLabel="Ir al siguiente elemento"
                  accessibilityRole="button"
                  style={[styles.heroArrow, styles.heroArrowRight]}
                  onPress={() => {
                    const next = (currentHeroIndex + 1) % realCount;
                    const wrappingForward = currentHeroIndex === realCount - 1 && next === 0; // last -> first
                    if (wrappingForward) {
                      // animate forward to the cloned first (offset = realCount+1), then onMomentumScrollEnd will snap to real first
                      try { heroScrollRef.current?.scrollTo({ x: (realCount + 1) * width, animated: true }); } catch (e) { }
                      setCurrentHeroIndex(next);
                      return;
                    }
                    scrollToHeroIndex(next, true);
                    setCurrentHeroIndex(next);
                  }}
                >
                  <Ionicons name="chevron-forward" size={28} color="#fff" />
                </TouchableOpacity>
              </>
            );
          })()}
        </View>

        {/* Buscador */}
        <TextInput
          style={styles.search}
          placeholder="Buscar eventos..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
        {/* Compact row: two small buttons + arrow-only select on the right */}
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 8, marginTop: 8, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
            <TouchableOpacity
              style={[styles.smallBtn, scopeFilter === 'all' && styles.smallBtnActive]}
              onPress={() => { setScopeFilter('all'); setTypeOpen(false); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
            >
              <Text style={[styles.smallBtnText, scopeFilter === 'all' && styles.smallBtnTextActive]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, scopeFilter === 'nearby' && styles.smallBtnActive]}
              onPress={() => { setScopeFilter('nearby'); setTypeOpen(false); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
            >
              <Text style={[styles.smallBtnText, scopeFilter === 'nearby' && styles.smallBtnTextActive]}>Cercanos a ti</Text>
            </TouchableOpacity>
          </View>

          {/* Arrow-only select */}
          <View style={{ width: 48, alignItems: 'center', justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => setTypeOpen(o => !o)}
              style={[{ padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' }, typeOpen && { borderColor: '#0ea5e9' }]}
            >
              <Text style={{ color: '#94a3b8', fontSize: 18 }}>{typeOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {typeOpen && (
              <Modal
                visible={typeOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setTypeOpen(false)}
              >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setTypeOpen(false)}>
                  <View style={{ backgroundColor: '#1e293b', borderRadius: 0, paddingVertical: 12, paddingHorizontal: 12, width: '100%', maxHeight: '100%', alignSelf: 'stretch', alignItems: 'stretch', justifyContent: 'flex-start' }}>
                    <TouchableOpacity style={[styles.modalClose, { padding: 8 }]} onPress={() => setTypeOpen(false)}>
                      <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
                      <TouchableOpacity onPress={() => { setTypeFilter('all'); setTypeOpen(false); }} style={{ paddingVertical: 14 }}>
                        <Text style={{ color: typeFilter === 'all' ? '#0ea5e9' : '#cbd5e1', fontSize: 20, fontWeight: '600' }}>De todo tipo</Text>
                      </TouchableOpacity>
                      {sortedEventTypes.map(e => (
                        <TouchableOpacity key={e.key} onPress={() => { setTypeFilter(e.key); setTypeOpen(false); }} style={{ paddingVertical: 14 }}>
                          <Text style={{ color: typeFilter === e.key ? '#0ea5e9' : '#cbd5e1', fontSize: 20, fontWeight: '600' }}>{e.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>
            )}
          </View>
        </View>



        {/* Eventos */}
        <Text style={styles.sectionTitle}>
          {scopeFilter === 'nearby' && 'Eventos cerca de ti'}
          {scopeFilter !== 'nearby' && typeFilter === 'all' && 'Próximos eventos'}
          {scopeFilter !== 'nearby' && typeFilter !== 'all' && `Eventos de ${(sortedEventTypes.find(t => t.key === typeFilter)?.label) || typeFilter}`}
        </Text>

        {/* Mensaje de permiso de ubicación (placeholder) */}
        {scopeFilter === 'nearby' && !userLocation && (
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
        {!(scopeFilter === 'nearby' && !userLocation) && (
          <>
            <View style={styles.eventsGrid}>

              {/* Loading inline */}
              {loadingline && (
                <View style={{ paddingVertical: 20, alignItems: 'center', width: '100%' }}>
                  <ActivityIndicator size="small" color="#4f46e5" />
                  <Text style={{ color: '#fff', marginTop: 5 }}>Cargando eventos...</Text>
                </View>
              )}

              {/* No hay eventos (mensajes diferenciados según filtro) */}
              {!loadingline && filteredEvents.length === 0 && (
                <Text style={{ color: '#fff', textAlign: 'center', marginVertical: 20, width: '100%' }}>
                  {typeFilter && typeFilter !== 'all' ? 'No se han encontrado eventos de este tipo' : 'No hay eventos para mostrar.'}
                </Text>
              )}

              {/* Lista de eventos (infinite scroll): mostramos los eventos filtrados cargados desde API */}
              {!loadingline && filteredEvents.map(event => (
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
                    source={
                      event.imagenes?.[0]?.url || event.image
                        ? { uri: event.imagenes[0]?.url || event.image }
                        : require('../../assets/register-bg.jpg')
                    }
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

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
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

                    <View style={{ flexDirection: 'row', marginLeft: 8, gap: 8 }}>
                      <TouchableOpacity style={styles.smallIconBtn} onPress={() => handleShareEvent(event)}>
                        <Ionicons name="share-social" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              {/* Footer spinner shown when user reached last event (and there are more) or while loadingMore */}
              {(hasMore && atBottom) || loadingMore ? (
                <View style={{ paddingVertical: 12, alignItems: 'center', width: '100%' }}>
                  <ActivityIndicator size="large" color="#ffffff" />
                </View>
              ) : null}

            </View>
          </>
        )}


        {/* Pagination controls removed: infinite scroll loads more items when user scrolls down. */}


        {/* Testimonios eliminados */}

        {/* Footer */}
        <View style={styles.footer}>
          {/* Footer row: logo on the left, text block on the right */}
          <View style={styles.footerInner}>
            <Image source={require('../../assets/footer_logo.jpg')} style={styles.footerLogo} />
            <View style={styles.footerText}>
              <Text style={styles.footerTitle}>EVENTIALccs</Text>

              <Text style={styles.footerCopyright}>© 2025 IA Tecnología y Servicios. Todos los derechos reservados.</Text>
            </View>



          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.footerButton} onPress={handleRateApp} accessibilityRole="button">
              <Text style={styles.footerButtonText}>¿Qué te parece Evential? Califícanos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* FAB: para cuentas de empresa */}
      {isEmpresaAccount && (
        <TouchableOpacity
          accessibilityLabel="Agregar evento"
          accessibilityRole="button"
          style={[styles.fab, { bottom: 16 + insets.bottom }]}
          onPress={() => {
            try { navigation.navigate('Add'); } catch (e) { }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color="#fff" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      )}

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

  heroCarousel: { flexDirection: 'row' },
  // Full-bleed hero card: match window width and remove gap
  heroCard: { width: width, height: '100%', borderRadius: 0, overflow: 'hidden', marginRight: 0, backgroundColor: '#111827' },
  heroCardImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  heroCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  heroCardText: { position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 2 },
  heroCardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroCardLocation: { color: '#e6edf3', fontSize: 12, marginTop: 4, opacity: 0.95 },
  heroArrow: { position: 'absolute', top: '40%', zIndex: 5, backgroundColor: 'rgba(0,0,0,0.45)', padding: 6, borderRadius: 24 },
  heroArrowLeft: { left: 8 },
  heroArrowRight: { right: 8 },
  search: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 16 },
  filters: { flexDirection: 'row', marginBottom: 12 },
  filterBtn: { backgroundColor: '#334155', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 },
  filterBtnActive: { backgroundColor: '#0ea5e9' },
  filterText: { color: '#fff', fontWeight: 'bold' },
  filterTextActive: { color: '#fff' },
  // Primary buttons for 'Todos' and 'Eventos cerca de mi'
  primaryBtn: { backgroundColor: '#1f2937', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  primaryBtnActive: { backgroundColor: '#0ea5e9', borderColor: '#0891b2' },
  primaryBtnText: { color: '#cbd5e1', fontWeight: '700' },
  primaryBtnTextActive: { color: '#07102a', fontWeight: '800' },
  // Small compact buttons (Todos / Cerca)
  smallBtn: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  smallBtnActive: { backgroundColor: '#0ea5e9', borderColor: '#0891b2' },
  smallBtnText: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 },
  smallBtnTextActive: { color: '#07102a', fontWeight: '800', fontSize: 13 },
  smallBtnTextLarge: { fontSize: 15 },
  sectionTitle: { fontSize: 20, color: '#fff', fontWeight: 'bold', marginVertical: 12 },
  eventsGrid: { flexDirection: width < 600 ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  eventCard: { backgroundColor: '#334155', borderRadius: 12, padding: 12, marginBottom: 16, position: 'relative', width: CARD_WIDTH, alignSelf: 'center', marginHorizontal: 4 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  ownerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  ownerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ownerName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  ownerLabel: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  ownerChip: { backgroundColor: '#0ea5e9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  ownerChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  eventImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 8 },
  eventTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold', marginTop: 8 },
  eventMenuBtn: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 6,
    borderRadius: 16,
  },
  eventInfo: { color: '#fff', marginBottom: 4 },
  eventPrice: { color: '#bef264', fontWeight: 'bold', marginBottom: 8 },
  reserveBtn: { backgroundColor: '#6366f1', borderRadius: 8, padding: 10, alignItems: 'center', width: '80%', height: 36, justifyContent: 'center' },
  reserveText: { color: '#fff', fontWeight: 'bold' },
  smallIconBtn: { backgroundColor: 'rgba(0,0,0,0.35)', padding: 10, borderRadius: 10, marginLeft: 6, justifyContent: 'center', alignItems: 'center', width: 36, height: 36 },
  paginationBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 16, gap: 16 },
  permissionBox: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  permissionText: { color: '#fff', fontSize: 14, lineHeight: 18 },
  permissionBtn: { backgroundColor: '#0ea5e9', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginTop: 12, alignSelf: 'flex-start' },
  permissionBtnText: { color: '#fff', fontWeight: '600' },
  pageArrow: { backgroundColor: '#475569', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  pageArrowDisabled: { backgroundColor: '#1e293b' },
  pageArrowText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  pageIndicator: { color: '#fff', fontSize: 14, fontWeight: '600' },
  footer: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginTop: 24, alignItems: 'center', marginBottom: 32 },
  footerTitle: { fontSize: 18, fontWeight: 'bold', color: '#cadce4ff', marginBottom: 8 },
  footerLogo: { width: 64, height: 64, borderRadius: 32, marginRight: 12, overflow: 'hidden', resizeMode: 'cover' },
  footerInner: { flexDirection: 'row', alignItems: 'flex-start', width: '100%' },
  footerText: { flex: 1 },
  footerActions: { justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: 16 },
  footerButton: { backgroundColor: '#0ea5e9', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginTop: 12, width: '100%', alignItems: 'center' },
  footerButtonText: { color: '#fff', fontWeight: '700' },
  footerDesc: { color: '#cbd5e1', textAlign: 'left', marginBottom: 12 },
  footerLink: { color: '#cbd5e1', marginRight: 12, marginBottom: 4 },
  footerCopyright: { color: '#64748b', fontSize: 12, textAlign: 'left' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, width: width < 400 ? width - 32 : 320, alignItems: 'center', position: 'relative' },
  modalClose: { right: 12, zIndex: 2, position: 'absolute' },
  loginTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  loginInput: { backgroundColor: '#fff', borderRadius: 8, padding: 10, width: '100%', marginBottom: 12 },
  loginBtnModal: { backgroundColor: '#0ea5e9', borderRadius: 8, padding: 10, alignItems: 'center', width: '100%', marginTop: 8 },
  loginLinks: { flexDirection: 'row', marginTop: 12 },
  loginLink: { color: '#0ea5e9', marginHorizontal: 6 },
  eventoInfo: { marginBottom: 4 },
  eventoInfoText: { color: '#ffffff', fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  fabLabel: { color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 8 },
});
