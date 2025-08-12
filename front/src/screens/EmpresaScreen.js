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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PersonIcon from '../components/PersonIcon';
import EmpresaMenu from '../components/EmpresaMenu';

const { width } = Dimensions.get('window');

export default function EmpresaScreen() {
  const navigation = useNavigation();

  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [modalVisible, setModalVisible] = useState({ cart: false, calendar: false, notifications: false });
  const [notifAnim] = useState(new Animated.Value(0));
  
  // Animaciones
  const menuAnim = useRef(new Animated.Value(0)).current;

  // Datos de la empresa
  const empresaData = {
    nombre: 'Empresa',
    seguidores: 50,
    eventosPublicados: 5,
  };

  // Eventos de ejemplo
  const eventos = [
    {
      id: 1,
      titulo: 'Concierto Electrónico',
      fecha: '15 Ago 2025',
      ubicacion: 'Sala Mayor',
      precio: '$30.000',
      categoria: 'Concierto',
      categoriaColor: '#4f46e5',
      imagen: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/0336b088-530a-4fdb-a3f8-acfafdbd3264.png',
    },
    {
      id: 2,
      titulo: 'Feria Gastronómica',
      fecha: '22 Sep 2025',
      ubicacion: 'Plaza Gourmet',
      precio: 'Entrada libre',
      categoria: 'Feria',
      categoriaColor: '#db2777',
      imagen: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/2845f684-896f-4604-a8e9-6ce9929b0bbb.png',
    },
    {
      id: 3,
      titulo: 'Festival de Jazz',
      fecha: '5 Nov 2025',
      ubicacion: 'Teatro Central',
      precio: '$20.000',
      categoria: 'Festival',
      categoriaColor: '#ca8a04',
      imagen: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/d202d6da-9e5f-432c-97dd-5ad86b5461af.png',
    },
    {
      id: 4,
      titulo: 'Expo Arte Urbano',
      fecha: '12 Dic 2025',
      ubicacion: 'Galería Libre',
      precio: '$10.000',
      categoria: 'Expo',
      categoriaColor: '#16a34a',
      imagen: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/2cd9adb4-9a48-403a-8a0b-c1e9b937bda9.png',
    },
    {
      id: 5,
      titulo: 'Noche de Stand Up',
      fecha: '20 Ene 2026',
      ubicacion: 'Café Teatro',
      precio: '$12.000',
      categoria: 'Show',
      categoriaColor: '#9333ea',
      imagen: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c6cd1090-2218-4767-9cc4-fd828519ee85.png',
    },
  ];



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

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

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
           onMenuItemPress={item => {
             setMobileMenuVisible(false);
             if (item === 'agregar_evento') {
               // Aquí puedes agregar la lógica para agregar evento
               console.log('Agregar evento');
             }
             else if (item === 'administrar_ganancias') {
               // Aquí puedes agregar la lógica para administrar ganancias
               console.log('Administrar ganancias');
             }
                           else if (item === 'notifications') setModalVisible({ ...modalVisible, notifications: true });
              else if (item === 'inicio') navigation.navigate('HomeScreen');
              else if (item === 'register') navigation.navigate('Perfil');
           }}
         />
      </View>
    </View>
  );



  const renderNotificationsModal = () => (
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
  );

  const renderPerfilEmpresa = () => (
    <View style={styles.perfilContainer}>
      <View style={styles.perfilContent}>
        {/* Foto de perfil */}
        <View style={styles.fotoContainer}>
          <TouchableOpacity 
            style={styles.fotoPerfil}
            onPress={() => {
              // Aquí puedes agregar la lógica para editar el perfil
              console.log('Editar perfil de empresa');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.fotoIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Datos de empresa */}
        <View style={styles.datosContainer}>
          <Text style={styles.empresaNombre}>{empresaData.nombre}</Text>
          <Text style={styles.seguidoresText}>
            Seguidores de la empresa: <Text style={styles.seguidoresCount}>{empresaData.seguidores}</Text>
          </Text>
          <Text style={styles.eventosText}>
            Total de eventos publicados: <Text style={styles.eventosCount}>{empresaData.eventosPublicados}</Text>
          </Text>
          <TouchableOpacity 
            style={[styles.seguirButton, isFollowing && styles.seguirButtonActive]}
            onPress={toggleFollow}
          >
                         <View style={styles.seguirIcon}>
               <PersonIcon size={18} color="#ffffff" />
             </View>
            <Text style={styles.seguirText}>
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEventos = () => (
    <View style={styles.eventosContainer}>
      <View style={styles.eventosHeader}>
        <Text style={styles.eventosTitle}>Eventos publicados</Text>
                 <TouchableOpacity style={styles.agregarButton}>
           <Text style={styles.agregarIcon}>+</Text>
         </TouchableOpacity>
      </View>

      <View style={styles.eventosGrid}>
        {eventos.map((evento) => (
          <View key={evento.id} style={styles.eventoCard}>
            <View style={styles.eventoImageContainer}>
              <Image 
                source={{ uri: evento.imagen }} 
                style={styles.eventoImage}
                resizeMode="cover"
              />
              <View style={[styles.eventoCategoria, { backgroundColor: evento.categoriaColor }]}>
                <Text style={styles.eventoCategoriaText}>{evento.categoria}</Text>
              </View>
            </View>
            
            <View style={styles.eventoContent}>
              <Text style={styles.eventoTitulo}>{evento.titulo}</Text>
              
              <View style={styles.eventoInfo}>
                <Text style={styles.eventoInfoText}>📅 {evento.fecha}</Text>
              </View>
              
              <View style={styles.eventoInfo}>
                <Text style={styles.eventoInfoText}>📍 {evento.ubicacion}</Text>
              </View>
              
              <View style={styles.eventoFooter}>
                <Text style={styles.eventoPrecio}>{evento.precio}</Text>
                <TouchableOpacity style={styles.verDetallesButton}>
                  <Text style={styles.verDetallesText}>Ver detalles</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
             {renderHeader()}
       {renderNotificationsModal()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {renderPerfilEmpresa()}
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoSubtext: {
    fontSize: 16,
    fontWeight: '600',
    color: '#db2777',
    marginLeft: 4,
  },
  
     

  

  // Perfil styles
  perfilContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 48,
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
  datosContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  empresaNombre: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  seguidoresText: {
    fontSize: 20,
    color: '#d1d5db',
    marginBottom: 4,
    textAlign: 'center',
  },
  seguidoresCount: {
    fontWeight: 'bold',
    color: '#db2777',
  },
  eventosText: {
    fontSize: 18,
    color: '#d1d5db',
    marginBottom: 16,
    textAlign: 'center',
  },
  eventosCount: {
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  seguirButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#db2777',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  seguirButtonActive: {
    backgroundColor: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    shadowColor: '#16a34a',
  },
     seguirIcon: {
     backgroundColor: 'rgba(255, 255, 255, 0.15)',
     borderRadius: 16,
     padding: 6,
     marginRight: 10,
     borderWidth: 1,
     borderColor: 'rgba(255, 255, 255, 0.2)',
     justifyContent: 'center',
     alignItems: 'center',
   },
     seguirText: {
     color: '#ffffff',
     fontSize: 18,
     fontWeight: '900',
     textShadowColor: 'rgba(0, 0, 0, 0.3)',
     textShadowOffset: { width: 0, height: 1 },
     textShadowRadius: 2,
   },

  // Eventos styles
  eventosContainer: {
    marginTop: 48,
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
});