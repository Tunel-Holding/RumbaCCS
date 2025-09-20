import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
// import { CropView } from 'expo-image-crop';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import { useSafeMargins, getDeviceType, hasNotch } from '../utils/safeAreaUtils';
import { getResponsiveStyles, getBottomSafeAreaHeight, getTopSafeAreaHeight } from '../utils/deviceConfig';
import api from '../services/api'; // Ajusta el path según tu estructura
import * as ImagePicker from "expo-image-picker";
import { uploadImage } from "../services/uploadImage"; // Ajusta path

export default function AddScreen() {
  const navigation = useNavigation();
  const safeMargins = useSafeMargins();
  const deviceType = getDeviceType();
  const hasNotchDevice = hasNotch();
  const responsiveStyles = getResponsiveStyles();
  
  const [formData, setFormData] = useState({
    titulo: '',
    categoria: [],
    codigoVestimenta: '',
    descripcionVestimenta: '',
    edadMinima: '',
    edad_minima: null,
    ubicacion: '',
    capacidad: '',
    descripcion: '',
    precio: '',
    moneda: 'USD',
    imagenesTemp: [],
    imagenesLocales: [], 
    // Campos añadidos solo FRONT para fecha/hora
    fecha_evento_fecha: '',
    fecha_evento_hora: '',
  });
  const [showPrecio, setShowPrecio] = useState(false);
  const [eventoId, setEventoId] = useState(null);

  // Estados para los modales
  const [categoriaModalVisible, setCategoriaModalVisible] = useState(false);
  const [vestimentaModalVisible, setVestimentaModalVisible] = useState(false);
  const [edadModalVisible, setEdadModalVisible] = useState(false);
  const [ubicacionModalVisible, setUbicacionModalVisible] = useState(false);
  const [categoriaSearchText, setCategoriaSearchText] = useState('');
  const [empresaId, setEmpresaId] = useState(null);
  // Estados nuevos front
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  

  
  // Opciones predefinidas
  const categorias = [
    'Concierto', 'Feria', 'Festival', 'Exposición', 'Conferencia', 
    'Workshop', 'Networking', 'Show', 'Deportivo', 'Cultural',
    'Gastronómico', 'Tecnológico', 'Arte', 'Música', 'Teatro'
  ];

  const codigosVestimenta = [
    'Formal', 'Semi-formal', 'Casual', 'Deportivo', 'Elegante casual'
  ];

  const edadesMinimas = [
  { label: 'Todas las edades',       value: 0  },
  { label: 'Mayores de 13 años',     value: 13 },
  { label: 'Mayores de 16 años',     value: 16 },
  { label: 'Mayores de 18 años',     value: 18 },
  { label: 'Mayores de 21 años',     value: 21 },
  { label: 'Mayores de 25 años',     value: 25 },
  ];

  // Función para formatear precio con comas y decimales
  const formatPrice = (text) => {
    // Remover todo excepto números y punto decimal
    const cleanText = text.replace(/[^\d.]/g, '');
    
    // Solo permitir un punto decimal
    const parts = cleanText.split('.');
    if (parts.length > 2) return text;
    
    // Formatear parte entera con comas
    if (parts[0]) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    return parts.join('.');
  };

  // Función para limpiar precio (remover comas para cálculos)
  const cleanPrice = (text) => {
    return text.replace(/,/g, '');
  };

  // Filtrar categorías basado en la búsqueda
  const categoriasFiltradas = categorias.filter(categoria =>
    categoria.toLowerCase().includes(categoriaSearchText.toLowerCase())
  );

  // const uploadImage = async (fileUri) => {
  //   try {
  //     const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
  //     const fileBuffer = Buffer.from(base64, 'base64');
  //     const fileName = `temp/evento_${Date.now()}.jpg`;

  //     const { data, error } = await supabase.storage
  //       .from('eventos')
  //       .upload(fileName, fileBuffer, { contentType: 'image/jpeg', upsert: true });

  //     if (error) throw error;

  //     const { data: urlData } = supabase.storage.from('eventos').getPublicUrl(fileName);
  //     return urlData.publicUrl;
  //   } catch (err) {
  //     console.error("Error al subir imagen:", err);
  //     return null;
  //   }
  // };

  const handlePickImages = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? ImagePicker.MediaType?.Images ?? undefined,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result || result.canceled) return;

    // result.assets es un array; guardamos solo las URIs
    const uris = (result.assets || []).map(a => a.uri).filter(Boolean);

    if (uris.length === 0) return;

    setFormData(prev => ({
      ...prev,
      imagenesLocales: [...(prev.imagenesLocales || []), ...uris],
    }));
  } catch (err) {
    console.error("Error al seleccionar imágenes:", err);
    Alert.alert("Error", "No se pudieron seleccionar las imágenes");
  }
};

  const uploadEventoImage = async (eventoId, uri, empresaId) => {
  const formData = new FormData();
  formData.append("file", {
    uri,
    name: `image_${Date.now()}.jpg`,
    type: "image/jpeg",
  });

  try {
    const token = await AsyncStorage.getItem("accesToken");

  const res = await api.post(
    `api/empresas/${empresaId}/eventos/${eventoId}/imagenes/`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    }
  );

  // en axios, si hay error de status, lanza excepción, así que esta parte es innecesaria
  // pero si quieres validación extra:
  if (!res || res.status < 200 || res.status >= 300) {
    throw new Error(res?.data?.error || "Error al subir imagen");
  }

  // la respuesta ya está en res.data
  return res.data.url;
  } catch (e) {
    Alert.alert('Al subir la imagen', e.message);
  }
};



  const createEvento = async (payload, empresaId) => {

  const endpoint = `/api/empresas/${empresaId}/eventos/`;
  const res = await api.post(endpoint, payload);

  if (res.status < 200 || res.status >= 300) {
    const err = await res.data;
    throw new Error(JSON.stringify(err));
  }
  return res.data; // devuelve el evento creado
};


  const handleCreateEvent = async () => {
    const empresaId = await AsyncStorage.getItem('empresaId');

  if (!empresaId) {
    Alert.alert('Error', 'No se ha recuperado el ID de tu empresa');
    return;
  }
    if (!formData.titulo || formData.categoria.length === 0 || !formData.ubicacion) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios (título, categoría y ubicación)');
      return;
    }
    // Validar fecha y hora (solo front, opcional si backend lo usa)
    if (!formData.fecha_evento_fecha || !formData.fecha_evento_hora) {
      Alert.alert('Fecha/hora faltante', 'Debes ingresar la fecha y la hora del evento');
      return;
    }
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!fechaRegex.test(formData.fecha_evento_fecha)) {
      Alert.alert('Formato inválido', 'La fecha debe tener formato YYYY-MM-DD');
      return;
    }
    if (formData.fecha_evento_hora && !horaRegex.test(formData.fecha_evento_hora)) {
      Alert.alert('Formato inválido', 'La hora debe tener formato HH:MM (24h)');
      return;
    }
    const fechaISOBase = `${formData.fecha_evento_fecha}T${formData.fecha_evento_hora}:00`;
    const fechaDate = new Date(fechaISOBase);
    if (isNaN(fechaDate.getTime())) {
      Alert.alert('Error', 'Fecha y hora inválidas');
      return;
    }
    if (fechaDate.getTime() < Date.now()) {
      Alert.alert('Fecha pasada', 'La fecha del evento debe ser futura');
      return;
    }
    // Validar precio > 0 si el modo precio está activo (showPrecio) y no es entrada libre
    if (showPrecio && formData.precio !== 'Entrada libre') {
      const numericPrice = parseFloat(cleanPrice(formData.precio || '0')) || 0;
      if (numericPrice <= 0) {
        Alert.alert('Precio inválido', 'Debes ingresar un precio mayor a 0.');
        return;
      }
    }
    
    // Validar capacidad si se ingresó
    if (formData.capacidad) {
      const capacidadNum = parseInt(formData.capacidad.replace(/,/g, ''));
      if (capacidadNum < 10 || capacidadNum > 50000) {
        Alert.alert('Error', 'La capacidad debe estar entre 10 y 50,000 personas');
        return;
    }}
  // Construye payload (JSON o FormData si llevas archivo)
  const payload = {
    titulo: formData.titulo,
    categoria: formData.categoria,
    codigo_vestimenta: formData.codigoVestimenta || null,
    descripcion_vestimenta: formData.descripcionVestimenta || '',
    edad_minima: typeof formData.edad_minima === 'number' ? formData.edad_minima : 0,
    ubicacion: formData.ubicacion,
    capacidad: formData.capacidad ? parseInt(formData.capacidad.replace(/,/g, ''), 10) : null,
    descripcion: formData.descripcion || '',
    latitude: formData.latitude,
    longitude: formData.longitude,
    precio: formData.precio === 'Entrada libre' ? 0 : (formData.precio ? parseFloat(cleanPrice(formData.precio)) : 0),
    moneda: formData.moneda || 'USD',
    // Campo adicional opcional (solo si backend lo acepta)
    fecha_evento: (formData.fecha_evento_fecha && formData.fecha_evento_hora)
      ? new Date(`${formData.fecha_evento_fecha}T${formData.fecha_evento_hora}:00`).toISOString()
      : null,
  };

  console.log('payload:', payload);

  
 try {
    // 1) crear evento
    const newEvent = await createEvento(payload, empresaId);
    const eventoId = newEvent.id;
    setEventoId(eventoId);

    // 2) subir imágenes locales (si existen)
    const localImgs = formData.imagenesLocales || [];
    if (localImgs.length > 0) {
      // opcional: mostrar loader
      setUploadingImages(true);

      const uploads = localImgs.map(uri => uploadEventoImage(eventoId, uri,empresaId));
      const results = await Promise.allSettled(uploads);

      console.log("Results",results)

      const uploadedUrls = [];
      const failed = [];

      results.forEach((r, i) => {
        if (r.status === 'fulfilled') uploadedUrls.push(r.value);
        else failed.push({ uri: localImgs[i], reason: r.reason });
      });

      // actualizar el estado: limpiar locales y agregar las urls subidas
      setFormData(prev => ({
        ...prev,
        imagenesLocales: [],
        imagenesTemp: [...(prev.imagenesTemp || []), ...uploadedUrls],
      }));

      setUploadingImages(false);

      console.log("failed:",failed)

      if (failed.length > 0) {
        console.warn('Algunas imágenes no se subieron:', failed);
        Alert.alert('Aviso', `${failed.length} imagen(es) no se pudieron subir.`);
      }
    }

      Alert.alert('Éxito', 'Evento agregado correctamente', [
      { text: 'OK', onPress: () => navigation.navigate('Empresa') },
    ]);
  } catch (e) {
    Alert.alert('Error de red', e.message);
  }
  };

/**
 * Devuelve un objeto con la propiedad mediaTypes si se detectó alguna API válida,
 * o un objeto vacío (sin mediaTypes) si no hay una opción segura.
 */
function getMediaTypesOption() {
  // Expo antiguas: ImagePicker.MediaTypeOptions.Images
  if (ImagePicker?.MediaTypeOptions?.Images) {
    return { mediaTypes: ImagePicker.MediaTypeOptions.Images };
  }
  // Variantes intermedias: ImagePicker.MediaType.Images (o array)
  if (ImagePicker?.MediaType?.Images) {
    // Algunas versiones esperan un array, otras un valor directo. Intentamos usar array.
    return { mediaTypes: [ImagePicker.MediaType.Images] };
  }
  // No hay mediaTypes seguro -> devolvemos vacío (fallback)
  return {};
}
/**
 * Abre el selector de imagenes de forma robusta y sube la primera imagen seleccionada.
 * Reintenta sin mediaTypes si la llamada inicial falla por tipos.
 */
const pickAndUploadImage = async (eventoId) => {
  try {
    const baseOptions = {
      allowsMultipleSelection: true,
      allowsEditing: true,
      quality: 0.8,
    };

    const mediaOpt = getMediaTypesOption();
    let result;

    // Intentamos la llamada con la opción detectada (si la hay)
    try {
      result = await ImagePicker.launchImageLibraryAsync({ ...baseOptions, ...mediaOpt });
    } catch (err) {
      console.warn("launchImageLibraryAsync con mediaTypes falló, reintentando sin mediaTypes:", err);
      // Fallback: reintentar sin mediaTypes (más compatible)
      result = await ImagePicker.launchImageLibraryAsync(baseOptions);
    }

    if (!result) {
      Alert.alert("Error", "No se obtuvo resultado del selector");
      return;
    }

    if (result.canceled) return;

    // Dependiendo de la versión, el asset puede venir con .type o .mediaType.
    // Filtramos por lo que tenga tipo 'image' (por seguridad)
    const assets = Array.isArray(result.assets) ? result.assets : [result];
    const images = assets.filter(a =>
      a.type === "image" || a.mediaType === "image" || (a.uri && /\.(jpe?g|png|gif|webp|heic)$/i.test(a.uri))
    );

    if (images.length === 0) {
      Alert.alert("Selecciona una imagen", "No se seleccionó ninguna imagen válida.");
      return;
    }

    const file = images[0]; // el primer asset válido
    console.log("FILE SELECCIONADO:", file);

    // Normalizar campos para handleImageUpload
    const normalizedFile = {
      uri: file.uri,
      name: file.fileName || file.name || `image_${Date.now()}.jpg`,
      type: file.type || "image/jpeg",
    };

    // Llama tu función que sube al backend (Django) o al flow que uses
    const url = await handleImageUpload(eventoId, normalizedFile);

    if (url) {
      // Actualiza estado con la URL devuelta si quieres mostrar preview
      setFormData(prev => ({
        ...prev,
        imagenesTemp: [...(prev.imagenesTemp || []), url],
      }));
    }

    Alert.alert("Éxito", "Imagen subida correctamente");
  } catch (err) {
    console.error("pickAndUploadImage error:", err);
    Alert.alert("Error", err.message || "Error al seleccionar/subir la imagen");
  }
};


const handleImageUpload = async (eventoId, file) => {
  
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name || `image_${Date.now()}.jpg`,
    type: "image/jpeg",
  });

  const res = await api.post(`api/eventos/${eventoId}/imagenes/`, {
    formData
  });

  const data = await res.data;

  console.log("Data:",data)
  if (!res.ok) throw new Error(data.error);
  return data.url;
};


// const fetchCoordinatesOSM = async (address) => {
//   try {
//     const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
//     const response = await fetch(url, {
//       headers: {
//         'User-Agent': 'RumbaApp/1.0 (noreplyrumbaccs@gmail.com)' // obligatorio para Nominatim
//       }
//     });
//     const data = await response.json();
//     if (data && data.length > 0) {
//       const { lat, lon } = data[0];
//       return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
//     } else {
//       console.warn('No se encontraron coordenadas para', address);
//       return null;
//     }
//   } catch (error) {
//     console.error('Error al obtener coordenadas OSM:', error);
//     return null;
//   }
// };

const searchAddress = async (query) => {
    if (!query || query.trim() === "") return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=VE&limit=5`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RumbaApp/1.0 (noreplyrumbaccs@gmail.com)'
      }
    });

    const data = await response.json();

    return data.map((item) => {
      const addr = item.address || {};

      // Prioridad para sitio específico
      const site =
        addr.house ||
        addr.building ||
        addr.attraction ||
        addr.amenity ||
        addr.tourism ||
        addr.leisure ||
        addr.historic ||
        addr.shop ||
        '';

      const road = addr.road || addr.pedestrian || '';
      const suburb = addr.suburb || addr.neighbourhood || '';
      const city = addr.city || addr.town || addr.village || '';

      // Combinar solo los que existan
      const name = [site, road, suburb, city].filter(Boolean).join(', ');

      return {
        name,                  // "Edificio XYZ, Avenida Urdaneta, La Candelaria, Caracas"
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };
    });

  } catch (error) {
    console.error("Error buscando dirección:", error);
    return [];
  }
};

useEffect(() => {
  const delayDebounce = setTimeout(async () => {
    if (!searchQuery || searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }

    try {
      const results = await searchAddress(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.log("Error fetch dentro de useEffect:", e);
      setSearchResults([]);
    }
  }, 500); // 500ms debounce

  return () => clearTimeout(delayDebounce);
}, [searchQuery]);


  const renderCategoriaModal = () => (
    <Modal
      visible={categoriaModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setCategoriaModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Categoría</Text>
            <TouchableOpacity onPress={() => setCategoriaModalVisible(false)}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>
          
          {/* Barra de búsqueda */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Buscar categoría..."
              placeholderTextColor="#64748b"
              value={categoriaSearchText}
              onChangeText={setCategoriaSearchText}
            />
          </View>

          {/* Categorías disponibles */}
          <FlatList
            data={categoriasFiltradas}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  formData.categoria.includes(item) && styles.selectedModalItem
                ]}
                onPress={() => {
                  let newCategorias = [...formData.categoria];
                  if (newCategorias.includes(item)) {
                    // Remover si ya está seleccionada
                    newCategorias = newCategorias.filter(cat => cat !== item);
                  } else {
                    // Agregar si no está seleccionada y no se ha alcanzado el límite
                    if (newCategorias.length < 6) {
                      newCategorias.push(item);
                    } else {
                      Alert.alert('Límite alcanzado', 'Solo puedes seleccionar hasta 6 categorías');
                      return;
                    }
                  }
                  setFormData({ ...formData, categoria: newCategorias });
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  formData.categoria.includes(item) && styles.selectedModalItemText
                ]}>
                  {item}
                </Text>
                {formData.categoria.includes(item) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptySearchContainer}>
                <Text style={styles.emptySearchText}>No se encontraron categorías</Text>
                <Text style={styles.emptySearchSubtext}>Intenta con otros términos</Text>
              </View>
            }
          />

          {/* Información de selección */}
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionInfoText}>
              Seleccionadas: {formData.categoria.length}/6
            </Text>
            <Text style={styles.selectionInfoSubtext}>
              Mínimo 1, máximo 6 categorías
            </Text>
          </View>

          {/* Botón de confirmar */}
          <TouchableOpacity 
            style={[
              styles.confirmButton,
              formData.categoria.length === 0 && styles.confirmButtonDisabled
            ]}
            onPress={() => {
              if (formData.categoria.length > 0) {
                setCategoriaModalVisible(false);
                setCategoriaSearchText('');
              } else {
                Alert.alert('Error', 'Debes seleccionar al menos una categoría');
              }
            }}
            disabled={formData.categoria.length === 0}
          >
            <Text style={styles.confirmButtonText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderVestimentaModal = () => (
    <Modal
      visible={vestimentaModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setVestimentaModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Código de Vestimenta</Text>
            <TouchableOpacity onPress={() => setVestimentaModalVisible(false)}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={codigosVestimenta}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setFormData({ ...formData, codigoVestimenta: item });
                  setVestimentaModalVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderEdadModal = () => (
    <Modal
      visible={edadModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setEdadModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edad Mínima Permitida</Text>
            <TouchableOpacity onPress={() => setEdadModalVisible(false)}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>
          <FlatList
    data={edadesMinimas}
    keyExtractor={(item) => `${item.label}-${item.value}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
      const next = { ...formData, edad_minima: item.value, edadMinima: item.label };
      setFormData(next);
      console.log('edadMinima seleccionada:', next.edad_minima, next.edadMinima);
                  setEdadModalVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
 const renderUbicacionModal = () => (
  <Modal
    visible={ubicacionModalVisible}
    transparent
    animationType="slide"
    onRequestClose={() => setUbicacionModalVisible(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Seleccionar Ubicación</Text>
          <TouchableOpacity onPress={() => setUbicacionModalVisible(false)}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Input estilo "barra de dirección Yummy" */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Ingresa una dirección..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery} // ahora solo actualiza el estado, el useEffect hace fetch
          />
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Resultados de búsqueda */}
        <ScrollView style={{ maxHeight: 200, marginTop: 10 }}>
          {searchResults.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.locationOption}
              onPress={() => {
                setFormData({
                  ...formData,
                  ubicacion: item.name,
                  latitude: item.latitude,
                  longitude: item.longitude,
                });
                setUbicacionModalVisible(false);
                setSearchQuery(''); // limpiar input después de seleccionar
                setSearchResults([]); // limpiar sugerencias
              }}
            >
              <Text style={styles.locationOptionText}>📍 {item.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

  // const renderUbicacionModal = () => (
  //   <Modal
  //     visible={ubicacionModalVisible}
  //     transparent
  //     animationType="slide"
  //     onRequestClose={() => setUbicacionModalVisible(false)}
  //   >
  //     <View style={styles.modalOverlay}>
  //       <View style={styles.modalContent}>
  //         <View style={styles.modalHeader}>
  //           <Text style={styles.modalTitle}>Seleccionar Ubicación</Text>
  //           <TouchableOpacity onPress={() => setUbicacionModalVisible(false)}>
  //             <Text style={styles.closeButton}>×</Text>
  //           </TouchableOpacity>
  //         </View>
          
  //         {/* Simulación de Google Maps */}
  //         <View style={styles.mapContainer}>
  //           <View style={styles.mapPlaceholder}>
  //             <Text style={styles.mapPlaceholderText}>🗺️</Text>
  //             <Text style={styles.mapPlaceholderText}>Google Maps</Text>
  //             <Text style={styles.mapPlaceholderText}>Selecciona ubicación</Text>
  //           </View>
            
  //           <View style={styles.searchContainer}>
  //             <TextInput
  //               style={styles.searchInput}
  //               placeholder="Buscar ubicación..."
  //               placeholderTextColor="#64748b"
  //               value={formData.ubicacion}
  //               onChangeText={(text) => setFormData({...formData, ubicacion: text})}
  //             />
  //             <TouchableOpacity style={styles.searchButton}>
  //               <Text style={styles.searchButtonText}>🔍</Text>
  //             </TouchableOpacity>
  //           </View>
            
  //           <View style={styles.locationOptions}>
  //             <TouchableOpacity 
  //               style={styles.locationOption}
  //               onPress={() => {
  //                 setFormData({...formData, ubicacion: 'Estadio Nacional, Santiago'});
  //                 setUbicacionModalVisible(false);
  //               }}
  //             >
  //               <Text style={styles.locationOptionText}>📍 Estadio Nacional, Santiago</Text>
  //             </TouchableOpacity>
  //             <TouchableOpacity 
  //               style={styles.locationOption}
  //               onPress={() => {
  //                 setFormData({...formData, ubicacion: 'Plaza de Armas, Santiago'});
  //                 setUbicacionModalVisible(false);
  //               }}
  //             >
  //               <Text style={styles.locationOptionText}>📍 Plaza de Armas, Santiago</Text>
  //             </TouchableOpacity>
  //             <TouchableOpacity 
  //               style={styles.locationOption}
  //               onPress={() => {
  //                 setFormData({...formData, ubicacion: 'Teatro Municipal, Santiago'});
  //                 setUbicacionModalVisible(false);
  //               }}
  //             >
  //               <Text style={styles.locationOptionText}>📍 Teatro Municipal, Santiago</Text>
  //             </TouchableOpacity>
  //           </View>
  //         </View>
  //       </View>
  //     </View>
  //   </Modal>
  // );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: safeMargins.top }]}>
      <StatusBar 
        barStyle="light-content" 
        translucent={Platform.OS === 'android'}
        backgroundColor="transparent"
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: hasNotchDevice ? 8 : 12 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agregar Evento</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: safeMargins.bottom + 20 }}
      >
        <View style={[styles.content, { paddingHorizontal: safeMargins.horizontal }]}>
          <Text style={styles.title}>Crear Nuevo Evento</Text>
          
          <View style={styles.form}>
            {/* Título del evento */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Título del evento *</Text>
              <TextInput
                style={styles.input}
                value={formData.titulo}
                onChangeText={(text) => setFormData({...formData, titulo: text})}
                placeholder="Ej: Concierto de Rock"
                placeholderTextColor="#64748b"
              />
            </View>

            {/* Imagen del evento */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Imagen del evento</Text>
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={handlePickImages} // ahora solo selecciona imágenes localmente
              >
                {(formData.imagenesLocales?.length || formData.imagenesTemp?.length) > 0 ? (
                  <ScrollView horizontal>
                    {/* mostrar primero las locales (no subidas) y luego las subidas */}
                    {formData.imagenesLocales?.map((uri, index) => (
                      <View key={`local-${index}`} style={styles.imagePreviewContainer}>
                        <Image source={{ uri }} style={styles.imagePreview} resizeMode="cover" />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() =>
                            setFormData(prev => ({
                              ...prev,
                              imagenesLocales: prev.imagenesLocales.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          <Text style={styles.removeImageText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    {formData.imagenesTemp?.map((url, index) => (
                      <View key={`uploaded-${index}`} style={styles.imagePreviewContainer}>
                        <Image source={{ uri: url }} style={styles.imagePreview} resizeMode="cover" />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() =>
                            setFormData(prev => ({
                              ...prev,
                              imagenesTemp: prev.imagenesTemp.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          <Text style={styles.removeImageText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.imageUploadPlaceholder}>
                    <Text style={styles.imageUploadIcon}>📷</Text>
                    <Text style={styles.imageUploadText}>Agregar imagen</Text>
                    <Text style={styles.imageUploadSubtext}>Toca para seleccionar</Text>
                  </View>
                )}
              </TouchableOpacity>


            </View>

            {/* Categoría */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Categoría *</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setCategoriaModalVisible(true)}
              >
                <Text style={formData.categoria ? styles.selectorButtonText : styles.selectorButtonPlaceholder}>
                  {formData.categoria.length > 0 ? formData.categoria.map(cat => `${cat}, `).join('').slice(0, -2) : 'Seleccionar categoría'}
                </Text>
                <Text style={styles.selectorArrow}>▼</Text>
              </TouchableOpacity>
            </View>

                         {/* Código de vestimenta */}
             <View style={styles.inputGroup}>
               <Text style={styles.label}>Código de vestimenta</Text>
               <TouchableOpacity
                 style={styles.selectorButton}
                 onPress={() => setVestimentaModalVisible(true)}
               >
                 <Text style={formData.codigoVestimenta ? styles.selectorButtonText : styles.selectorButtonPlaceholder}>
                   {formData.codigoVestimenta || 'Seleccionar código de vestimenta'}
                 </Text>
                 <Text style={styles.selectorArrow}>▼</Text>
               </TouchableOpacity>
               
               {/* Campo de descripción de vestimenta */}
               {formData.codigoVestimenta && (
                 <View style={styles.vestimentaDescripcionContainer}>
                   <Text style={styles.sublabel}>Descripción adicional (opcional)</Text>
                   <TextInput
                     style={[styles.input, styles.textArea]}
                     value={formData.descripcionVestimenta}
                     onChangeText={(text) => setFormData({...formData, descripcionVestimenta: text})}
                     placeholder="Ej: Traje oscuro, camisa blanca, zapatos formales..."
                     placeholderTextColor="#64748b"
                     multiline
                     numberOfLines={3}
                     textAlignVertical="top"
                   />
                 </View>
               )}
             </View>

             {/* Edad mínima permitida */}
             <View style={styles.inputGroup}>
               <Text style={styles.label}>Edad mínima permitida</Text>
               <TouchableOpacity
                 style={styles.selectorButton}
                 onPress={() => setEdadModalVisible(true)}
               >
                 <Text style={formData.edadMinima ? styles.selectorButtonText : styles.selectorButtonPlaceholder}>
                   {formData.edadMinima || 'Seleccionar edad mínima'}
                 </Text>
                 <Text style={styles.selectorArrow}>🎂</Text>
               </TouchableOpacity>
             </View>

            {/* Ubicación */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ubicación *</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setUbicacionModalVisible(true)}
              >
                <Text style={formData.ubicacion ? styles.selectorButtonText : styles.selectorButtonPlaceholder}>
                  {formData.ubicacion || 'Seleccionar ubicación'}
                </Text>
                <Text style={styles.selectorArrow}>🗺️</Text>
              </TouchableOpacity>
            </View>

            {/* Capacidad del lugar */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Capacidad del lugar</Text>
              <TextInput
                style={styles.input}
                value={formData.capacidad}
                onChangeText={(text) => {
                  // Solo permitir números (sin comas)
                  const cleanText = text.replace(/[^\d]/g, '');
                  // Formatear con comas automáticamente
                  const formatted = cleanText.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  setFormData({...formData, capacidad: formatted});
                }}
                placeholder="Ej: 1,000 personas"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
              />
              {formData.capacidad && (
                <View style={styles.capacidadInfo}>
                  <Text style={styles.capacidadInfoText}>
                    📊 Capacidad: {formData.capacidad} personas
                  </Text>
                  {parseInt(formData.capacidad.replace(/,/g, '')) < 10 && (
                    <Text style={styles.capacidadError}>
                      ⚠️ La capacidad mínima es 10 personas
                    </Text>
                  )}
                  {parseInt(formData.capacidad.replace(/,/g, '')) > 50000 && (
                    <Text style={styles.capacidadError}>
                      ⚠️ La capacidad máxima es 50,000 personas
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Descripción */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción del evento</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.descripcion}
                onChangeText={(text) => setFormData({...formData, descripcion: text})}
                placeholder="Describe tu evento..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Fecha y hora del evento (FRONT) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fecha y hora del evento *</Text>
              <View style={{ flexDirection:'row', gap:12 }}>
                <TouchableOpacity
                  style={[styles.selectorButton, { flex:1 }]}
                  onPress={() => { setCalendarLoading(true); setCalendarVisible(true); setTimeout(()=>setCalendarLoading(false),400); }}
                >
                  <Text style={formData.fecha_evento_fecha ? styles.selectorButtonText : styles.selectorButtonPlaceholder}>
                    {formData.fecha_evento_fecha || 'Seleccionar fecha'}
                  </Text>
                  <Text style={styles.selectorArrow}>📅</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectorButton, { width:120 }]}
                  onPress={() => setTimePickerVisible(true)}
                >
                  <Text style={formData.fecha_evento_hora ? styles.selectorButtonText : styles.selectorButtonPlaceholder}>
                    {formData.fecha_evento_hora || 'Hora'}
                  </Text>
                  <Text style={styles.selectorArrow}>⏰</Text>
                </TouchableOpacity>
              </View>
              {(formData.fecha_evento_fecha || formData.fecha_evento_hora) && (
                <Text style={{ color:'#64748b', fontSize:12, marginTop:6 }}>
                  Selecciona fecha y hora (24h).
                </Text>
              )}
            </View>

            {/* Precio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Precio</Text>
              <View style={styles.precioOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.precioOptionButton,
                    !showPrecio && (formData.precio === 'Entrada libre') && styles.precioOptionButtonActive
                  ]}
                  onPress={() => {
                    setShowPrecio(false);
                    setFormData({ ...formData, precio: 'Entrada libre' });
                  }}
                >
                  <Text style={[
                    styles.precioOptionText,
                    !showPrecio && (formData.precio === 'Entrada libre') && styles.precioOptionTextActive
                  ]}>
                    🆓 Entrada libre
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.precioOptionButton,
                    showPrecio && styles.precioOptionButtonActive
                  ]}
                  onPress={() => {
                    const nextShow = !showPrecio;
                    setShowPrecio(nextShow);
                    if (!nextShow) {
                      // al cerrar, limpia el precio si no es entrada libre
                      if (formData.precio !== 'Entrada libre') {
                        setFormData({ ...formData, precio: '' });
                      }
                    } else {
                      if (formData.precio === 'Entrada libre') {
                        setFormData({ ...formData, precio: '', moneda: 'USD' });
                      }
                    }
                  }}
                >
                  <Text style={[
                    styles.precioOptionText,
                    showPrecio && styles.precioOptionTextActive
                  ]}>
                    💰 Precio
                  </Text>
                </TouchableOpacity>
              </View>
              {showPrecio && formData.precio !== 'Entrada libre' && (
                <View style={styles.precioInputContainer}>
                  <Text style={styles.precioInputLabel}>Ingresa el precio:</Text>
                  <View style={styles.monedaSelectorContainer}>
                    <TouchableOpacity
                      style={[styles.monedaOption, formData.moneda === 'USD' && styles.monedaOptionActive]}
                      onPress={() => setFormData({ ...formData, moneda: 'USD' })}
                    >
                      <Text style={[styles.monedaOptionText, formData.moneda === 'USD' && styles.monedaOptionTextActive]}>💵 USD</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.monedaOption, formData.moneda === 'VES' && styles.monedaOptionActive]}
                      onPress={() => setFormData({ ...formData, moneda: 'VES' })}
                    >
                      <Text style={[styles.monedaOptionText, formData.moneda === 'VES' && styles.monedaOptionTextActive]}>💰 VES</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.precioInput}
                    value={formData.precio}
                    onChangeText={(text) => {
                      const formatted = formatPrice(text);
                      setFormData({ ...formData, precio: formatted });
                    }}
                    placeholder={formData.moneda === 'USD' ? 'Ej: 25,000.00' : 'Ej: 1,250,000.00'}
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />
                  {formData.precio && formData.precio !== '0' && (
                    <View style={styles.precioFormateadoContainer}>
                      <Text style={styles.precioFormateadoText}>
                        Precio: {formData.moneda === 'USD' ? '$' : 'Bs '}{formData.precio}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={[
                styles.submitButton, 
                { 
                  height: responsiveStyles.button.height,
                  paddingHorizontal: responsiveStyles.button.paddingHorizontal,
                  borderRadius: responsiveStyles.button.borderRadius,
                  marginBottom: getBottomSafeAreaHeight() + 20
                }
              ]} 
              onPress={handleCreateEvent}
            >
              <Text style={[styles.submitButtonText, responsiveStyles.text.large]}>
                Crear Evento
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

             {/* Modales */}
       {renderCategoriaModal()}
       {renderVestimentaModal()}
       {renderEdadModal()}
       {renderUbicacionModal()}
       {timePickerVisible && (
         <DateTimePicker
           value={new Date()}
           mode="time"
           is24Hour={true}
           display={Platform.OS === 'ios' ? 'spinner' : 'default'}
           onChange={(event, selectedDate) => {
             if (Platform.OS !== 'ios') setTimePickerVisible(false);
             if (selectedDate) {
               const hh = selectedDate.getHours().toString().padStart(2,'0');
               const mm = selectedDate.getMinutes().toString().padStart(2,'0');
               setFormData({ ...formData, fecha_evento_hora: `${hh}:${mm}` });
             }
           }}
         />
       )}
       <Modal
         visible={calendarVisible}
         transparent
         animationType="fade"
         onRequestClose={() => setCalendarVisible(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={[styles.modalContent, { padding:0, overflow:'hidden' }]}> 
             <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:'#334155' }}>
               <Text style={styles.modalTitle}>Seleccionar fecha</Text>
               <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                 <Text style={styles.closeButton}>×</Text>
               </TouchableOpacity>
             </View>
             {calendarLoading ? (
               <View style={{ padding:40, alignItems:'center', justifyContent:'center' }}>
                 <ActivityIndicator size="large" color="#6366f1" />
                 <Text style={{ color:'#fff', marginTop:12 }}>Cargando...</Text>
               </View>
             ) : (
               <Calendar
                 onDayPress={(day) => {
                   setFormData({ ...formData, fecha_evento_fecha: day.dateString });
                   setCalendarVisible(false);
                 }}
                 minDate={new Date().toISOString().split('T')[0]}
                 markedDates={formData.fecha_evento_fecha ? { [formData.fecha_evento_fecha]: { selected:true, selectedColor:'#6366f1' } } : {} }
                 theme={{
                   backgroundColor: '#1e293b',
                   calendarBackground: '#1e293b',
                   dayTextColor: '#fff',
                   monthTextColor: '#fff',
                   arrowColor: '#6366f1',
                   selectedDayBackgroundColor: '#6366f1',
                   selectedDayTextColor: '#fff',
                   todayTextColor: '#0ea5e9',
                 }}
                 style={{ borderRadius:12 }}
               />
             )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    // Asegurar que el header esté por encima del status bar en Android
    elevation: Platform.OS === 'android' ? 4 : 0,
    shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : undefined,
    shadowRadius: Platform.OS === 'ios' ? 4 : undefined,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    // Asegurar que el contenido no se superponga con elementos del sistema
    paddingBottom: Platform.OS === 'ios' ? 34 : 48, // Home indicator / Navigation bar
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
  },
  selectorButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  selectorButtonPlaceholder: {
    color: '#64748b',
    fontSize: 16,
  },
  selectorArrow: {
    color: '#64748b',
    fontSize: 12,
  },
  // Estilos para imagen
  imageUploadButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageUploadPlaceholder: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  imageUploadIcon: {
    fontSize: 32,
  },
  imageUploadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageUploadSubtext: {
    color: '#64748b',
    fontSize: 14,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    // Asegurar que el botón sea accesible
    minHeight: 56,
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Estilos para modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    // Asegurar que el modal respete los márgenes seguros
    paddingTop: Platform.OS === 'ios' ? 44 : 0, // Status bar height
    paddingBottom: Platform.OS === 'ios' ? 34 : 0, // Home indicator
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    // Asegurar que el modal se adapte a diferentes tamaños de pantalla
    maxWidth: Platform.OS === 'tablet' ? 500 : '90%',
    // Añadir sombra para mejor visibilidad
    elevation: Platform.OS === 'android' ? 8 : 0,
    shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 4 } : undefined,
    shadowOpacity: Platform.OS === 'ios' ? 0.3 : undefined,
    shadowRadius: Platform.OS === 'ios' ? 8 : undefined,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Estilos para búsqueda en modal
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  emptySearchContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptySearchText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySearchSubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedModalItem: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  selectedModalItemText: {
    color: '#fff',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Estilos para el modal de ubicación
  mapContainer: {
    gap: 20,
  },
  mapPlaceholder: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  mapPlaceholderText: {
    color: '#fff',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 16,
  },
  locationOptions: {
    gap: 10,
  },
  locationOption: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  locationOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  // Estilos para opciones de precio
  precioOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  precioOptionButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  precioOptionButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  precioOptionText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  precioOptionTextActive: {
    color: '#fff',
  },
  precioInputContainer: {
    marginTop: 12,
    gap: 8,
  },
  precioInputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  precioInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  // Estilos para selector de moneda
  monedaSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  monedaOption: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monedaOptionActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  monedaOptionText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  monedaOptionTextActive: {
    color: '#fff',
  },
  // Estilos para precio formateado
  precioFormateadoContainer: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  precioFormateadoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para capacidad del lugar
  capacidadInfo: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  capacidadInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  capacidadError: {
    color: '#f59e0b', // Color de advertencia
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Estilos para selección de categorías
  selectionInfo: {
    marginTop: 16,
    alignItems: 'center',
  },
  selectionInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectionInfoSubtext: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Estilos para el campo de descripción de vestimenta
  vestimentaDescripcionContainer: {
    marginTop: 12,
  },
  sublabel: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 8,
    fontStyle: 'italic',
  },

// Estilos combinados para búsqueda de ubicación en modal
searchContainer: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#334155", // color oscuro del modal
  borderRadius: 8,
  paddingHorizontal: 10,
  marginTop: 10,
  marginBottom: 16, // mantener spacing inferior
},
searchInput: {
  flex: 1,
  backgroundColor: "#334155",
  borderWidth: 1,
  borderColor: "#475569",
  borderRadius: 8,
  padding: 12,
  color: "#fff",
  fontSize: 16,
},
searchButton: {
  backgroundColor: "#6366f1",
  padding: 12,
  borderRadius: 8,
  justifyContent: "center",
  alignItems: "center",
  marginLeft: 8,
},
searchButtonText: {
  fontSize: 16,
  color: "#fff",
},
locationOptions: {
  gap: 10,
  marginTop: 10,
},
locationOption: {
  backgroundColor: "#334155",
  padding: 16,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#475569",
},
locationOptionText: {
  color: "#fff",
  fontSize: 16,
},


});
