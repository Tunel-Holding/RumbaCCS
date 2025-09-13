import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput,
  Pressable,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { loginConFallback } from '../utils/auth';
import api from '../services/api'; 
 import AsyncStorage from '@react-native-async-storage/async-storage';


// Footer links (copiados de HomeScreen.js)
const footerLinks = [
  { title: 'Reservas' },
  { title: 'Promoción de eventos' },
  { title: 'Soporte al organizador' },
  { title: 'API para desarrolladores' }
];

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
let companyEventsInit = [];

const { width } = Dimensions.get('window');

export default function BuyScreen() {
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;
  const [activeIndex, setActiveIndex] = useState(0);
  const [companyEvents, setCompanyEvents] = useState([]); // eventos de la misma empresa
  const [companyEventsLoading, setCompanyEventsLoading] = useState(false);
  const [companyIndex, setCompanyIndex] = useState(0);
  const navigation = useNavigation();
  const route = useRoute();
  const [loginVisible, setLoginVisible] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [empresaData, setEmpresaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLogged, setIsLogged] = useState(false);
  const [eventoS,setEventoS] = useState(false); //Valida que los datos del evento fueron guardados



  // Recibe los parámetros de navegación
  const { idEvento } = route.params ?? {};
  const [evento, setEvento] = useState(null);

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
};

  const handleLogout = async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('userEmail');
    await AsyncStorage.removeItem('userName');
    await AsyncStorage.removeItem('empresaId');
    await AsyncStorage.clear();
    setIsLogged(false);
    Alert.alert('Sesión cerrada', 'Has cerrado sesión correctamente');
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
      console.log('📦 Evento recibido:', resEvento.data);
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

  // Verificar si el evento está guardado (recarga en cambios de usuario, evento y tras guardar/quitar)
  const [refreshSaved, setRefreshSaved] = useState(0);
  useEffect(() => {
    setIsSaved(false);
    setSavedId(null);
    setCurrentEventoId(idEvento);
    const checkSaved = async () => {
      if (!isLogged || !idEvento) {
        setIsSaved(false);
        setSavedId(null);
        return;
      }
      try {
        // Forzar recarga sin cache
        const res = await api.get('/api/eventos-guardados/?evento=' + idEvento + '&_=' + Date.now());
        const isGuardado = Array.isArray(res.data) && res.data.length > 0;
        setIsSaved(isGuardado);
        setSavedId(isGuardado ? res.data[0].id : null);
        console.log(`Evento ${idEvento} guardado:`, isGuardado, res.data);
      } catch (err) {
        setIsSaved(false);
        setSavedId(null);
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
      if (!isSaved) {
        // Guardar evento
        const res = await api.post('/api/eventos-guardados/', {
          evento: idEvento,
        });
        if (res.data.id) {
          alert('Evento guardado correctamente');
          setRefreshSaved(r => r + 1); // fuerza recarga
        } else {
          alert('Error al guardar: ' + JSON.stringify(res.data));
        }
      } else {
        // Quitar de guardados
        if (savedId) {
          await api.delete('/api/eventos-guardados/' + savedId + '/');
        }
        alert('Evento quitado de guardados');
        setRefreshSaved(r => r + 1); // fuerza recarga
      }
    } catch (err) {
      console.error('❌ Error al guardar/quitar:', err.message);
      alert('Error al guardar/quitar: ' + err.message);
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
        const filtrados = res.data.filter(ev => {
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
        const mismos = res.data.filter(ev => ev.empresa === evento.empresa && ev.id !== evento.id);
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
  // ...existing code...
 
  // Header de HomeScreen.js
  const Header = () => (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Text style={styles.headerTitle}>Rumba<Text style={{ color: '#ec4899' }}>CCS</Text></Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>

      {/* Logo y foto de perfil si está autenticado, botón de iniciar sesión si no */}
      {isLogged ? (
        <>
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: '#ef4444' }]}
            onPress={handleLogout}
          >
            <Text style={styles.loginBtnText}>Cerrar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Perfil')}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
              style={{ width: 32, height: 32, borderRadius: 16, marginLeft: 12, borderWidth: 2, borderColor: '#0ea5e9' }}
            />
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => setLoginVisible(true)}
        >
          <Text style={styles.loginBtnText}>Iniciar sesión</Text>
        </TouchableOpacity>
      )}
      </View>
    </View>
  );

  // Footer de HomeScreen.js
  const Footer = () => (
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
    <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]}> 
      <Header />
      {/* Barra de volver debajo del header */}
      <View style={styles.backBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={styles.backBarBtn}>
          <Text style={styles.backBarIcon}>‹</Text>
          <Text style={styles.backBarText}>Volver</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
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
            <Text style={styles.detail}>{eventDetails.categoria}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Vestimenta: </Text>
            <Text style={styles.detail}>{eventDetails.vestimenta}</Text>
          </View>
          {/* Ubicación eliminado */}
          {eventDetails.empresa && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Empresa: </Text>
              <TouchableOpacity onPress={() => navigation.navigate('EmpresaScreenUser', { empresaId: eventDetails.empresaId })}>
                <Text style={[styles.detail, { color: COLORS.primary, textDecorationLine: 'underline' }]}>
                  {eventDetails.empresa}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
        {/* Log para depuración en cada render */}
        {isSaved !== null && (
          <TouchableOpacity 
            style={[styles.reserveButton, isSaved ? styles.reserveButtonSaved : null]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isSaved === null}
          >
            <View style={styles.buttonContent}>
              <Text style={[styles.buttonText, isSaved ? styles.buttonTextSaved : null]}>
                {isSaved ? 'Quitar de guardados' : 'Guardar'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
        <Footer />
      </ScrollView>
      {/* Modal de Login (traído desde prueba.js) */}
      <Modal
        visible={loginVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLoginVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 24, width: 320, alignItems: 'center', position: 'relative' }}>
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
            <TouchableOpacity
              style={{ backgroundColor: '#0ea5e9', borderRadius: 8, padding: 10, alignItems: 'center', width: '100%', marginTop: 8 }}
              onPress={handleLogin}    
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Ingresar</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Text style={{ color: '#0ea5e9', marginHorizontal: 6 }}>¿Olvidaste tu contraseña?</Text>
              <Text style={{ color: '#0ea5e9', marginHorizontal: 6 }}>|</Text>
              <TouchableOpacity onPress={() => { setLoginVisible(false); navigation.navigate('AccountTypeScreen'); }}>
                <Text style={{ color: '#0ea5e9', marginHorizontal: 6 }}>Regístrate</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: COLORS.background,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginLeft: 8, flex: 1 },
  loginBtn: { backgroundColor: '#0ea5e9', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  loginBtnText: { color: '#fff', fontWeight: 'bold' },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginTop: -6,
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
  backBarIcon: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginRight: 6, marginTop: -1 },
  backBarText: { color: '#e5e7eb', fontSize: 15, fontWeight: '600' },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
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
  buttonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonTextSaved: {
    color: '#fef2f2',
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
  footer: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginTop: 24, alignItems: 'center', marginBottom: 32 },
  footerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0ea5e9', marginBottom: 8 },
  footerDesc: { color: '#cbd5e1', textAlign: 'center', marginBottom: 12 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 },
  footerLink: { color: '#cbd5e1', marginHorizontal: 8, marginBottom: 4 },
  footerCopyright: { color: '#64748b', fontSize: 12, textAlign: 'center' },
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
});
