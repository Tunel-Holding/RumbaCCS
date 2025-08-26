import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeMargins, getDeviceType, hasNotch } from '../utils/safeAreaUtils';
import { getResponsiveStyles, getBottomSafeAreaHeight, getTopSafeAreaHeight } from '../utils/deviceConfig';

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
    ubicacion: '',
    capacidad: '',
    descripcion: '',
    precio: '',
    moneda: 'USD',
    imagen: '',
  });
  const [showPrecio, setShowPrecio] = useState(false);

  // Estados para los modales
  const [categoriaModalVisible, setCategoriaModalVisible] = useState(false);
  const [vestimentaModalVisible, setVestimentaModalVisible] = useState(false);
  const [edadModalVisible, setEdadModalVisible] = useState(false);
  const [ubicacionModalVisible, setUbicacionModalVisible] = useState(false);
  const [categoriaSearchText, setCategoriaSearchText] = useState('');

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
    'Todas las edades',
    'Mayores de 13 años',
    'Mayores de 16 años', 
    'Mayores de 18 años',
    'Mayores de 21 años',
    'Mayores de 25 años',
    // Removido 'Solo adultos (18+)' ya que es duplicado
    'Familiar (Todas las edades)'
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

  const handleSubmit = () => {
    if (!formData.titulo || formData.categoria.length === 0 || !formData.ubicacion) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios (título, categoría y ubicación)');
      return;
    }
    // Validar precio distinto de 0 cuando se usa precio (no entrada libre)
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
      }
    }
    Alert.alert('Éxito', 'Evento agregado correctamente', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const handleImageUpload = () => {
    Alert.alert(
      'Agregar Imagen',
      'Selecciona una opción',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'URL de imagen', 
          onPress: () => {
            Alert.prompt(
              'URL de imagen',
              'Ingresa la URL de la imagen del evento:',
              [
                { text: 'Cancelar', style: 'cancel' },
                { 
                  text: 'Agregar', 
                  onPress: (url) => {
                    if (url && url.trim()) {
                      setFormData({ ...formData, imagen: url.trim() });
                    }
                  }
                }
              ],
              'plain-text',
              formData.imagen
            );
          }
        },
        { 
          text: 'Galería', 
          onPress: () => Alert.alert('Info', 'Funcionalidad de galería próximamente') 
        },
        { 
          text: 'Cámara', 
          onPress: () => Alert.alert('Info', 'Funcionalidad de cámara próximamente') 
        }
      ]
    );
  };

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
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setFormData({ ...formData, edadMinima: item });
                  setEdadModalVisible(false);
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

  const renderUbicacionModal = () => (
    <Modal
      visible={ubicacionModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setUbicacionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Ubicación</Text>
            <TouchableOpacity onPress={() => setUbicacionModalVisible(false)}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>
          
          {/* Simulación de Google Maps */}
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>🗺️</Text>
              <Text style={styles.mapPlaceholderText}>Google Maps</Text>
              <Text style={styles.mapPlaceholderText}>Selecciona ubicación</Text>
            </View>
            
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar ubicación..."
                placeholderTextColor="#64748b"
                value={formData.ubicacion}
                onChangeText={(text) => setFormData({...formData, ubicacion: text})}
              />
              <TouchableOpacity style={styles.searchButton}>
                <Text style={styles.searchButtonText}>🔍</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.locationOptions}>
              <TouchableOpacity 
                style={styles.locationOption}
                onPress={() => {
                  setFormData({...formData, ubicacion: 'Estadio Nacional, Santiago'});
                  setUbicacionModalVisible(false);
                }}
              >
                <Text style={styles.locationOptionText}>📍 Estadio Nacional, Santiago</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.locationOption}
                onPress={() => {
                  setFormData({...formData, ubicacion: 'Plaza de Armas, Santiago'});
                  setUbicacionModalVisible(false);
                }}
              >
                <Text style={styles.locationOptionText}>📍 Plaza de Armas, Santiago</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.locationOption}
                onPress={() => {
                  setFormData({...formData, ubicacion: 'Teatro Municipal, Santiago'});
                  setUbicacionModalVisible(false);
                }}
              >
                <Text style={styles.locationOptionText}>📍 Teatro Municipal, Santiago</Text>
              </TouchableOpacity>
            </View>
          </View>
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
                onPress={handleImageUpload}
              >
                {formData.imagen ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image 
                      source={{ uri: formData.imagen }} 
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => setFormData({...formData, imagen: ''})}
                    >
                      <Text style={styles.removeImageText}>×</Text>
                    </TouchableOpacity>
                  </View>
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
                placeholder="Ej: 1,000 personas (mínimo 10, máximo 50,000)"
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

            {/* Precio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Precio</Text>
              <View style={styles.precioOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.precioOptionButton,
                    formData.precio === 'Entrada libre' && styles.precioOptionButtonActive
                  ]}
                  onPress={() => {
                    setShowPrecio(false);
                    setFormData({ ...formData, precio: 'Entrada libre' });
                  }}
                >
                  <Text style={[
                    styles.precioOptionText,
                    formData.precio === 'Entrada libre' && styles.precioOptionTextActive
                  ]}>
                    🆓 Entrada libre
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.precioOptionButton,
                    showPrecio && formData.precio !== 'Entrada libre' && styles.precioOptionButtonActive
                  ]}
                  onPress={() => {
                    // Toggle del modo precio
                    if (!showPrecio) {
                      setShowPrecio(true);
                      // Reiniciar a vacío (permitir borrar sin ocultar input)
                      setFormData({ ...formData, precio: '', moneda: 'USD' });
                    } else {
                      setShowPrecio(false);
                      setFormData({ ...formData, precio: '' });
                    }
                  }}
                >
                  <Text style={[
                    styles.precioOptionText,
                    showPrecio && formData.precio !== 'Entrada libre' && styles.precioOptionTextActive
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
                      style={[
                        styles.monedaOption,
                        formData.moneda === 'USD' && styles.monedaOptionActive
                      ]}
                      onPress={() => setFormData({ ...formData, moneda: 'USD' })}
                    >
                      <Text style={[
                        styles.monedaOptionText,
                        formData.moneda === 'USD' && styles.monedaOptionTextActive
                      ]}>💵 USD</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.monedaOption,
                        formData.moneda === 'VES' && styles.monedaOptionActive
                      ]}
                      onPress={() => setFormData({ ...formData, moneda: 'VES' })}
                    >
                      <Text style={[
                        styles.monedaOptionText,
                        formData.moneda === 'VES' && styles.monedaOptionTextActive
                      ]}>💰 VES</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.precioInput}
                    value={formData.precio}
                    onChangeText={(text) => {
                      const formatted = formatPrice(text);
                      setFormData({ ...formData, precio: formatted });
                      // Eliminados console.log de cambios de precio
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
              onPress={handleSubmit}
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
});
