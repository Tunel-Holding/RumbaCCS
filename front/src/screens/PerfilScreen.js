import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from "../services/api"
import AsyncStorage from '@react-native-async-storage/async-storage';
import CalendarModal from '../components/CalendarModal';
import HamburgerMenu from '../components/HamburgerMenu';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Image, Modal, Animated } from 'react-native';
import { SvgXml } from 'react-native-svg';


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
  const [hasEmpresa, setHasEmpresa] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [profilePicModal, setProfilePicModal] = useState(false);
  // Estado para empresas seguidas (usuario normal)
  const [empresasSeguidas, setEmpresasSeguidas] = useState([]);
  const [empresasModal, setEmpresasModal] = useState(false);
  // Estado para seguidores (usuario empresa)
  const [seguidores, setSeguidores] = useState([]);
  const [seguidoresModal, setSeguidoresModal] = useState(false);

  
  useEffect(() => {
    
  // Función que lee el nombre guardado en AsyncStorage
  const fetchUserName = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      
      const empresaId = await AsyncStorage.getItem('empresaId');
      const token = await AsyncStorage.getItem('accessToken');
      setHasEmpresa(!!(empresaId && empresaId !== ''));
      setIsLogged(!!token);

      if (name) {
        setUserName(name);
      } else {
        setUserName('');
      }
    } catch (error) {
      console.log('Error al leer userName:', error);
      setUserName('');
    }
  };
  // Suscribirse al evento 'focus' de React Navigation:
  // cada vez que la pantalla vuelva al frente, se ejecuta fetchUserName
  const focusListener = navigation.addListener('focus', fetchUserName);

  // Llamada inicial al montar la pantalla
  fetchUserName();

  // Limpiar el listener cuando el componente se desmonta
  return () => {
    if (focusListener) {
      focusListener(); // quita la suscripción
    }
  };
}, [navigation]);

// RN: envío simple a tu endpoint DRF
// const uploadAvatar = async (uri, name, type, token) => {
//   const formData = new FormData();
//   formData.append('file', { uri, name, type });

//   const res = await api.post(`/api/usuarios/upload_avatar/`, formData, {
//     headers: {
//       'Authorization': `Bearer ${token}`, // o 'Token <token>' dependiendo de tu auth en DRF
//       'Content-Type': 'multipart/form-data',
//     },
//   });
//   return res.data;
// };

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

  Alert.alert(
    'Sesión cerrada',
    'Has cerrado sesión correctamente',
    [
      {
        text: 'OK',
        onPress: () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'HomeScreen' }], // nombre exacto en el Stack
          });
        },
      },
    ]
  );
};
  const [notifAnim] = useState(new Animated.Value(0));
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  // Fade in animation when notifications modal opens
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
        onPress={() => {
          console.log('Botón de guardados presionado');
          setSelectedSection('guardados');
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
    </View>
  );

  // --- Estado para eventos guardados ---
  const [guardados, setGuardados] = useState([]);
  const [loadingGuardados, setLoadingGuardados] = useState(false);

  // Función para cargar eventos guardados desde el backend
  const fetchGuardados = async () => {
    setLoadingGuardados(true);
    try {
      const response = await api.get('api/eventos-guardados/');
      setGuardados(response.data.map(e => ({
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
  useEffect(() => {
    if (selectedSection === 'guardados') {
      console.log('useEffect: selectedSection es guardados, ejecutando fetchGuardados');
      fetchGuardados();
    }
  }, [selectedSection]);

  // Llama a fetchGuardados cuando el usuario regresa a la pantalla de guardados
  useFocusEffect(
    React.useCallback(() => {
      if (selectedSection === 'guardados') {
        fetchGuardados();
      }
    }, [selectedSection])
  );

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

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      {/* Overlay superior color fondo app */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, backgroundColor: '#0f172a', zIndex: 10 }} pointerEvents="none" />
      {/* Overlay inferior color fondo app (más grande) */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, backgroundColor: '#0f172a', zIndex: 10 }} pointerEvents="none" />
      <ScrollView
        style={[styles.container, { marginTop: 32, marginBottom: 48 }]}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        scrollEnabled={!modalVisible.calendar}
      >
      {/* Header / Navbar móvil */}
      <View style={styles.navbar}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>R U M B A</Text>
          <Text style={styles.logoSubText}>CCS</Text>
        </View>
        <HamburgerMenu
          visible={menuVisible}
          setVisible={setMenuVisible}
          hasEmpresa={hasEmpresa}
          onMenuItemPress={item => {
            setMenuVisible(false);
           if (item === 'calendar') setModalVisible({ ...modalVisible, calendar: true });
            else if (item === 'notifications') setModalVisible({ ...modalVisible, notifications: true });
            else if (item === 'inicio') navigation.navigate('HomeScreen');
            else if (item === 'register') navigation.navigate('Empresa');
            else if (item === 'empresa_form') navigation.navigate('FormularioScreen');
          }}
        />
      </View>

      {/* Perfil principal móvil */}
      <View style={styles.profileContainer}>
        <TouchableOpacity onPress={() => setProfilePicModal(true)} activeOpacity={0.7}>
          <Image
            source={{ uri: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/0336b088-530a-4fdb-a3f8-acfafdbd3264.png' }}
            style={styles.profileImage}
          />
        </TouchableOpacity>
        <Text style={styles.userName}>{userName ? userName : 'Usuario'}</Text>
        {/* Botón cerrar sesión si hay usuario logueado */}
  {userName ? (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        ) : null}
        {/* Mostrar solo el botón correspondiente según el tipo de usuario */}
        {!hasEmpresa && (
          <>
            <Text style={styles.userStats}>Empresas seguidas: <Text style={styles.highlight}>{empresasSeguidas.length}</Text></Text>
            <TouchableOpacity
              style={{ backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18, marginBottom: 8, alignItems: 'center', alignSelf: 'center' }}
              onPress={async () => {
                try {
                  const userId = await AsyncStorage.getItem('userId');
                  const res = await api.get(`/api/usuarios/${userId}/empresas-seguidas/`);
                  setEmpresasSeguidas(res.data || []);
                } catch (e) {
                  setEmpresasSeguidas([]);
                }
                setEmpresasModal(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Ver empresas que sigues</Text>
            </TouchableOpacity>
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
                    {empresasSeguidas.length === 0 ? (
                      <Text style={{ color:'#64748b', textAlign:'center' }}>No sigues ninguna empresa.</Text>
                    ) : (
                      empresasSeguidas.map((emp, idx) => (
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
        {hasEmpresa && (
          <>
            <Text style={styles.userStats}>Empresas que sigues: <Text style={styles.highlight}>{seguidores.length}</Text></Text>
            <TouchableOpacity
              style={{ backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18, marginBottom: 8, alignItems: 'center', alignSelf: 'center' }}
              onPress={async () => {
                try {
                  const userId = await AsyncStorage.getItem('userId');
                  const res = await api.get(`/api/usuarios/${userId}/empresas-seguidas/`);
                  setSeguidores(res.data.empresas || []);

                } catch (e) {
                  setSeguidores([]);
                }
                setSeguidoresModal(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Ver empresas que sigues</Text>
            </TouchableOpacity>
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
            <Text style={{ color: '#d1d5db', textAlign: 'center', marginTop: 32, fontSize: 18 }}>Cargando...</Text>
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
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, width: '100%' }}>
            <Text style={{ color: '#6366f1', fontWeight: 'bold', fontSize: 16 }}>Festival de Cine Nocturno</Text>
            <Text style={{ color: '#374151', marginTop: 4 }}><Text style={{ fontWeight: 'bold', color: '#111827' }}>@cinelover:</Text> ¡La selección de películas estuvo aterradora y brillante!</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <SvgXml xml={`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor'><path stroke-linecap='round' stroke-linejoin='round' d='M14.318 5.318a4.5 4.5 0 0 1 6.364 6.364L12 20.364 3.318 11.682a4.5 4.5 0 1 1 6.364-6.364z' /></svg>`} width={20} height={20} />
              <Text style={{ color: '#374151', marginLeft: 4 }}>12</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, width: '100%' }}>
            <Text style={{ color: '#6366f1', fontWeight: 'bold', fontSize: 16 }}>Festival de Cine Nocturno</Text>
            <Text style={{ color: '#374151', marginTop: 4 }}><Text style={{ fontWeight: 'bold', color: '#111827' }}>@cinelover:</Text> ¡AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA!</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <SvgXml xml={`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor'><path stroke-linecap='round' stroke-linejoin='round' d='M14.318 5.318a4.5 4.5 0 0 1 6.364 6.364L12 20.364 3.318 11.682a4.5 4.5 0 1 1 6.364-6.364z' /></svg>`} width={20} height={20} />
              <Text style={{ color: '#374151', marginLeft: 4 }}>12</Text>
            </View>
          </View>
        </View>
      )}

      {/* Modals solo versión móvil */}
      <Modal visible={modalVisible.cart} transparent animationType="none">
        {/* Fade in/out animation for tickets overlay */}
        <Animated.View>
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
           
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 18, textAlign: 'center' }}>Tus Tickets</Text>

          </View>
        </Animated.View>
      </Modal>
      <CalendarModal
        visible={modalVisible.calendar}
        onClose={() => setModalVisible({ ...modalVisible, calendar: false })}
      />
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

      {/* Modal para cambiar foto de perfil */}
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
      </ScrollView>
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
  eventoInfoText: { color: '#ffffff', fontSize: 14 },
  eventTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold', marginTop: 8 },
  eventInfo: { color: '#fff', marginBottom: 4 },
  eventPrice: { color: '#bef264', fontWeight: 'bold', marginBottom: 8 },
});
