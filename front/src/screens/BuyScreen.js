import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Share, Alert, Linking, StyleSheet, Image, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, Modal, TextInput, Pressable, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '../components/AppIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { loginConFallback } from '../utils/auth';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StandardHeader from '../components/StandardHeader';


// Paleta de colores (ajusta según HomeScreen.js)
const COLORS = {
  background: '#181A20',
  primary: '#007AFF',
  accent: '#fff',
  card: '#23262F',
  text: '#fff',
  subtitle: '#B0B3B8',
  detailLabel: '#007AFF',
};



// Eventos de la misma empresa (dinámicos)
// Se cargan una vez que conocemos el evento principal.
// Si la empresa no tiene más eventos, la sección no se mostrará.

const { width } = Dimensions.get('window');

// Base URL pública para compartir eventos (reemplaza por tu dominio real si existe)
const SHARE_BASE_URL = 'https://tu-dominio.com/eventos';

// Construye un mensaje de compartir con emojis y copy atractivo, pero con firma formal.
const buildShareMessage = (evt, eventoId) => {
  const title = evt.title || 'Evento imperdible';
  const fecha = evt.fecha || '';
  const hora = evt.hora && evt.hora !== 'sin definir' ? ` ${evt.hora}` : '';
  const lugar = evt.lugar ? `📍 Lugar: ${evt.lugar}` : '';
  const empresa = evt.empresa ? `🏢 Organiza: ${evt.empresa}` : '';
  const price = (evt.price && parseFloat(evt.price) !== 0) ? `💸 Precio: ${evt.moneda ? evt.moneda + ' ' : ''}${evt.price}` : '🎟️ Entrada libre';
  const descRaw = evt.description || '';
  // Limitar descripción a 180 caracteres para no llenar el share sheet
  const desc = descRaw ? `\n📝 ${descRaw.length > 180 ? descRaw.slice(0, 180) + '...' : descRaw}` : '';

  let message = `🎊 ¡No te pierdas este evento!\n\n`;
  message += `🎉 ${title}\n`;
  message += `📅 Fecha: ${fecha}${hora}\n`;
  if (lugar) message += `${lugar}\n`;
  if (empresa) message += `${empresa}\n`;
  message += `${price}`;
  message += desc;

  if (eventoId) {
    message += `\n\n🔗 Más info y entradas: ${SHARE_BASE_URL}/${eventoId}`;
  }

  message += `\n\nCompartido desde RUMBA, plataforma profesional de gestión de eventos.`;
  return message;
};

export default function BuyScreen() {
  const insets = useSafeAreaInsets();
  const [isLogged, setIsLogged] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [companyEvents, setCompanyEvents] = useState([]); // eventos de la misma empresa
  const [companyEventsLoading, setCompanyEventsLoading] = useState(false);
  const [companyIndex, setCompanyIndex] = useState(0);
  const navigation = useNavigation();
  const route = useRoute();
  const [loginVisible, setLoginVisible] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [empresaData, setEmpresaData] = useState(null);
  const [userData, setUserData] = useState(null); // Estado para datos del usuario
  // Memo para evitar recrear el objeto avatar_url en cada render
  const userAvatarUrl = useMemo(() => userData?.avatar_url ? `${userData.avatar_url}` : null, [userData?.avatar_url]);
  // Cargar datos del usuario logueado al enfocar la pantalla
  useEffect(() => {
    const fetchUserData = async () => {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        try {
          const userResponse = await api.get(`/api/usuarios/${userId}/`);
          let cleanAvatarUrl = userResponse.data.avatar_url;
          if (cleanAvatarUrl && typeof cleanAvatarUrl === 'string') {
            cleanAvatarUrl = cleanAvatarUrl.replace(/\?$/, '');
          }
          setUserData({ ...userResponse.data, avatar_url: cleanAvatarUrl });
        } catch (e) {
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
    };
    if (isLogged) fetchUserData();
  }, [isLogged, loginVisible]);
  const [loading, setLoading] = useState(true);
  const [eventoS, setEventoS] = useState(false); //Valida que los datos del evento fueron guardados
  const [hasEmpresa, setHasEmpresa] = useState(false); // True si el usuario logueado es una empresa (tiene empresaId)
  const [ownEmpresaId, setOwnEmpresaId] = useState(null);
  const [isEmpresaAccount, setIsEmpresaAccount] = useState(false); // True si la sesión actual es de una cuenta empresa



  // Recibe los parámetros de navegación
  const { idEvento } = route.params ?? {};
  const [evento, setEvento] = useState(null);
  const [reservaLoading, setReservaLoading] = useState(false);
  const [reservaModalVisible, setReservaModalVisible] = useState(false);
  const [reservaConfirmada, setReservaConfirmada] = useState(null);

  // Carousel refs y medidas
  const scrollRef = useRef(null);
  const autoplayRef = useRef(null);
  const slideWidth = width; // ancho completo del dispositivo


  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    if (slide !== activeIndex) setActiveIndex(slide);
  };

  const goTo = (index) => {
    const next = (index + eventImages.length) % eventImages.length;
    setActiveIndex(next);
    scrollRef.current?.scrollTo({ x: next * slideWidth, animated: true });
  };
  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);


  useEffect(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      goNext();
    }, 4500);
    return () => clearInterval(autoplayRef.current);
  }, [activeIndex, slideWidth]);

  useEffect(() => {
    const checkSession = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      setIsLogged(!!token);
    };
    checkSession();
  }, [loginVisible, isLogged]); // Se ejecuta también cuando cambia isLogged

  // Detectar si el usuario actual es una empresa (posee empresaId en storage)
  useEffect(() => {
    (async () => {
      try {
        const empresaId = await AsyncStorage.getItem('empresaId');
        const isEmpresa = !!(empresaId && empresaId !== '');
        setHasEmpresa(isEmpresa);
        setOwnEmpresaId(empresaId || null);
      } catch (e) {
        console.warn('No se pudo leer empresaId', e);
        setHasEmpresa(false);
        setOwnEmpresaId(null);
      }
    })();
  }, [isLogged]);

  // Leer si la sesión actual es una cuenta empresa (clave separada en AsyncStorage)
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('isEmpresaAccount');
        setIsEmpresaAccount(v === 'true');
      } catch (e) {
        setIsEmpresaAccount(false);
      }
    })();
  }, [isLogged]);

  const handleLogin = async () => {
    setLoginError('');
    setLoginLoading(true);
    let resultado;
    try {
      resultado = await loginConFallback(user, pass);
    } finally {
      setLoginLoading(false);
      // limpiar campos de login
      try { setUser(''); setPass(''); } catch (e) { }
    }

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

    setIsLogged(true);
    // Persist session and user info similarly to other screens
    try {
      if (resultado.data?.access) await AsyncStorage.setItem('accessToken', resultado.data.access);
      if (resultado.data?.refresh) await AsyncStorage.setItem('refreshToken', resultado.data.refresh);
      if (resultado.data?.user) {
        const ud = resultado.data.user;
        await AsyncStorage.setItem('userId', ud.id.toString());
        if (ud.username) await AsyncStorage.setItem('userName', ud.username);
        // normalize avatar
        let cleanAvatar = ud.avatar_url || ud.avatar || null;
        if (cleanAvatar && typeof cleanAvatar === 'string') cleanAvatar = cleanAvatar.replace(/\?$/, '');
        setUserData({ ...ud, avatar_url: cleanAvatar });
      }
      if (resultado.data?.empresa) {
        await AsyncStorage.setItem('empresaId', resultado.data.empresa.id.toString());
        setEmpresaData(resultado.data.empresa);
        setHasEmpresa(true);
      }
    } catch (e) {
      console.log('Error persisting login info:', e);
    }
    setLoginVisible(false);
    setLoginError('');
  };


  const handleLogout = async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('userEmail');
    await AsyncStorage.removeItem('userName');
    await AsyncStorage.removeItem('empresaId');
    await AsyncStorage.clear();
    setIsLogged(false);
  };

  useEffect(() => {
    const fetchDatos = async () => {
      if (!idEvento) {
        console.log('🟡 idEvento es undefined, no se hace fetch');
        return;
      }

      try {
        // 1. Fetch del evento
        const resEvento = await api.get(`/api/eventos-publicos/${idEvento}/`);
        setEvento(resEvento.data);
        setEventoS(true);

        // 2. Extraer idEmpresa del evento recibido
        const idEmpresa = resEvento.data?.empresa;

        if (!idEmpresa) {
          console.warn('🟡 idEmpresa está undefined, skip fetchEmpresa');
          setLoading(false);
          return;
        }

        // 3. Fetch de la empresa
        console.log('🔎 Fetching empresa con ID:', idEmpresa);
        const resEmpresa = await api.get(`/api/public/empresas/${idEmpresa}/`);
        setEmpresaData(resEmpresa.data);
      } catch (error) {
        console.error('❌ Error en fetchDatos:', error);
        setEvento(null);
        setEventoS(false);
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [idEvento]);


  const eventDetails = useMemo(() => {
    let fecha = 'sin definir';
    let hora = 'sin definir';
    if (evento?.fecha_evento) {
      // Soporta formatos ISO: '2025-09-09T20:30:00Z' o '2025-09-09 20:30:00'
      const match = evento.fecha_evento.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
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
        fecha = evento.fecha_evento;
      }
    }
    return {
      title: evento?.titulo ?? 'sin definir',
      description: evento?.descripcion ?? 'sin definir',
      lugar: evento?.ubicacion ?? 'sin definir',
      categoria: evento?.categoria ?? 'Fiesta',
      vestimenta: evento?.codigo_vestimenta ?? 'sin definir',
      empresa: empresaData?.nombre ?? 'sin definir',
      empresaId: evento?.empresa,
      price: evento?.precio ?? 'sin definir',
      moneda: evento?.moneda ?? 'sin definir',
      // imagenes: evento.imagenes,
      fecha,
      hora,
    };
  }, [evento, empresaData]);

  const eventImages = useMemo(() => {
    if (eventoS && Array.isArray(evento?.imagenes) && evento.imagenes.length > 0) {
      return evento.imagenes.map(img => ({ uri: img.url }));
    }

    // Fallback si no hay imágenes o eventoS es falso
    return [
      require('../../assets/register-bg.jpg'),
      require('../../assets/icon.png'),
      require('../../assets/splash-icon.png'),
    ];
  }, [evento, eventoS]);


  // Estado para saber si el evento actual está guardado
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState(null); // id del registro guardado
  const [currentEventoId, setCurrentEventoId] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Verificar si el evento está guardado (recarga en cambios de usuario, evento y tras guardar/quitar)
  const [refreshSaved, setRefreshSaved] = useState(0);
  useEffect(() => {
    // Mantener el estado actual hasta que la comprobación remota concluya
    setCurrentEventoId(idEvento);
    const checkSaved = async () => {
      if (!isLogged || !idEvento) {
        setIsSaved(false);
        setSavedId(null);
        return;
      }
      if (!isEmpresaAccount) {
        try {
          // Forzar recarga sin cache
          const res = await api.get('/api/eventos-guardados/?evento=' + idEvento + '&_=' + Date.now());
          // Normalizar respuesta: puede ser array directo o paginado { results: [...] }
          const dataArray = Array.isArray(res?.data)
            ? res.data
            : (res?.data && Array.isArray(res.data.results) ? res.data.results : []);
          if (!Array.isArray(res?.data) && !Array.isArray(res?.data?.results)) {
            console.warn('BuyScreen.checkSaved: /api/eventos-guardados returned non-array response:', res?.data);
          }
          const isGuardado = dataArray.length > 0;
          setIsSaved(isGuardado);
          setSavedId(isGuardado ? dataArray[0].id : null);
        } catch (err) {
          setIsSaved(false);
          setSavedId(null);
        }
      }
    };
    checkSaved();
  }, [isLogged, idEvento, refreshSaved]);

  // Guardar o quitar de guardados y refrescar estado
  const handleSave = async () => {
    if (!isLogged) {
      setLoginVisible(true);
      return;
    }
    if (!idEvento) return;
    try {
      setSaveLoading(true);
      if (!isSaved) {
        // Guardar evento
        const res = await api.post('/api/eventos-guardados/', {
          evento: idEvento,
        });
        if (res?.data?.id) {
          setIsSaved(true);
          setSavedId(res.data.id);
          setRefreshSaved(r => r + 1);
        } else {
          Alert.alert('Error', 'No se pudo guardar el evento: ' + JSON.stringify(res?.data));
        }
      } else {
        // Quitar de guardados
        if (savedId) {
          await api.delete('/api/eventos-guardados/' + savedId + '/');
        }
        setIsSaved(false);
        setSavedId(null);
        setRefreshSaved(r => r + 1);
      }
    } catch (err) {
      // Si el backend devuelve el error de duplicado, muestra mensaje amigable
      const detail = err?.response?.data?.detail;
      if (detail === 'Ya guardaste este evento.') {
        Alert.alert('Aviso', 'Ya guardaste este evento.');
      } else {
        console.log('❌ Error al guardar/quitar:', err?.message || err);
        Alert.alert('Error', 'Ocurrió un problema al guardar o quitar el evento.');
      }
    } finally {
      setSaveLoading(false);
    }
  };

  // Handler para mandar mensaje a la empresa organizadora
  // Handler para mandar mensaje a la empresa organizadora (SMS o email) -- acepta un body personalizado
  const handleSendMessage = async (customBody) => {
    // Preferir teléfono, si no está usar email. Si no hay contacto, mostrar alerta.
    const companyPhone = empresaData?.telefono || empresaData?.phone || empresaData?.telefono_celular || empresaData?.phone_number;
    const companyEmail = empresaData?.email;
    const subject = encodeURIComponent(`Consulta sobre: ${eventDetails.title}`);
    const defaultText = `Hola! Vengo de EVENTIAL CSS, me interesa el evento "${eventDetails.title}" programado para ${eventDetails.fecha} ${eventDetails.hora}. ¿Podrían darme más detalles?`;
    const rawBody = typeof customBody === 'string' && customBody.length > 0 ? customBody : defaultText;
    const body = encodeURIComponent(rawBody);
    try {
      if (companyPhone) {
        // sms body parameter differs on platforms
        const smsUrl = Platform.OS === 'ios' ? `sms:${companyPhone}&body=${body}` : `sms:${companyPhone}?body=${body}`;
        await Linking.openURL(smsUrl);
        return;
      }
      if (companyEmail) {
        const mailUrl = `mailto:${companyEmail}?subject=${subject}&body=${body}`;
        await Linking.openURL(mailUrl);
        return;
      }
      Alert.alert('Contacto no disponible', 'La empresa organizadora no tiene teléfono ni email registrado.');
    } catch (err) {
      console.warn('handleSendMessage error', err);
      Alert.alert('Error', 'No fue posible abrir la app de mensajes.');
    }
  };

  // Abrir WhatsApp con mensaje predefinido "Mas informacion"; si no existe, fallback a handleSendMessage
  const openWhatsApp = async (wa) => {
    // wa puede ser número o url
    if (!wa) {
      // fallback a SMS/Email usando el mismo texto que intentamos enviar por WhatsApp
      const fallbackMsg = `Hola, vengo por EVENTIAL CCS. Estoy interesado en ${eventDetails.title} programado para ${eventDetails.fecha} a las ${eventDetails.hora}. ¿Podrían darme más detalles?`;
      await handleSendMessage(fallbackMsg);
      return;
    }
    try {
      let cleaned = String(wa).trim();
      if (/^https?:\/\//i.test(cleaned)) {
        await Linking.openURL(cleaned);
        return;
      }
      if (cleaned.indexOf('@') >= 0) {
        // probablemente no es número -> fallback a SMS/Email con mensaje consistente
        const fallbackMsg = `Hola, vengo por EVENTIAL CCS. Estoy interesado en ${eventDetails.title} programado para ${eventDetails.fecha} a las ${eventDetails.hora}. ¿Podrían darme más detalles?`;
        await handleSendMessage(fallbackMsg);
        return;
      }
      const digits = cleaned.replace(/[^+\d]/g, '').replace(/^00/, '+');
      const digitsForUrl = digits.replace(/^\+/, '');
      if (!digitsForUrl) {
        const fallbackMsg = `Hola, vengo por EVENTIAL CCS. Estoy interesado en ${eventDetails.title} programado para ${eventDetails.fecha} a las ${eventDetails.hora}. ¿Podrían darme más detalles?`;
        await handleSendMessage(fallbackMsg);
        return;
      }
      const message = encodeURIComponent(`Hola, vengo por EVENTIAL CCS. Estoy interesado en ${eventDetails.title} programado para ${eventDetails.fecha} a las ${eventDetails.hora}. ¿Podrían darme más detalles?`);
      const waUrl = `https://wa.me/${digitsForUrl}?text=${message}`;
      const can = await Linking.canOpenURL(waUrl);
      if (can) {
        await Linking.openURL(waUrl);
        return;
      }
      const nativeUrl = `whatsapp://send?phone=${digitsForUrl}&text=${message}`;
      const canNative = await Linking.canOpenURL(nativeUrl);
      if (canNative) {
        await Linking.openURL(nativeUrl);
        return;
      }
      // último recurso
      await Linking.openURL(waUrl).catch(() => {
        Alert.alert('No disponible', 'No se pudo abrir WhatsApp en este dispositivo.');
      });
    } catch (e) {
      console.log('openWhatsApp error', e);
      Alert.alert('Error', 'No fue posible abrir WhatsApp.');
    }
  };

  const handleReserve = async () => {
    if (!isLogged) {
      setLoginVisible(true);
      return;
    }
    if (!idEvento) return;

    Alert.alert(
      "Confirmar Reserva",
      "¿Deseas reservar tu lugar para este evento?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reservar",
          onPress: async () => {
            try {
              setReservaLoading(true);
              const res = await api.post('/api/reservas/', {
                evento: idEvento,
                cantidad: 1 // Por defecto 1 para MVP
              });
              setReservaConfirmada(res.data);
              setReservaModalVisible(true);
            } catch (err) {
              console.error('Error al reservar:', err);
              const msg = err.response?.data?.detail || err.message || 'Error desconocido';
              Alert.alert('Error', 'No se pudo completar la reserva: ' + msg);
            } finally {
              setReservaLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handler para compartir el evento con otras personas
  const handleShare = async () => {
    try {
      const message = buildShareMessage(eventDetails, idEvento || currentEventoId);
      await Share.share({ message });
    } catch (err) {
      console.warn('handleShare error', err);
    }
  };

  const [relatedIndex, setRelatedIndex] = useState(0);
  // Eventos relacionados por categoría
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Cargar eventos relacionados cuando el evento principal esté disponible
  useEffect(() => {
    if (!evento || !evento.id) return;

    const categoriasBase = Array.isArray(evento.categoria)
      ? evento.categoria
      : (evento.categoria ? [evento.categoria] : []);

    if (categoriasBase.length === 0) {
      setRelatedEvents([]);
      return;
    }

    let cancelado = false;
    const fetchRelated = async () => {
      try {
        setRelatedLoading(true);
        setCompanyEventsLoading(true);
        const res = await api.get('/api/eventos-publicos/');
        if (cancelado) return;

        const sourceData = Array.isArray(res?.data)
          ? res.data
          : (res?.data && Array.isArray(res.data.results) ? res.data.results : []);
        if (!Array.isArray(res?.data) && (!res?.data || !Array.isArray(res.data.results))) {
          console.warn('BuyScreen: /api/eventos-publicos returned non-array response:', res?.data);
        }
        const filtrados = sourceData.filter(ev => {
          if (ev.id === evento.id) return false;
          const catsEv = Array.isArray(ev.categoria)
            ? ev.categoria
            : (ev.categoria ? [ev.categoria] : []);
          return catsEv.some(c => categoriasBase.includes(c));
        });
        const mapeados = filtrados.map(ev => {
          const catsTexto = Array.isArray(ev.categoria)
            ? ev.categoria.join(', ')
            : (ev.categoria || 'Sin categoría');
          let imgSource = require('../../assets/register-bg.jpg');
          if (Array.isArray(ev.imagenes) && ev.imagenes.length > 0 && ev.imagenes[0]?.url) {
            imgSource = { uri: ev.imagenes[0].url };
          } else if (ev.imagen) {
            imgSource = { uri: ev.imagen };
          }
          return {
            id: ev.id,
            title: ev.titulo || 'Sin título',
            categoria: catsTexto,
            image: imgSource,
            empresa: ev.empresa,
          };
        });
        setRelatedEvents(mapeados);
        setRelatedIndex(0);

        // Eventos de la misma empresa (excluyendo el actual)
        const mismos = sourceData.filter(ev => ev.empresa === evento.empresa && ev.id !== evento.id);
        const mismosMap = mismos.map(ev => {
          let imgSource = require('../../assets/register-bg.jpg');
          if (Array.isArray(ev.imagenes) && ev.imagenes.length > 0 && ev.imagenes[0]?.url) {
            imgSource = { uri: ev.imagenes[0].url };
          } else if (ev.imagen) {
            imgSource = { uri: ev.imagen };
          }
          return {
            id: ev.id,
            title: ev.titulo || 'Sin título',
            price: ev.precio ? parseFloat(ev.precio) : 0,
            extra: ev.ubicacion || '',
            image: imgSource,
            empresa: ev.empresa,
          };
        });
        setCompanyEvents(mismosMap);
        setCompanyIndex(0);
      } catch (e) {
        console.error('Error cargando eventos relacionados/empresa:', e.message);
        setRelatedEvents([]);
        setCompanyEvents([]);
      } finally {
        if (!cancelado) {
          setRelatedLoading(false);
          setCompanyEventsLoading(false);
        }
      }
    };

    fetchRelated();
    return () => { cancelado = true; };
  }, [evento]);
  // Use shared HeaderBase component

  // Footer de HomeScreen.js

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: 0 }]}>

      <StandardHeader
        isLogged={isLogged}
        onLoginPress={() => setLoginVisible(true)}
        onLogoutPress={handleLogout}
        hasEmpresa={hasEmpresa}
        isEmpresaAccount={isEmpresaAccount}
        isUserAccount={!isEmpresaAccount}
        userAvatarUrl={userAvatarUrl}
        empresaData={empresaData}
        isHomeScreen={false}
        style={styles.headerHome}
        logoContainerStyle={styles.logoContainerHome}
        menuButtonStyle={styles.headerRightHome}
      />
      {/* Overlay de carga global mientras se obtienen datos del evento */}
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando evento…</Text>
        </View>
      )}
      {/* Barra de volver debajo del header */}
      <View style={[styles.backBar, { marginTop: 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={styles.backBarBtn}>
          <Text style={styles.backBarIcon}>‹</Text>
          <Text style={styles.backBarText}>Volver</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} activeOpacity={0.85} style={styles.shareBtn}>
          <Ionicons name="share-social-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.backBarText, { color: COLORS.primary, fontWeight: '800' }]}>Compartir</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={[styles.container, { paddingTop: 12, paddingBottom: 0 }]} contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
        {/* Carrusel de Evento Principal Mejorado */}
        <Text style={styles.sectionTitle}>Evento Principal</Text>
        <View style={[styles.carouselEnhancedWrapper, styles.fullBleed]}>
          <TouchableOpacity style={styles.carouselArrowLeft} onPress={goPrev} activeOpacity={0.7}>
            <Text style={styles.carouselArrowText}>‹</Text>
          </TouchableOpacity>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={slideWidth}
            snapToAlignment="center"
            style={[styles.carousel, { width: slideWidth }]}
            contentContainerStyle={{ alignItems: 'center' }}
          >
            {eventImages.map((img, idx) => (
              <View key={idx} style={[styles.squareImageFrame, { width: slideWidth, height: Math.min(slideWidth * 0.55, 320) }]}>
                <Image source={img} style={styles.squareImage} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.carouselArrowRight} onPress={goNext} activeOpacity={0.7}>
            <Text style={styles.carouselArrowText}>›</Text>
          </TouchableOpacity>
          <View style={styles.indicatorContainer}>
            {eventImages.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.indicator,
                  activeIndex === idx && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbRow}
            style={{ marginTop: 6 }}
          >
            {eventImages.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => goTo(idx)}
                style={[styles.thumbWrapper, activeIndex === idx && styles.thumbActive]}
                activeOpacity={0.85}
              >
                <Image source={img} style={styles.thumbImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Título y Descripción */}
        <View style={styles.titleDescBox}>
          <Text style={styles.title}>{eventDetails.title}</Text>
          <Text style={styles.description}>{eventDetails.description}</Text>
        </View>

        {/* Detalles del evento */}
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Detalles del evento</Text>
          {eventDetails.fecha && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Fecha: </Text>
              <Text style={styles.detail}>{eventDetails.fecha}</Text>
            </View>
          )}
          {eventDetails.hora && eventDetails.hora !== 'sin definir' && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Hora: </Text>
              <Text style={styles.detail}>{eventDetails.hora}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.label}>Lugar: </Text>
            <Text style={styles.detail}>{eventDetails.lugar}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Categoría: </Text>
            <Text style={styles.detail}>{Array.isArray(eventDetails.categoria) ? eventDetails.categoria.join(', ') : eventDetails.categoria} </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Vestimenta: </Text>
            <Text style={styles.detail}>{eventDetails.vestimenta}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Precio: </Text>
            <Text style={styles.detail}>
              {parseFloat(eventDetails.price) === 0 || eventDetails.price === 0 || eventDetails.price === '0' ? 'Entrada libre' : `${eventDetails.moneda} ${eventDetails.price}`}
            </Text>
          </View>
          {/* Ubicación eliminado */}
          {eventDetails.empresa && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Empresa: </Text>
              <TouchableOpacity onPress={() => {
                if (ownEmpresaId && eventDetails.empresaId && String(ownEmpresaId) === String(eventDetails.empresaId)) {
                  navigation.navigate('Empresa');
                } else {
                  navigation.navigate('EmpresaScreenUser', { empresaId: eventDetails.empresaId });
                }
              }}>
                <Text style={[styles.detail, { color: COLORS.primary, textDecorationLine: 'underline' }]}>
                  {eventDetails.empresa}
                </Text>
              </TouchableOpacity>
              {/* Mostrar links de la empresa (si vienen) */}
              {eventDetails.empresa_redes && eventDetails.empresa_redes.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  {eventDetails.empresa_redes.map((r, i) => (
                    <TouchableOpacity key={i} onPress={() => r.url && Linking.openURL(r.url)} style={{ paddingVertical: 4 }}>
                      <Text style={{ color: COLORS.primary }}>{r.tipo} — {r.url}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
           <TouchableOpacity
              style={[styles.secondaryButton, styles.waButton]}
              onPress={async () => {
                const wa = empresaData?.whatsapp || empresaData?.telefono || empresaData?.telefono_celular || empresaData?.phone;
                await openWhatsApp(wa);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.secondaryButtonText}>Mas informacion</Text>
            </TouchableOpacity>
        </View>


        {/* Eventos Relacionados (oculto si no hay) */}
        {relatedLoading ? (
          <View style={styles.relatedBox}><ActivityIndicator color={COLORS.primary} /></View>
        ) : relatedEvents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Eventos relacionados por categoría</Text>
            <View style={styles.relatedBox}>
              <View style={styles.relatedCarouselWrapper}>
                <TouchableOpacity
                  onPress={() => setRelatedIndex(prev => Math.max(prev - 1, 0))}
                  style={styles.arrowBtn}
                  disabled={relatedIndex === 0}
                >
                  <Text style={[styles.arrowText, relatedIndex === 0 && { opacity: 0.35 }]}>{'<'}</Text>
                </TouchableOpacity>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.relatedCarousel}
                >
                  {relatedEvents.slice(relatedIndex, relatedIndex + 3).map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.relatedCard}
                      activeOpacity={0.8}
                      onPress={() => navigation.push('BuyScreen', { idEvento: ev.id, idEmpresa: ev.empresa })}
                    >
                      <Image source={ev.image} style={styles.relatedImage} />
                      <Text style={styles.relatedName} numberOfLines={2}>{ev.title}</Text>
                      <Text style={styles.relatedCategory} numberOfLines={1}>{ev.categoria}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => setRelatedIndex(prev => Math.min(prev + 1, Math.max(relatedEvents.length - 3, 0)))}
                  style={styles.arrowBtn}
                  disabled={relatedIndex >= relatedEvents.length - 3}
                >
                  <Text style={[styles.arrowText, relatedIndex >= relatedEvents.length - 3 && { opacity: 0.35 }]}>{'>'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Eventos de la misma empresa (solo si hay otros) */}
        {companyEventsLoading ? (
          <View style={styles.relatedBox}><ActivityIndicator color={COLORS.primary} /></View>
        ) : companyEvents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Eventos de la misma empresa</Text>
            <View style={styles.relatedBox}>
              <View style={styles.relatedCarouselWrapper}>
                <TouchableOpacity
                  onPress={() => setCompanyIndex(prev => Math.max(prev - 1, 0))}
                  style={styles.arrowBtn}
                  disabled={companyIndex === 0}
                >
                  <Text style={[styles.arrowText, companyIndex === 0 && { opacity: 0.35 }]}>{'<'}</Text>
                </TouchableOpacity>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.relatedCarousel}
                >
                  {companyEvents.slice(companyIndex, companyIndex + 3).map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.companyCard}
                      activeOpacity={0.8}
                      onPress={() => navigation.push('BuyScreen', { idEvento: ev.id, idEmpresa: ev.empresa })}
                    >
                      <Image source={ev.image} style={styles.companyCardImage} />
                      <View style={styles.companyCardContent}>
                        <Text style={styles.companyCardTitle} numberOfLines={2}>{ev.title}</Text>
                        <Text style={styles.companyCardPrice}>US$ {ev.price.toFixed(2)}</Text>
                        {ev.extra ? <Text style={styles.companyCardExtra} numberOfLines={1}>{ev.extra}</Text> : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => setCompanyIndex(prev => Math.min(prev + 1, Math.max(companyEvents.length - 3, 0)))}
                  style={styles.arrowBtn}
                  disabled={companyIndex >= companyEvents.length - 3}
                >
                  <Text style={[styles.arrowText, companyIndex >= companyEvents.length - 3 && { opacity: 0.35 }]}>{'>'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={styles.buttonContainer}>
          {/* Botón Principal de Reserva */}
          {isLogged && !isEmpresaAccount && (
            <TouchableOpacity
              style={[styles.mainReserveBtn, reservaLoading && { opacity: 0.7 }]}
              onPress={handleReserve}
              disabled={reservaLoading}
              activeOpacity={0.85}
            >
              {reservaLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.mainReserveBtnText}>Reservar Mi Lugar</Text>
                  <Text style={styles.mainReserveBtnSubtext}>Entrada {parseFloat(eventDetails.price) === 0 ? 'Gratis' : `${eventDetails.moneda} ${eventDetails.price}`}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Mostrar botón Guardar solo para usuarios (no para cuentas empresa) */}
          {isLogged && isSaved !== null && !isEmpresaAccount ? (
            <TouchableOpacity
              style={[styles.reserveButton, isSaved ? styles.reserveButtonSaved : null]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={isSaved === null || saveLoading}
            >
              <View style={styles.buttonContent}>
                {/* Texto siempre presente para mantener tamaño; lo ocultamos visualmente mientras cargamos */}
                <Text style={[styles.buttonText, isSaved ? styles.buttonTextSaved : null, saveLoading ? { opacity: 0 } : null]}>
                  {isSaved ? 'Quitar de guardados' : 'Guardar'}
                </Text>
              </View>
              {/* Overlay centrado con spinner durante el guardado: fuera del contenido para asegurar posicionamiento relativo al botón */}
              {saveLoading && (
                <View style={styles.reserveButtonLoadingOverlay} pointerEvents="none">
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={{ textAlign: 'center', color: '#ffffffff', marginTop: 12 }}>
                Inicia sesión con una cuenta RUMBERA para guardar eventos.
              </Text>
            </View>
          )}
          {/* Cuando el usuario haya guardado el evento, mostrar acciones adicionales */}
          {isSaved ? (
            <View style={styles.iconRowCentered}>
              <TouchableOpacity style={[styles.iconCircle, { marginRight: 24 }]} onPress={handleSendMessage} activeOpacity={0.8}>
                {/* WhatsApp icon - fine-tuned centering */}
                <Svg width={32} height={32} viewBox="-2 -2 52 52">
                  <Path d="M24 4C12.95 4 4 12.95 4 24c0 3.98 1.09 7.7 3.01 10.93L4 44l9.07-3.01C16.3 42.91 20.02 44 24 44c11.05 0 20-8.95 20-20S35.05 4 24 4zm0 36c-3.13 0-6.17-.91-8.77-2.62l-.62-.38-7.17 1.83 1.89-6.96-.4-.63A15.97 15.97 0 1 1 24 40zm9.5-11.5c-.47-.24-2.77-1.36-3.2-1.51-.43-.15-.73-.24-1.04.24-.31.48-1.18 1.48-1.45 1.78-.27.3-.54.33-1.01.12-.47-.24-2-.74-3.83-2.38-1.41-1.25-2.36-2.81-2.63-3.3-.27-.49-.04-.73.2-.97.23-.23.49-.58.74-.88.25-.3.29-.49.46-.82.15-.33.08-.62-.04-.86-.12-.24-1-2.53-1.38-3.45-.37-.91-.74-.8-1.01-.81-.27-.01-.58-.01-.89-.01-.31 0-.82.12-1.26.62-.44.5-1.67 1.67-1.62 4.07.05 2.4 1.74 4.72 1.99 5.05.25.33 3.43 5.28 8.39 7.19 1.16.44 2.09.72 2.81.92 1.19.37 2.28.32 3.13.19.96-.14 2.77-1.12 3.18-2.09.4-.97.4-1.81.28-1.97-.12-.16-.42-.27-.89-.48z" fill="#fff" />
                </Svg>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconCircle} onPress={handleShare} activeOpacity={0.8}>
                {/* Share arrow up out of tray icon (tray below, arrow up) - slightly larger for aesthetics */}
                <Svg width={32} height={32} viewBox="0 0 28 28">
                  {/* Tray */}
                  <Path d="M4 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a1 1 0 1 0-2 0v2H6v-2a1 1 0 1 0-2 0v2z" fill="#fff" />
                  {/* Arrow up */}
                  <Path d="M14 18a1 1 0 0 1-1-1V8.41l-3.3 3.3a1 1 0 1 1-1.4-1.42l5-5a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1-1.4 1.42l-3.3-3.3V17a1 1 0 0 1-1 1z" fill="#fff" />
                </Svg>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>
      {/* Modal de Login (traído desde prueba.js) */}
      <Modal
        visible={loginVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLoginVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 24, width: Math.min(320, width - 32), alignItems: 'center', position: 'relative' }}>
            <Pressable style={{ position: 'absolute', top: 8, right: 12, zIndex: 2 }} onPress={() => setLoginVisible(false)}>
              <Text style={{ fontSize: 24, color: '#fff' }}>×</Text>
            </Pressable>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Iniciar sesión</Text>
            <TextInput
              style={{ backgroundColor: '#fff', borderRadius: 8, padding: 10, width: '100%', marginBottom: 12 }}
              placeholder="Correo electrónico"
              placeholderTextColor="#888"
              keyboardType="email-address"
              value={user}
              onChangeText={setUser}
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              style={{ backgroundColor: '#fff', borderRadius: 8, padding: 10, width: '100%', marginBottom: 12 }}
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
            <TouchableOpacity
              style={{ backgroundColor: '#0ea5e9', borderRadius: 8, padding: 10, alignItems: 'center', width: '100%', marginTop: 8 }}
              onPress={handleLogin}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Ingresar</Text>
              )}
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Text style={{ color: '#0ea5e9', marginHorizontal: 6 }}>¿Olvidaste tu contraseña?</Text>
              <Text style={{ color: '#0ea5e9', marginHorizontal: 6 }}>|</Text>
              <TouchableOpacity onPress={() => { setLoginVisible(false); navigation.navigate('AccountTypeScreen'); }}>
                <Text style={{ color: '#0ea5e9', marginHorizontal: 6 }}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Éxito de Reserva */}
      <Modal
        visible={reservaModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setReservaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reservaSuccessCard}>
            <View style={styles.reservaSuccessIcon}>
              <Text style={{ fontSize: 40 }}>✅</Text>
            </View>
            <Text style={styles.reservaSuccessTitle}>¡Reserva Confirmada!</Text>
            <Text style={styles.reservaSuccessText}>
              Has reservado con éxito para "{eventDetails.title}".
            </Text>
            
            <View style={styles.qrContainer}>
              {/* Aquí iría un componente QR real, por ahora mostramos el código */}
              <Text style={styles.qrPlaceholderText}>CÓDIGO DE ENTRADA</Text>
              <Text style={styles.qrCodeText}>{reservaConfirmada?.codigo_qr}</Text>
              <View style={styles.qrMockup}>
                 {/* Representación visual simple de un QR */}
                 {[...Array(5)].map((_, i) => (
                   <View key={i} style={{flexDirection: 'row'}}>
                     {[...Array(5)].map((_, j) => (
                       <View key={j} style={{width: 25, height: 25, backgroundColor: (i+j)%2 === 0 ? '#000' : '#fff'}} />
                     ))}
                   </View>
                 ))}
              </View>
            </View>

            <Text style={styles.reservaInstruction}>
              Muestra este código al llegar al evento para validar tu entrada.
            </Text>

            <TouchableOpacity 
              style={styles.closeReservaBtn}
              onPress={() => setReservaModalVisible(false)}
            >
              <Text style={styles.closeReservaBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  companyCard: {
    backgroundColor: '#23262F',
    borderRadius: 16,
    width: 160,
    marginHorizontal: 10,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  companyCardImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginBottom: 10,
    resizeMode: 'cover',
    backgroundColor: '#181A20',
  },
  companyCardContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  companyCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  companyCardPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22c55e',
    marginBottom: 2,
    textAlign: 'center',
  },
  companyCardExtra: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: 'bold',
    marginTop: 2,
    textAlign: 'center',
  },
  squareImageFrame: {
    backgroundColor: COLORS.card,
    borderRadius: 0,
    borderWidth: 0,
    marginHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  squareImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 16,
  },
  relatedBox: {
    backgroundColor: '#23262F',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    marginHorizontal: 8,
    marginBottom: 24,
    elevation: 3,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  headerHome: { backgroundColor: '#0f172a', paddingHorizontal: 22, paddingTop: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b', marginBottom: 12 },
  headerContainerHome: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoContainerHome: { flexDirection: 'row', alignItems: 'flex-end' },
  logoTextHome: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  logoSubtextHome: { fontSize: 16, fontWeight: '600', color: '#db2777', marginLeft: 4 },
  headerRightHome: { flexDirection: 'row', alignItems: 'center' },
  loginBtnHome: { backgroundColor: '#0ea5e9', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  loginBtnTextHome: { color: '#fff', fontWeight: 'bold' },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  backBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23262F',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23262F',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  backBarIcon: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginRight: 6, marginTop: -1 },
  backBarText: { color: '#e5e7eb', fontSize: 15, fontWeight: '600' },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
    backgroundColor: '#0f172a',
  },
  carouselWrapper: {
    alignItems: 'center',
    marginBottom: 18,
  },
  carousel: {
    height: 220,
  },
  imageFrame: {
    width: width * 0.85,
    height: 210,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 16,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
    marginHorizontal: 3,
  },
  activeIndicator: {
    backgroundColor: COLORS.primary,
  },
  carouselEnhancedWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  fullBleed: { marginHorizontal: -18, width: width, alignSelf: 'center' },
  carouselArrowLeft: {
    position: 'absolute',
    left: 4,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselArrowRight: {
    position: 'absolute',
    right: 4,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselArrowText: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: -2 },
  thumbRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  thumbWrapper: { borderRadius: 10, overflow: 'hidden', marginHorizontal: 4, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: COLORS.primary },
  thumbImage: { width: 48, height: 48, resizeMode: 'cover' },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  description: {
    fontSize: 17,
    color: COLORS.subtitle,
    textAlign: 'center',
    marginBottom: 18,
    marginHorizontal: 10,
  },
  detailsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
    marginHorizontal: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    fontWeight: 'bold',
    color: COLORS.detailLabel,
    fontSize: 16,
    width: 110,
  },
  detail: {
    color: COLORS.text,
    fontSize: 16,
    flexShrink: 1,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  reserveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minWidth: 200,
    position: 'relative',
  },
  reserveButtonSaved: {
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reserveButtonLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.08)', // opcional para dar feedback visual
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 10, 33, 1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  buttonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonTextSaved: {
    color: '#fef2f2',
  },
  actionsRow: {
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButton: {
    // ...existing code...
  },
  iconButton: {
    // ...existing code...
  },
  iconRowCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  iconCircle: {
    backgroundColor: '#334155',
    borderRadius: 32,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  waButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18773bff',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    minWidth: 240,
    marginTop: 8,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    opacity: 0.9,
  },
  iconSaved: {
    opacity: 1,
  },
  relatedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 32,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  relatedCarouselWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  relatedCarousel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  relatedCard: {
    backgroundColor: '#23262F',
    borderRadius: 14,
    width: 120,
    marginHorizontal: 8,
    alignItems: 'center',
    paddingVertical: 10,
    elevation: 2,
  },
  relatedImage: {
    width: 100,
    height: 70,
    borderRadius: 10,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  relatedName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 2,
  },
  relatedCategory: {
    fontSize: 12,
    color: '#0ea5e9',
    marginBottom: 2,
    textAlign: 'center',
  },
  relatedLocation: {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
  },
  arrowBtn: {
    backgroundColor: '#23262F',
    borderRadius: 20,
    padding: 8,
    marginHorizontal: 2,
    elevation: 2,
  },
  arrowText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  titleDescBox: {
    backgroundColor: '#23262F',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 8,
    marginBottom: 18,
    alignItems: 'center',
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  // Nuevos estilos para Reserva
  mainReserveBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mainReserveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mainReserveBtnSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reservaSuccessCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 32,
    width: width * 0.85,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  reservaSuccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  reservaSuccessTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  reservaSuccessText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  qrPlaceholderText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  qrCodeText: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  qrMockup: {
    padding: 4,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  reservaInstruction: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  closeReservaBtn: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  closeReservaBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
