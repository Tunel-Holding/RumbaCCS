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
  
  // --- Scroll y enfoque de campos (UX) ---
  const scrollRef = useRef(null);
  const fieldPositions = useRef({}); // { titulo: y, imagenes: y, ... }
  const registerFieldPosition = (key, y) => { fieldPositions.current[key] = y; };
  const scrollToField = (key) => {
    const y = fieldPositions.current[key];
    if (y != null && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTo({ y: Math.max(y - 120, 0), animated: true });
      }, 80);
    }
  };
  const [empresaId, setEmpresaId] = useState(null);
  // Estados nuevos front
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const MAX_IMAGES = 3;
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('Creando evento...');
  const MAX_DESC_CHARS = 500;
  const [errors, setErrors] = useState({});

  const getImagePickerModule = () => {
    if (Platform.OS === 'web') return null;
    try {
      return require('expo-image-picker');
    } catch (error) {
      return null;
    }
  };
  

  
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


  const handlePickImages = async () => {
  try {
    const ImagePicker = getImagePickerModule();
    if (!ImagePicker) {
      Alert.alert('Función no disponible', 'La selección de imágenes no está disponible en web.');
      return;
    }

    const currentTotal = (formData.imagenesLocales?.length || 0) + (formData.imagenesTemp?.length || 0);
    if (currentTotal >= MAX_IMAGES) {
      setErrors((prev) => ({ ...prev, imagenes: `Solo puedes agregar hasta ${MAX_IMAGES} imágenes.` }));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      ...getMediaTypesOption(),
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result || result.canceled) return;

    // result.assets es un array; guardamos solo las URIs
    const uris = (result.assets || []).map(a => a.uri).filter(Boolean);

    if (uris.length > 3) {
      return Alert.alert("Límite de imágenes", `Solo puedes seleccionar hasta ${MAX_IMAGES} imágenes por evento.`);
    }

    if (uris.length === 0) {
      setErrors((prev) => ({ ...prev, imagenes: 'El evento debe tener al menos una imagen válida.' }));
      return;
    }

    // Limitar por lote y por total restante
    const remaining = MAX_IMAGES - currentTotal;
    if (uris.length > remaining) {
      setErrors((prev) => ({ ...prev, imagenes: `Solo puedes agregar ${remaining} imagen(es) más.` }));
    }
    const toAdd = uris.slice(0, remaining);

    // Dedupe contra existentes (locales y ya subidas)
    const existingSet = new Set([...(formData.imagenesLocales || []), ...(formData.imagenesTemp || [])]);
    const uniqueToAdd = toAdd.filter(u => !existingSet.has(u));

    if (uniqueToAdd.length === 0) {
      // No hay nada nuevo que agregar
      setErrors((prev) => ({ ...prev, imagenes: 'Estas imágenes ya fueron agregadas.' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      imagenesLocales: [...(prev.imagenesLocales || []), ...uniqueToAdd],
    }));
    // limpiar error si ya se agregaron
    setErrors((prev) => ({ ...prev, imagenes: undefined }));
  } catch (err) {
    console.error("Error al seleccionar imágenes:", err);
    setErrors((prev) => ({ ...prev, imagenes: 'No se pudieron seleccionar las imágenes.' }));
  }
};


const uploadEventoImages = async (eventoId, uris, empresaId) => {
  const formData = new FormData();

  // ⬇️ Recorremos todas las imágenes y las agregamos al formData
  uris.forEach((uri, index) => {
    const filename = `image_${Date.now()}_${index}.jpg`;
    formData.append("files", {
      uri,
      name: filename,
      type: "image/jpeg", // ⚠️ si soportás png, webp, etc. conviene detectarlo dinámicamente
    });
  });

  try {
    const res = await api.post(
      `/api/empresas/${empresaId}/eventos/${eventoId}/imagenes/`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    // ✅ si todo salió bien
    return res.data.urls || [];

  } catch (error) {
    // ⚠️ Propagar el error para manejarlo como mensaje inline en el UI
    const message = error.response?.data?.error || error.message || "Error desconocido";
    throw new Error(message);
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
    // limpiar errores previos
    setErrors({});
    const empresaId = await AsyncStorage.getItem('empresaId');

  if (!empresaId) {
    setErrors((prev)=> ({ ...prev, global: 'No se ha recuperado el ID de tu empresa.' }));
    return;
  }
    const newErrors = {};
    if (!formData.titulo) newErrors.titulo = 'El título es obligatorio.';
    if (formData.categoria.length === 0) newErrors.categoria = 'Debes seleccionar al menos una categoría.';
    if (!formData.ubicacion) newErrors.ubicacion = 'La ubicación es obligatoria.';
    // Required: selección de opción de precio (Entrada libre o Precio)
    if (!(formData.precio === 'Entrada libre' || showPrecio)) {
      newErrors.precio = 'Debes seleccionar una opción de precio: Entrada libre o Precio.';
    }
    // Required: edad mínima (debe ser un número)
    if (typeof formData.edad_minima !== 'number') {
      newErrors.edad_minima = 'La edad mínima es obligatoria.';
    }
    // Required: cupos / capacidad
    if (!formData.capacidad || String(formData.capacidad).trim() === '') {
      newErrors.capacidad = 'Los cupos son obligatorios.';
    }
    // Required: vestimenta (se requiere al menos un código)
    if (!formData.codigoVestimenta || String(formData.codigoVestimenta).trim() === '') {
      newErrors.codigoVestimenta = 'La vestimenta es obligatoria.';
    }
    // Validar fecha y hora (solo front, opcional si backend lo usa)
    if (!formData.fecha_evento_fecha) newErrors.fecha = 'Debes ingresar la fecha del evento.';
    if (!formData.fecha_evento_hora) newErrors.hora = 'Debes ingresar la hora del evento.';
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (formData.fecha_evento_fecha && !fechaRegex.test(formData.fecha_evento_fecha)) {
      newErrors.fecha = 'La fecha debe tener formato YYYY-MM-DD.';
    }
    if (formData.fecha_evento_hora && !horaRegex.test(formData.fecha_evento_hora)) {
      newErrors.hora = 'La hora debe tener formato HH:MM (24h).';
    }
    const fechaISOBase = `${formData.fecha_evento_fecha}T${formData.fecha_evento_hora}:00`;
    const fechaDate = new Date(fechaISOBase);
    if (formData.fecha_evento_fecha && formData.fecha_evento_hora) {
      if (isNaN(fechaDate.getTime())) {
        newErrors.fecha = 'Fecha y hora inválidas.';
      } else if (fechaDate.getTime() < Date.now()) {
        newErrors.fecha = 'La fecha del evento debe ser futura.';
      }
    }
    // Validar precio > 0 si el modo precio está activo (showPrecio) y no es entrada libre
    if (showPrecio && formData.precio !== 'Entrada libre') {
      // moneda debe estar seleccionada
      if (!formData.moneda || (formData.moneda !== 'USD' && formData.moneda !== 'VES')) {
        newErrors.moneda = 'Selecciona una moneda válida.';
      }
      const numericPrice = parseFloat(cleanPrice(formData.precio || '0')) || 0;
      if (numericPrice <= 0) {
        newErrors.precio = 'Debes ingresar un precio mayor a 0.';
      }
    }
    
    // Validar límite de caracteres de la descripción
    const descLen = (formData.descripcion || '').length;
    if (descLen > MAX_DESC_CHARS) {
      newErrors.descripcion = `Máximo ${MAX_DESC_CHARS} caracteres. Actualmente tienes ${descLen}.`;
    }

    // Validar capacidad si se ingresó
    if (formData.capacidad) {
      const capacidadNum = parseInt(formData.capacidad.replace(/,/g, ''));
      if (capacidadNum < 10 || capacidadNum > 50000) {
        newErrors.capacidad = 'La capacidad debe estar entre 10 y 50,000 personas';
      }
    }

    // precio: si está marcado showPrecio validamos que sea > 0 (o 'Entrada libre' permitido)
    if (!newErrors.precio && showPrecio && formData.precio !== 'Entrada libre') {
      const numericPrice = parseFloat(cleanPrice(formData.precio || '0')) || 0;
      if (numericPrice <= 0) {
        newErrors.precio = 'Debes ingresar un precio mayor a 0.';
      }
    }

    // capacidad (cupos) debe ser numérico
    if (!newErrors.capacidad && formData.capacidad) {
      const capacidadNum = parseInt(String(formData.capacidad).replace(/,/g, ''), 10);
      if (isNaN(capacidadNum) || capacidadNum <= 0) {
        newErrors.capacidad = 'Ingrese un número válido de cupos.';
      }
    }


    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      // Desplazar al primer error
      const firstError = ['titulo', 'imagenes', 'categoria', 'codigoVestimenta', 'fecha', 'hora', 'precio', 'capacidad'].find(k => newErrors[k]);
      if (firstError) scrollToField(firstError);
      return;
    }
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
    promote: false, // valor por defecto, el backend decidirá si lo promueve
  };

  console.log('payload:', payload);

  

    try {
      setSubmitMsg('Creando evento...');
      setSubmitting(true);
      // 1) crear evento
      const newEvent = await createEvento(payload, empresaId);
      const eventoId = newEvent.id;
      setEventoId(eventoId);

      // 2) subir imágenes locales en un solo request
      const localImgs = formData.imagenesLocales || [];
      if (localImgs.length > 0) {
        setUploadingImages(true);
        setSubmitMsg('Subiendo imágenes...');

        try {
          // ⬇️ Usamos la nueva función de múltiples imágenes
          const uploadedUrls = await uploadEventoImages(
            eventoId,
            localImgs,
            empresaId
          );

          // actualizar estado con dedupe y respetando MAX_IMAGES
          setFormData((prev) => {
            const merged = [...(prev.imagenesTemp || []), ...(uploadedUrls || [])];
            const unique = Array.from(new Set(merged)).slice(0, MAX_IMAGES);
            return {
              ...prev,
              imagenesLocales: [],
              imagenesTemp: unique,
            };
          });

          setUploadingImages(false);
        } catch (err) {
          // Si falla el upload múltiple, backend ya habrá borrado el evento
          setUploadingImages(false);
          setSubmitting(false);
          setErrors((prev)=> ({
            ...prev,
            imagenes: err?.message || 'Falló la verificación de una imagen. El evento pudo haber sido eliminado.'
          }));
          return;
        }
      }

      setSubmitting(false);
      Alert.alert("Éxito", "Evento agregado correctamente", [
        { text: "OK", onPress: () => navigation.navigate("Empresa") },
      ]);
    } catch (e) {
      setSubmitting(false);
      setErrors((prev) => ({ ...prev, global: e.message || 'Error de red.' }));
    }
  };

/**
 * Devuelve un objeto con la propiedad mediaTypes si se detectó alguna API válida,
 * o un objeto vacío (sin mediaTypes) si no hay una opción segura.
 */
function getMediaTypesOption(ImagePicker) {
  // Preferir el API moderno: arreglo con ImagePicker.MediaType.Images
  if (ImagePicker?.MediaType?.Images) {
    return { mediaTypes: [ImagePicker.MediaType.Images] };
  }
  // Fallback legacy: algunas versiones antiguas exponen MediaTypeOptions
  if (ImagePicker?.MediaTypeOptions?.Images) {
    return { mediaTypes: ImagePicker.MediaTypeOptions.Images };
  }
  // Último recurso: no pasar mediaTypes (dejar valor por defecto de la plataforma)
  return {};
}
/**
 * Abre el selector de imagenes de forma robusta y sube la primera imagen seleccionada.
 * Reintenta sin mediaTypes si la llamada inicial falla por tipos.
 */
const pickAndUploadImage = async (eventoId) => {
  try {
    const ImagePicker = getImagePickerModule();
    if (!ImagePicker) {
      Alert.alert('Función no disponible', 'La selección de imágenes no está disponible en web.');
      return;
    }

    const baseOptions = {
      allowsMultipleSelection: true,
      allowsEditing: true,
      quality: 0.8,
    };

    const mediaOpt = getMediaTypesOption(ImagePicker);
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

      // // Prioridad para sitio específico

      // 1. Construimos la dirección ideal por partes, dando prioridad a los campos más específicos.
      const placeName = addr.amenity || addr.shop || addr.tourism || addr.leisure || addr.building || addr.house_number;
      const street = addr.road || addr.pedestrian;
      const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter;
      const city = addr.city || addr.town || addr.village;

      // 2. Combinamos las partes que existen en un array.
      const parts = [placeName, street, neighborhood, city].filter(Boolean); // Elimina partes vacías

      // 3. Creamos el nombre a partir de las partes.
      let constructedName = [...new Set(parts)].join(', '); // `new Set` para evitar duplicados (ej: "Sambil, Sambil, Caracas")

      // 4. Si el nombre construido es muy pobre (ej. solo "Caracas"), usamos el 'display_name' como fallback.
      if (parts.length <= 1 && item.display_name) {
        constructedName = item.display_name.replace(/, Venezuela$/, '').replace(/, \d{4,5}$/, ''); // Limpia el código postal y el país.
      }

      return {
        name: constructedName,                  // "Edificio XYZ, Avenida Urdaneta, La Candelaria, Caracas"
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
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);
    try {
      const results = await searchAddress(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.log("Error fetch dentro de useEffect:", e);
      setSearchResults([]);
    } finally {
      setLocationLoading(false);
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
                      // limpiar error si ahora hay alguna categoría
                      setErrors((prev)=> ({ ...prev, categoria: undefined }));
                    } else {
                      setErrors((prev)=> ({ ...prev, categoria: 'Solo puedes seleccionar hasta 6 categorías.' }));
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
            {!!errors?.categoria && (
              <Text style={styles.errorText}>{errors.categoria}</Text>
            )}
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
                setErrors((prev)=> ({ ...prev, categoria: undefined }));
              } else {
                setErrors((prev)=> ({ ...prev, categoria: 'Debes seleccionar al menos una categoría.' }));
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
            <Text style={styles.modalTitle}>Código de Vestimenta *</Text>
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

        {/* Resultados de búsqueda o loading */}
        {locationLoading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={{ color: '#fff', marginTop: 12 }}>Buscando ubicación...</Text>
          </View>
        ) : (
          searchQuery.trim().length > 0 && searchResults.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }}>
              <Text style={{ color: '#94a3b8' }}>No se encontraron resultados</Text>
              <Text style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>Prueba con otra dirección o punto de referencia</Text>
            </View>
          ) : (
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
          )
        )}
      </View>
    </View>
  </Modal>
);

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
        ref={scrollRef}
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: safeMargins.bottom + 20 }}
      >
        <View style={[styles.content, { paddingHorizontal: safeMargins.horizontal }]}>
          <Text style={styles.title}>Crear Nuevo Evento</Text>
          
          <View style={[styles.form, { marginTop: 16 }]}>
            {/* Error Global */}
            {!!errors?.global && (
              <View style={styles.globalErrorContainer}>
                <Text style={styles.globalErrorText}>{errors.global}</Text>
              </View>
            )}

            {/* Título del evento */}
            <View style={styles.inputGroup} onLayout={(e) => registerFieldPosition('titulo', e.nativeEvent.layout.y)}>
              <Text style={styles.label}>Título del evento *</Text>
              <TextInput
                style={[styles.input, !!errors?.titulo && styles.inputError]}
                value={formData.titulo}
                onChangeText={(text) => setFormData({...formData, titulo: text})}
                placeholder="Ej: Concierto de Rock"
                placeholderTextColor="#64748b"
              />
              {!!errors?.titulo && (
                <Text style={styles.errorText}>{errors.titulo}</Text>
              )}
            </View>

            {/* Imagen del evento */}
            <View style={styles.inputGroup} onLayout={(e) => registerFieldPosition('imagenes', e.nativeEvent.layout.y)}>
              <Text style={styles.label}>Imagen del evento</Text>
              {/* Si hay imágenes, no debe ser presionable: usar View para permitir deslizar */}
              {((formData.imagenesLocales?.length || 0) + (formData.imagenesTemp?.length || 0)) > 0 ? (
                <View style={[styles.imageUploadButton, !!errors?.imagenes && styles.inputError]}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    snapToInterval={132} // 120 width + 12 margin
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator
                    style={{ minHeight: 120, maxHeight: 140, paddingVertical: 8 }}
                    contentContainerStyle={{ alignItems: 'center' }}
                  >
                    {/* mostrar primero las locales (no subidas) y luego las subidas */}
                    {formData.imagenesLocales?.map((uri, index) => (
                      <View key={`local-${uri}`} style={[styles.imagePreviewContainer, { width: 120, height: 120, marginRight: 12 }]}> 
                        <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
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
                      <View key={`uploaded-${url}`} style={[styles.imagePreviewContainer, { width: 120, height: 120, marginRight: 12 }]}> 
                        <Image source={{ uri: url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
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
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.imageUploadButton, !!errors?.imagenes && styles.inputError]}
                  onPress={handlePickImages}
                >
                  <View style={styles.imageUploadPlaceholder}>
                    <Text style={styles.imageUploadIcon}>📷</Text>
                    <Text style={styles.imageUploadText}>Agregar imagen</Text>
                    <Text style={styles.imageUploadSubtext}>Toca para seleccionar</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Si ya hay imágenes y no se alcanzó el tope, mostrar botón para agregar más */}
              {((formData.imagenesLocales?.length || 0) + (formData.imagenesTemp?.length || 0)) > 0 &&
               ((formData.imagenesLocales?.length || 0) + (formData.imagenesTemp?.length || 0)) < MAX_IMAGES && (
                <TouchableOpacity
                  style={styles.addMoreButton}
                  onPress={handlePickImages}
                >
                  <Text style={styles.addMoreButtonText}>➕ Agregar más imágenes</Text>
                </TouchableOpacity>
              )}

              {!!errors?.imagenes && (
                <Text style={styles.errorText}>{errors.imagenes}</Text>
              )}


            </View>

            {/* Categoría */}
            <View style={styles.inputGroup} onLayout={(e) => registerFieldPosition('categoria', e.nativeEvent.layout.y)}>
              <Text style={styles.label}>Categoría *</Text>
              <TouchableOpacity
                style={[styles.selectorButton, !!errors?.categoria && styles.inputError]}
                onPress={() => setCategoriaModalVisible(true)}
              >
                <Text style={formData.categoria ? styles.selectorButtonText : styles.selectorButtonPlaceholder}>
                  {formData.categoria.length > 0 ? formData.categoria.map(cat => `${cat}, `).join('').slice(0, -2) : 'Seleccionar categoría'}
                </Text>
                <Text style={styles.selectorArrow}>▼</Text>
              </TouchableOpacity>
              {!!errors?.categoria && (
                <Text style={styles.errorText}>{errors.categoria}</Text>
              )}
            </View>

                         {/* Código de vestimenta */}
             <View style={styles.inputGroup} onLayout={(e) => registerFieldPosition('codigoVestimenta', e.nativeEvent.layout.y)}>
               <Text style={styles.label}>Código de vestimenta *</Text>
               <TouchableOpacity
                 style={[styles.selectorButton, !!errors?.codigoVestimenta && styles.inputError]}
                 onPress={() => setVestimentaModalVisible(true)}
               >
                 <Text style={formData.codigoVestimenta ? styles.selectorButtonText : styles.selectorButtonPlaceholder}>
                   {formData.codigoVestimenta || 'Seleccionar código de vestimenta'}
                 </Text>
                 <Text style={styles.selectorArrow}>▼</Text>
               </TouchableOpacity>
               {!!errors?.codigoVestimenta && (
                 <Text style={styles.errorText}>{errors.codigoVestimenta}</Text>
               )}
               
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
               <Text style={styles.label}>Edad mínima permitida *</Text>
               <TouchableOpacity
                 style={[styles.selectorButton, !!errors?.edad_minima && styles.inputError]}
                 onPress={() => setEdadModalVisible(true)}
               >
                 <Text style={formData.edadMinima ? styles.selectorButtonText : styles.selectorButtonPlaceholder}>
                   {formData.edadMinima || 'Seleccionar edad mínima'}
                 </Text>
                 <Text style={styles.selectorArrow}>🎂</Text>
               </TouchableOpacity>
               {!!errors?.edad_minima && (
                 <Text style={styles.errorText}>{errors.edad_minima}</Text>
               )}
             </View>

            {/* Ubicación */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ubicación *</Text>
              <TouchableOpacity
                style={[styles.selectorButton, !!errors?.ubicacion && styles.inputError]}
                onPress={() => setUbicacionModalVisible(true)}
              >
                <Text style={formData.ubicacion ? styles.selectorButtonText : styles.selectorButtonPlaceholder}>
                  {formData.ubicacion || 'Seleccionar ubicación'}
                </Text>
                <Text style={styles.selectorArrow}>🗺️</Text>
              </TouchableOpacity>
              {!!errors?.ubicacion && (
                <Text style={styles.errorText}>{errors.ubicacion}</Text>
              )}
            </View>

            {/* Capacidad del lugar */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Capacidad del lugar *</Text>
              <TextInput
                style={[styles.input, !!errors?.capacidad && styles.inputError]}
                value={formData.capacidad}
                onChangeText={(text) => {
                  // Solo permitir números (sin comas)
                  const cleanText = text.replace(/[^\d]/g, '');
                  // Formatear con comas automáticamente
                  const formatted = cleanText.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  setFormData({...formData, capacidad: formatted});
                  setErrors((prev)=> ({ ...prev, capacidad: undefined }));
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
              {!!errors?.capacidad && (
                <Text style={styles.errorText}>{errors.capacidad}</Text>
              )}
            </View>

            {/* Descripción */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción del evento</Text>
              <TextInput
                style={[styles.input, styles.textArea, !!errors?.descripcion && styles.inputError]}
                value={formData.descripcion}
                onChangeText={(text) => {
                  if ((text || '').length <= MAX_DESC_CHARS) {
                    setFormData({ ...formData, descripcion: text });
                  } else {
                    setFormData({ ...formData, descripcion: (text || '').slice(0, MAX_DESC_CHARS) });
                  }
                  setErrors((prev)=> ({ ...prev, descripcion: undefined }));
                }}
                placeholder="Describe tu evento..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {/* Contador de caracteres */}
              <Text style={{ color:'#94a3b8', fontSize:12, marginTop:4 }}>
                {(formData.descripcion?.length) || 0}/{MAX_DESC_CHARS}
              </Text>
              {!!errors?.descripcion && (
                <Text style={styles.errorText}>{errors.descripcion}</Text>
              )}
            </View>

            {/* Fecha y hora del evento (FRONT) */}
            <View style={styles.inputGroup} onLayout={(e) => registerFieldPosition('fecha', e.nativeEvent.layout.y)}>
              <Text style={styles.label}>Fecha y hora del evento *</Text>
              <View style={{ flexDirection:'row', gap:12 }}>
                <TouchableOpacity
                  style={[styles.selectorButton, { flex:1 }, !!errors?.fecha && styles.inputError]}
                  onPress={() => { setCalendarLoading(true); setCalendarVisible(true); setTimeout(()=>setCalendarLoading(false),400); }}
                >
                  <Text style={formData.fecha_evento_fecha ? styles.selectorButtonText : styles.selectorButtonPlaceholder}>
                    {formData.fecha_evento_fecha || 'Seleccionar fecha'}
                  </Text>
                  <Text style={styles.selectorArrow}>📅</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectorButton, { width:120 }, !!errors?.hora && styles.inputError]}
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
              {!!errors?.fecha && (<Text style={styles.errorText}>{errors.fecha}</Text>)}
              {!!errors?.hora && (<Text style={styles.errorText}>{errors.hora}</Text>)}
            </View>

            {/* Precio */}
            <View style={styles.inputGroup} onLayout={(e) => registerFieldPosition('precio', e.nativeEvent.layout.y)}>
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
                    setErrors((prev)=> ({ ...prev, precio: undefined }));
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
                    setErrors((prev)=> ({ ...prev, precio: undefined }));
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
                    style={[styles.precioInput, !!errors?.precio && styles.inputError]}
                    value={formData.precio}
                    onChangeText={(text) => {
                      const formatted = formatPrice(text);
                      setFormData({ ...formData, precio: formatted });
                      setErrors((prev)=> ({ ...prev, precio: undefined }));
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
                  {!!errors?.precio && (
                    <Text style={styles.errorText}>{errors.precio}</Text>
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
              , submitting && styles.submitButtonDisabled
              ]}
              disabled={submitting}
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
               setErrors((prev)=> ({ ...prev, hora: undefined }));
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
                   setErrors((prev)=> ({ ...prev, fecha: undefined }));
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

        {/* Overlay de envío */}
        <Modal visible={submitting || uploadingImages} transparent animationType="fade">
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center' }}>
            <View style={{ backgroundColor:'#1e293b', padding:24, borderRadius:12, alignItems:'center', minWidth:220 }}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={{ color:'#fff', marginTop:12, fontSize:16, fontWeight:'600', textAlign:'center' }}>
                {submitMsg || 'Procesando...'}
              </Text>
              <Text style={{ color:'#94a3b8', marginTop:4, fontSize:12, textAlign:'center' }}>Por favor espera un momento</Text>
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
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Inline errors
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  globalErrorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  globalErrorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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

  addMoreButton: {
    marginTop: 10,
    backgroundColor: '#0ea5e9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreButtonText: {
    color: '#07204a',
    fontWeight: '700',
    fontSize: 14,
  },


});
