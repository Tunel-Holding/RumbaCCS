import React, { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { Modal } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Dimensions, SafeAreaView, Image, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const { width } = Dimensions.get('window');

// helpers/opcional: extrae el primer mensaje legible
const getFirstMessage = (err) => {
  if (!err || typeof err !== 'object') return 'Error en el registro';
  if (typeof err.detail === 'string') return err.detail;
  // Busca el primer campo con array de mensajes
  for (const key of Object.keys(err)) {
    const val = err[key];
    if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
    if (typeof val === 'string') return val; // por si viene como string
  }
  return 'Error en el registro';
};

// función de registro (no guarda tokens todavía)
// función de registro (no guarda tokens todavía)
export const registerUser = async (formData) => {
  try {
    const res = await api.post('/api/register/', formData);
    return res.data; // respuesta del backend (solo mensaje/envío de código)
  } catch (error) {
    const errData = error.response?.data || { detail: 'Error en el registro' };
    const err = new Error(getFirstMessage(errData));
    err.fields = errData;
    err.status = error.response?.status;
    throw err;
  }
};

export default function RegisterScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const topSpacer = insets.top + 8;
  const bottomSpacer = insets.bottom + 24; // espacio para no tapar botón final
  const [showEdadModal, setShowEdadModal] = useState(false);
  const [sexo, setSexo] = useState('masculino');
  const [user, setUser] = useState('');
  const [telefono, setTelefono] = useState('');
  // Fecha de nacimiento: se mantiene null hasta que el usuario seleccione una
  const [fechaNacimiento, setFechaNacimiento] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [region, setRegion] = useState('');
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [repeatPass, setRepeatPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showRepeatPass, setShowRepeatPass] = useState(false);
  const { accountType } = route.params ?? {};

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  // --- Flujo PIN (similar a FormularioScreen) ---
  const [cargando, setCargando] = useState(false); // reutilizado como paso de verificación activo
  const [verificado, setVerificado] = useState(false);
  const PIN_LENGTH = 6;
  const [pinDigits, setPinDigits] = useState(['','','','','','']);
  const pinRefs = useRef([]);
  const [pinResendAvailable, setPinResendAvailable] = useState(false);
  const [focusedPinIndex, setFocusedPinIndex] = useState(-1);

  const ESTADOS_VE = [
    'Amazonas','Anzoátegui','Apure','Aragua','Barinas','Bolívar','Carabobo','Cojedes','Delta Amacuro','Distrito Capital','Falcón','Guárico','Lara','Mérida','Miranda','Monagas','Nueva Esparta','Portuguesa','Sucre','Táchira','Trujillo','La Guaira','Yaracuy','Zulia'
  ];

  useEffect(() => {
    if (cargando) {
      setPinResendAvailable(false);
      const t = setTimeout(() => setPinResendAvailable(true), 60000); // 1 minuto para ambos tipos
      return () => clearTimeout(t);
    }
  }, [cargando]);

  const handleRegister = async () => {
    try {
      let birthday = '';
      if (fechaNacimiento instanceof Date) {
        birthday = `${fechaNacimiento.getFullYear()}-${String(fechaNacimiento.getMonth() + 1).padStart(2, '0')}-${String(fechaNacimiento.getDate()).padStart(2, '0')}`;
      }

      const newErrors = {};
      if (!user.trim()) newErrors.user = 'Este campo es obligatorio';
      if (!telefono.trim()) newErrors.telefono = 'Este campo es obligatorio';
      if (!region) newErrors.region = 'Este campo es obligatorio';
      if (!email.trim()) newErrors.email = 'Este campo es obligatorio';
      if (!pass) newErrors.pass = 'Este campo es obligatorio';
      if (!repeatPass) newErrors.repeatPass = 'Este campo es obligatorio';
      if (pass && pass.length < 8) newErrors.pass = 'Debe tener mínimo 8 caracteres';
      if (pass && repeatPass && pass !== repeatPass) newErrors.repeatPass = 'Las contraseñas no coinciden';
      if (!fechaNacimiento) newErrors.fechaNacimiento = 'Selecciona tu fecha de nacimiento';
      if (fechaNacimiento instanceof Date) {
        const hoy = new Date();
        let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
        const m = hoy.getMonth() - fechaNacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) edad--;
        if (edad < 15) newErrors.fechaNacimiento = 'Debes tener al menos 15 años';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      const formData = {
        username: user.trim(),
        phone: telefono.replace(/[^\d]/g, ''),
        birthday,
        region,
        gender: sexo,
        email: email.trim(),
        password: pass
      };

      setPinDigits(['','','','','','']);
      setVerificado(false);
      setCargando(true);
      try {
        // Solo envía el formulario y espera el PIN
        const res = await registerUser(formData);
        if (res && res.error) {
          Alert.alert('Error', res.error);
          setCargando(false);
          return;
        }
        await AsyncStorage.setItem('pending_user', JSON.stringify(formData));
        if (res && res.message) {
          Alert.alert('Verificación', res.message);
        }
        // No guardar access, refresh ni user aquí
      } catch (e) {
        setCargando(false);
        Alert.alert('Error', e.message || 'Error en el registro');
        return;
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Algo salió mal');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={{ flex: 1, width: '100%' }}>
        {/* Spacer fijo superior */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topSpacer, backgroundColor: '#0f172a', zIndex: 5 }} />
        {cargando ? (
          <View style={styles.loadingContainer}>
            <TouchableOpacity
              onPress={() => { setCargando(false); setPinDigits(['','','','','','']); }}
              style={{ alignSelf:'center', marginBottom: 14, backgroundColor: '#0ea5e9', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 18, shadowColor:'#000', shadowOpacity:0.25, shadowOffset:{width:0,height:2}, shadowRadius:6, elevation:6 }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#0f172a', fontWeight: 'bold', fontSize: 16 }}>← Volver al registro</Text>
            </TouchableOpacity>
            <Text style={styles.loadingTitle}>Verificación de correo</Text>
            <Text style={styles.pinInstructions}>Te enviamos un PIN a tu correo. Ingresa los 6 dígitos para continuar.</Text>
            {pinResendAvailable ? (
              <TouchableOpacity onPress={async () => {
                setPinResendAvailable(false);
                setPinDigits(['','','','','','']);
                try {
                  const endpoint =
                      accountType === 'empresa'
                        ? 'api/reenviar-pin-empresa/'
                        : 'api/send-verification-code/';

                  const res = await api.post(endpoint, { email });
                  const result = res.data;
                  
                  if (res.status === 200) {
                    Alert.alert('PIN enviado', result.detail || result.message || 'Se ha enviado un nuevo PIN a tu correo.');
                  } else {
                    Alert.alert('Error', result.detail || result.message || 'No se pudo reenviar el PIN.');
                  }
                } catch (err) {
                  Alert.alert('Error', err.message || 'No se pudo reenviar el PIN.');
                }
                const t2 = setTimeout(() => setPinResendAvailable(true), 60000);
              }}>
                <Text style={{ color: '#3b82f6', fontSize: 14, marginTop: 14, textDecorationLine: 'underline' }}>¿No le ha llegado el pin? Presione aquí.</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 14 }}>Puedes solicitar un nuevo pin en 1 minuto…</Text>
            )}
            <View style={styles.pinRow}>
              {pinDigits.map((val, i) => (
                <TextInput
                  key={i}
                  ref={el => pinRefs.current[i] = el}
                  style={[
                    styles.pinBox,
                    focusedPinIndex === i && styles.pinBoxFocused,
                    val && { borderColor: '#0ea5e9' }
                  ]}
                  value={val}
                  onChangeText={(txt) => {
                    const onlyNum = txt.replace(/\D/g,'');
                    const nextDigits = [...pinDigits];
                    nextDigits[i] = onlyNum.slice(-1);
                    setPinDigits(nextDigits);
                    if (onlyNum && i < PIN_LENGTH -1) {
                      pinRefs.current[i+1]?.focus();
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !pinDigits[i] && i>0) {
                      pinRefs.current[i-1]?.focus();
                    }
                  }}
                  maxLength={1}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  autoCapitalize='none'
                  onFocus={() => setFocusedPinIndex(i)}
                  onBlur={() => setFocusedPinIndex(prev => prev === i ? -1 : prev)}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.registerBtn, { marginTop: 32 }]} 
              onPress={async () => {
                const pinIngresado = pinDigits.join('');
                if (pinIngresado.length !== PIN_LENGTH) {
                  Alert.alert('PIN incompleto', 'Debe ingresar los 6 dígitos.');
                  return;
                }
                try {
                  // Verifica el PIN con el backend
                  const pendingUser = await AsyncStorage.getItem('pending_user');
                  const userData = JSON.parse(pendingUser);
                  const response = await api.post(`/api/verify-code/`, { email: userData.email, code: pinIngresado });
                  const result = response.data;
                  if (response.status !== 200) {
                    Alert.alert('PIN incorrecto', result.error || 'El PIN ingresado no es válido.');
                    return;
                  }
                  // Si el PIN es correcto, ahora crea el usuario realmente
                  const createResponse = await api.post(`/api/finalize-register/`, userData);

                  const createResult = createResponse.data;

                  if (createResponse.status < 200 || createResponse.status >= 300) {
                    Alert.alert('Error', createResult.error || 'No se pudo crear el usuario.');
                    return;
                  }
                  // Solo aquí guardar los tokens y datos del usuario
                  
                  await AsyncStorage.setItem('accessToken', createResult.access);
                  await AsyncStorage.setItem('refreshToken', createResult.refresh);
                  await AsyncStorage.setItem('userName', createResult.user.username);
                  
                  setVerificado(true);
                  setCargando(false);
                } catch (err) {
                  Alert.alert('Error', err.message || 'No se pudo verificar el PIN.');
                }
              }}
            >
              <Text style={styles.registerBtnText}>Confirmar PIN</Text>
            </TouchableOpacity>
          </View>
        ) : verificado ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.successTitle}>Su correo ha sido comprobado</Text>
            <Text style={styles.successText}>Tu registro ha sido verificado correctamente.</Text>
            <TouchableOpacity style={styles.registerBtn} onPress={async () => {
              try {
                const pending = await AsyncStorage.getItem('pending_user');
                const tokens = await AsyncStorage.getItem('pending_tokens');
                if (pending && tokens) {
                  const userObj = JSON.parse(pending);
                  const tok = JSON.parse(tokens);
                  await AsyncStorage.setItem('accessToken', tok.access);
                  await AsyncStorage.setItem('refreshToken', tok.refresh);
                  // Guardar el usuario solo si existe y es válido
                  if (userObj) {
                    await AsyncStorage.setItem('user', JSON.stringify(userObj));
                  }
                  await AsyncStorage.setItem('userName', userObj.username);
                }
              } catch(e) {}
              navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
            }}>
              <Text style={styles.registerBtnText}>Ir al inicio</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <KeyboardAvoidingView
          style={{ flex:1, width:'100%' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: topSpacer,
            paddingBottom: bottomSpacer,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.bgImageContainer}>
          <Image source={require('../../assets/register-bg.jpg')} style={styles.bgImage} resizeMode="cover" />
        </View>
  <View style={[styles.registerContainer, { marginTop: 0 }]}> 
          {/* Flecha para volver */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('AccountTypeScreen')}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>RumbaCCS</Text>
          <Text style={styles.subtitle}>¡Regístrate para continuar!</Text>
          {/* Descripción según tipo de cuenta */}
          {accountType === 'normal' ? null : (
            <Text style={{ color: '#fff', marginBottom: 12, textAlign: 'center' }}>
              Cuenta Empresa: Cuenta empresarial para publicar eventos y ser tu el que prende la rumba
            </Text>
          )}
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, errors.user && styles.inputError]}
              placeholder="Nombre de Usuario"
              placeholderTextColor="#888"
              value={user}
              onChangeText={text => { setUser(text); if (errors.user) setErrors(e => ({ ...e, user: undefined })); }}
            />
            {errors.user && <Text style={styles.errorMsg}>{errors.user}</Text>}
          </View>
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, errors.telefono && styles.inputError]}
              placeholder="Número de teléfono"
              placeholderTextColor="#888"
              value={telefono}
              onChangeText={text => { setTelefono(text); if (errors.telefono) setErrors(e => ({ ...e, telefono: undefined })); }}
              keyboardType="phone-pad"
              maxLength={15}
            />
            {errors.telefono && <Text style={styles.errorMsg}>{errors.telefono}</Text>}
          </View>
          <View style={styles.inputGroup}>
            <TouchableOpacity
              onPress={() => setShowEdadModal(true)}
              style={[styles.input, { justifyContent: 'start', flexDirection: 'row', alignItems: 'start' }]}
              activeOpacity={0.8}
            >
              <Text style={{ color: fechaNacimiento ? '#fff' : '#888', fontSize: 16 }}>
                {fechaNacimiento ? ` ${fechaNacimiento.toLocaleDateString()}` : 'Fecha de nacimiento'}
              </Text>
            </TouchableOpacity>
            {/* Modal de advertencia de edad mínima */}
            <Modal
              visible={showEdadModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowEdadModal(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.85)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 24, alignItems: 'center', maxWidth: 320 }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
                    Para registrarte debes tener al menos 15 años de edad. Selecciona tu fecha de nacimiento y asegúrate de cumplir con este requisito.
                  </Text>
                  <TouchableOpacity onPress={() => { setShowEdadModal(false); setShowDatePicker(true); }} style={{ backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 32, marginTop: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            {showDatePicker && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15,23,42,0.95)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
              }}>
                <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, elevation: 10 }}>
                  <DateTimePicker
                    value={fechaNacimiento || new Date()}
                    mode="date"
                    display={Platform.OS === 'android' ? 'calendar' : 'spinner'}
                    themeVariant="dark"
                    onChange={(event, selectedDate) => {
                      // no cerramos hasta seleccionar explícitamente (en Android se cierra solo)
                      if (Platform.OS === 'android') setShowDatePicker(false);
                      if (selectedDate) setFechaNacimiento(selectedDate);
                    }}
                    maximumDate={new Date()} // ahora permite seleccionar fechas recientes
                  />
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ marginTop: 12, alignSelf: 'center' }}>
                    <Text style={{ color: '#ec4899', fontWeight: 'bold', fontSize: 16 }}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {errors.fechaNacimiento && <Text style={styles.errorMsg}>{errors.fechaNacimiento}</Text>}
          </View>

          {/* Selector de sexo tipo radio */}
          <View style={[styles.inputGroup, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}> 
            <TouchableOpacity onPress={() => setSexo('masculino')} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 24 }}>
              <MaterialCommunityIcons name={sexo === 'masculino' ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={sexo === 'masculino' ? '#0ea5e9' : '#888'} />
              <Text style={{ color: '#fff', marginLeft: 8, fontSize: 16 }}>Masculino</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSexo('femenino')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name={sexo === 'femenino' ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={sexo === 'femenino' ? '#ec4899' : '#888'} />
              <Text style={{ color: '#fff', marginLeft: 8, fontSize: 16 }}>Femenino</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.regionSelector}
              activeOpacity={0.8}
              onPress={() => { setShowRegionModal(true); setRegionSearch(''); }}
            >
              <Text style={[styles.regionSelectorText, !region && { color: '#64748b' }]}>{region || 'Selecciona tu estado'}</Text>
              <Ionicons name={showRegionModal ? 'chevron-up' : 'chevron-down'} size={20} color='#0ea5e9' style={{ marginLeft: 8 }} />
            </TouchableOpacity>
            {errors.region && <Text style={styles.errorMsg}>{errors.region}</Text>}
          </View>

          {/* Modal selector región consistente iOS/Android */}
          {showRegionModal && (
            <Modal transparent animationType='fade' onRequestClose={() => setShowRegionModal(false)}>
              <View style={styles.regionModalOverlay}>
                <View style={styles.regionModalContent}>
                  <Text style={styles.regionModalTitle}>Selecciona tu estado</Text>
                  <TextInput
                    value={regionSearch}
                    onChangeText={setRegionSearch}
                    placeholder='Buscar...'
                    placeholderTextColor='#64748b'
                    style={styles.regionSearchInput}
                  />
                  <ScrollView style={{ maxHeight: 300, width: '100%', marginTop: 4 }} keyboardShouldPersistTaps='handled' showsVerticalScrollIndicator={false}>
                    {ESTADOS_VE.filter(e => e.toLowerCase().includes(regionSearch.toLowerCase())).map(est => (
                      <TouchableOpacity
                        key={est}
                        activeOpacity={0.9}
                        style={[styles.regionOption, est === region && styles.regionOptionActive]}
                        onPress={() => { setRegion(est); setShowRegionModal(false); if (errors.region) setErrors(e=>({...e, region: undefined})); }}
                      >
                        <Text style={styles.regionOptionText}>{est}</Text>
                        {est === region && <Ionicons name='checkmark-circle' size={20} color='#10b981' />}
                      </TouchableOpacity>
                    ))}
                    {ESTADOS_VE.filter(e => e.toLowerCase().includes(regionSearch.toLowerCase())).length === 0 && (
                      <Text style={styles.regionEmptyText}>Sin resultados</Text>
                    )}
                  </ScrollView>
                  <TouchableOpacity style={styles.regionCloseBtn} onPress={() => setShowRegionModal(false)}>
                    <Text style={styles.regionCloseText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={text => { setEmail(text); if (errors.email) setErrors(e => ({ ...e, email: undefined })); }}
              keyboardType="email-address"
            />
            {errors.email && <Text style={styles.errorMsg}>{Array.isArray(errors.email) ? errors.email[0] : errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={[styles.input, { flex: 1 }, errors.pass && styles.inputError]}
                placeholder="Contraseña"
                placeholderTextColor="#888"
                value={pass}
                onChangeText={text => { setPass(text); if (errors.pass) setErrors(e => ({ ...e, pass: undefined })); }}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12 }}>
                <Ionicons name={showPass ? 'eye-off' : 'eye'} size={24} color="#888" />
              </TouchableOpacity>
            </View>
            {errors.pass && <Text style={styles.errorMsg}>{errors.pass}</Text>}
          </View>
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={[styles.input, { flex: 1 }, errors.repeatPass && styles.inputError]} 
                placeholder="Repetir contraseña"
                placeholderTextColor="#888"
                value={repeatPass}
                onChangeText={text => { setRepeatPass(text); if (errors.repeatPass) setErrors(e => ({ ...e, repeatPass: undefined })); }}
                secureTextEntry={!showRepeatPass}
              />
              <TouchableOpacity onPress={() => setShowRepeatPass(!showRepeatPass)} style={{ position: 'absolute', right: 12 }}>
                <Ionicons name={showRepeatPass ? 'eye-off' : 'eye'} size={24} color="#888" />
              </TouchableOpacity>
            </View>
            {errors.repeatPass && <Text style={styles.errorMsg}>{errors.repeatPass}</Text>}
          </View>
          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
            <Text style={styles.registerBtnText}>Registrarse</Text>
          </TouchableOpacity>
  </View>
  </ScrollView>
  </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
  )}
      </View>
    </SafeAreaView>
  );
}

// Nueva pantalla para seleccionar tipo de cuenta
export function AccountTypeScreen({ navigation, route }) {
  const origin = route?.params?.origin; // 'home' o 'perfil'
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top }}>
      {/* Botón volver al menú principal mejorado (azul) */}
      <TouchableOpacity
        onPress={() => {
          if (origin === 'perfil') {
            navigation.navigate('Perfil');
          } else {
            navigation.navigate('HomeScreen');
          }
        }}
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 16,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#3b82f6', // Azul agradable
          paddingVertical: 12,
          paddingHorizontal: 22,
          borderRadius: 32,
          zIndex: 10,
          shadowColor: '#1e40af',
          shadowOpacity: 0.35,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
          elevation: 6,
        }}
        activeOpacity={0.9}
      >
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginRight: 8 }}>←</Text>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>Volver</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
        <View style={{
          backgroundColor: 'rgba(30,41,59,0.92)',
          borderRadius: 16,
          maxWidth: 400,
          width: width < 400 ? width - 32 : 400,
          padding: 24,
          alignItems: 'center',
          shadowColor: '#e9dbdbff',
          shadowOpacity: 0.2,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 8,
        }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#ec4899', marginBottom: 16 }}>Tipo de Cuenta</Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#2563eb',
              borderRadius: 8,
              paddingVertical: 16,
              paddingHorizontal: 24,
              marginBottom: 16,
              width: '100%',
              alignItems: 'center',
            }}
            onPress={() => navigation.navigate('RegisterScreen', { accountType: 'normal', origin })}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Cuenta Rumbera</Text>
            <Text style={{ color: '#fff', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
              Cuenta de usuario para ver eventos, calificar sitios y vivir nuevas experiencias.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#0ea5e9',
              borderRadius: 8,
              paddingVertical: 16,
              paddingHorizontal: 24,
              width: '100%',
              alignItems: 'center',
            }}
            onPress={() => navigation.navigate('FormularioScreen', { accountType: 'empresa', origin })}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Cuenta Organizadora</Text>
            <Text style={{ color: '#fff', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
              Cuenta empresarial para publicar eventos y ser tu el que prende la RUMBA.
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 20, width: '100%', backgroundColor: 'rgba(234,179,8,0.15)', borderLeftWidth: 4, borderLeftColor: '#f59e0b', padding: 12, borderRadius: 8 }}>
            <Text style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>Aviso</Text>
            <Text style={{ color: '#fde68a', fontSize: 13, lineHeight: 18 }}>
              Para tener una cuenta de empresa, se debe pasar primero por una verificación.
            </Text>
          </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bgImageContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  bgImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.35,
  },
  registerContainer: {
    backgroundColor: 'rgba(30,41,59,0.92)',
    borderRadius: 16,
    maxWidth: 400,
    width: width < 400 ? width - 32 : 400,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#e9dbdbff',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 8,
    marginTop: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backArrow: {
    fontSize: 24,
    color: '#161414ff',
    marginRight: 8,
  },
  backText: {
    color: '#171616ff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ec4899',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 16,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  forgotText: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 4,
  },
  forgotLink: {
    color: '#facc15',
    fontSize: 14,
    fontWeight: 'bold',
  },
  registerBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  registerBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  errorMsg: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 4,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  // Estilos reutilizados del flujo de PIN (similar a FormularioScreen)
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.92)',
    borderRadius: 28,
    margin: 24,
    paddingHorizontal: 40,
    paddingVertical: 56,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 12,
    width: 'auto',
    maxWidth: 480,
    alignSelf: 'center'
  },
  loadingTitle: {
    color: '#facc15',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  pinInstructions: {
    color: '#cbd5e1',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    maxWidth: 360
  },
  successTitle: {
    color: '#22c55e',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  pinRow: {
  flexDirection: 'row',
  marginTop: 36,
  width: '100%',
  maxWidth: 340,
  justifyContent: 'space-between'
  },
  pinBox: {
  width: 52,
  height: 62,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    borderWidth: 2,
    borderColor: '#334155',
    shadowColor: 'transparent'
  },
  pinBoxFocused: {
    borderColor: '#0ea5e9',
    shadowColor: '#0ea5e9',
  shadowOpacity: 0.55,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 8,
  elevation: 8,
  },
  /* ---- Region custom selector styles (added) ---- */
  regionSelector: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  regionSelectorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1
  },
  regionModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  regionModalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 22,
    padding: 22,
    width: width < 400 ? width - 40 : 380,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 14,
    alignItems: 'center'
  },
  regionModalTitle: {
    color: '#ec4899',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  regionSearchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#fff',
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  regionOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  regionOptionActive: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#0ea5e9'
  },
  regionOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 12,
    flex: 1
  },
  regionEmptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 15,
  },
  regionCloseBtn: {
    marginTop: 14,
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignSelf: 'center'
  },
  regionCloseText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
});
