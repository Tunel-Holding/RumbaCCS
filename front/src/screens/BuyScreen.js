import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

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

const eventImages = [
  require('../../assets/register-bg.jpg'),
  require('../../assets/icon.png'),
  require('../../assets/splash-icon.png'),
];

const eventDetails = {
  title: 'Fiesta de Verano 2025',
  description: '¡Ven a disfrutar la mejor fiesta del año! Música, baile y diversión asegurada.',
  lugar: 'Club Social CCS',
  categoria: 'Fiesta',
  vestimenta: 'Casual/Verano',
  ubicacion: 'Av. Principal, Caracas',
  empresa: 'Eventos Caracas', // Nombre de la empresa que publica el evento
};
  // Más eventos de la empresa (ejemplo)
  const moreFromCompany = [
    {
      id: 10,
      image: require('../../assets/register-bg.jpg'),
      title: 'Sunset Party',
      categoria: 'Fiesta',
      ubicacion: 'Terraza Este',
      price: 9.99,
      extra: 'Caracas',
    },
    {
      id: 11,
      image: require('../../assets/icon.png'),
      title: 'Jazz Night',
      categoria: 'Música',
      ubicacion: 'Jazz Club',
      price: 15.99,
      extra: 'Caracas',
    },
    {
      id: 12,
      image: require('../../assets/splash-icon.png'),
      title: 'Gala Anual',
      categoria: 'Gala',
      ubicacion: 'Hotel Caracas',
      price: 11.99,
      extra: 'Caracas',
    },
  ];

const { width } = Dimensions.get('window');

export default function BuyScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const navigation = useNavigation();

  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(slide);
  };
    const [relatedIndex, setRelatedIndex] = useState(0);
    // Eventos relacionados de ejemplo
    const relatedEvents = [
      {
        id: 1,
        image: require('../../assets/register-bg.jpg'),
        title: 'Pool Party',
        categoria: 'Fiesta',
        ubicacion: 'Hotel Aqua, Caracas',
      },
      {
        id: 2,
        image: require('../../assets/icon.png'),
        title: 'Concierto Urbano',
        categoria: 'Música',
        ubicacion: 'Parque Central',
      },
      {
        id: 3,
        image: require('../../assets/splash-icon.png'),
        title: 'Noche de Salsa',
        categoria: 'Baile',
        ubicacion: 'Club Salsa',
      },
      {
        id: 4,
        image: require('../../assets/register-bg.jpg'),
        title: 'Festival Gastronómico',
        categoria: 'Gastronomía',
        ubicacion: 'Plaza Gourmet',
      },
      {
        id: 5,
        image: require('../../assets/icon.png'),
        title: 'Expo Arte',
        categoria: 'Arte',
        ubicacion: 'Museo de Arte',
      },
    ];

  // Header de HomeScreen.js
  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Rumba<Text style={{ color: '#ec4899' }}>CCS</Text></Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.loginBtnText}>Iniciar sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Perfil')}>
          <Image
            source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
            style={{ width: 32, height: 32, borderRadius: 16, marginLeft: 12, borderWidth: 2, borderColor: '#0ea5e9' }}
          />
        </TouchableOpacity>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Carrusel de Evento Principal */}
        <Text style={styles.sectionTitle}>Carrusel de Evento Principal</Text>
        <View style={styles.carouselWrapper}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.carousel}
            contentContainerStyle={{ alignItems: 'center' }}
          >
            {eventImages.map((img, idx) => (
              <View key={idx} style={styles.squareImageFrame}>
                <Image source={img} style={styles.squareImage} />
              </View>
            ))}
          </ScrollView>
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
        </View>

        {/* Título y Descripción */}
        <View style={styles.titleDescBox}>
          <Text style={styles.title}>{eventDetails.title}</Text>
          <Text style={styles.description}>{eventDetails.description}</Text>
        </View>

        {/* Detalles del evento */}
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Detalles del evento</Text>
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
          <View style={styles.detailRow}>
            <Text style={styles.label}>Ubicación: </Text>
            <Text style={styles.detail}>{eventDetails.ubicacion}</Text>
          </View>
        </View>

        {/* Eventos Relacionados */}
        <Text style={styles.sectionTitle}>Eventos relacionados por Categoria</Text>
        <View style={styles.relatedBox}>
          <View style={styles.relatedCarouselWrapper}>
            <TouchableOpacity onPress={() => setRelatedIndex(Math.max(relatedIndex - 1, 0))} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>{'<'}</Text>
            </TouchableOpacity>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedCarousel}
            >
              {relatedEvents.slice(relatedIndex, relatedIndex + 3).map((ev, idx) => (
                <View key={ev.id} style={styles.relatedCard}>
                  <Image source={ev.image} style={styles.relatedImage} />
                  <Text style={styles.relatedName}>{ev.title}</Text>
                  <Text style={styles.relatedCategory}>{ev.categoria}</Text>
                  <Text style={styles.relatedLocation}>{ev.ubicacion}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setRelatedIndex(Math.min(relatedIndex + 1, relatedEvents.length - 3))} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Más eventos de la empresa */}
        <Text style={styles.sectionTitle}>Eventos de la misma empresa</Text>
        <View style={styles.relatedBox}>
          <View style={styles.relatedCarouselWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedCarousel}
            >
              {moreFromCompany.map((ev) => (
                <View key={ev.id} style={styles.companyCard}>
                  <Image source={ev.image} style={styles.companyCardImage} />
                  <View style={styles.companyCardContent}>
                    <Text style={styles.companyCardTitle}>{ev.title}</Text>
                    <Text style={styles.companyCardPrice}>US${' '}{ev.price.toFixed(2)}</Text>
                    <Text style={styles.companyCardExtra}>{ev.extra}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

      <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.reserveButton, isSaved && styles.reserveButtonSaved]} 
            onPress={() => setIsSaved(!isSaved)}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Text style={[styles.buttonText, isSaved && styles.buttonTextSaved]}>
                {isSaved ? 'Quitar evento de guardados' : 'Guardar Evento'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <Footer />
      </ScrollView>
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
    width: 210,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#444',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: COLORS.primary,
  },
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