import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Animated, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from '../services/api'; // ✅ Tu instancia centralizada


export default function FormularioScreen({ navigation, route }) {
  const [mostrarPin, setMostrarPin] = useState(false);
  const [focusedPinIndex, setFocusedPinIndex] = useState(-1); // para resaltar el dígito activo
  const insets = useSafeAreaInsets();
  const topSpacer = insets.top + 8; // pequeño margen superior
  //  únicamente
  const [nombre, setNombre] = useState('');
  const [rif, setRif] = useState('');
  const [rifPrefix, setRifPrefix] = useState('J'); // Prefijo seleccionado (J o V)
  const [rifDropdownOpen, setRifDropdownOpen] = useState(false); // controla menú desplegable prefijo
  const [lugar, setLugar] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [redes, setRedes] = useState('');
  // --- Redes sociales múltiples (front) ---
  const [usaRedes, setUsaRedes] = useState(null); // 'si' | 'no' | null
  const SOCIAL_OPTIONS = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'x', label: 'X (Twitter)' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'whatsapp', label: 'WhatsApp' },
  ];
  const [socialChecks, setSocialChecks] = useState({ instagram:false, facebook:false, tiktok:false, x:false, youtube:false, whatsapp:false });
  const [socialLinks, setSocialLinks] = useState({ instagram:'', facebook:'', tiktok:'', x:'', youtube:'', whatsapp:'' });
  const [descripcion, setDescripcion] = useState(''); // si lo necesitas en actualizar
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [verificado, setVerificado] = useState(false);
  const [pinDigits, setPinDigits] = useState(['','','','','','']);
  const [pinError, setPinError] = useState(false);
  const pinReady = pinDigits.every(d => d !== '');
  const pinRefs = useRef([]);
  const PIN_LENGTH = 6;
  
  const [pinResendAvailable, setPinResendAvailable] = useState(false);
  // Inicia temporizador cuando comienza 'cargando'
  useEffect(() => {
    if (cargando) {
      setPinResendAvailable(false);
      const t = setTimeout(() => setPinResendAvailable(true), 15000);
      return () => clearTimeout(t);
    }
  }, [cargando]);

  useEffect(() => {
    if (mostrarPin) {
      setPinResendAvailable(false);
      const t = setTimeout(() => setPinResendAvailable(true), 60000); // 1 minuto
      return () => clearTimeout(t);
    }
  }, [mostrarPin]);

  const pollitoAnim = useRef(new Animated.Value(0)).current;
  

  // Si viene de perfil empresa
  const empresaId = route?.params?.empresaId || null;

  useEffect(() => {
    let timeout;
    if (cargando) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pollitoAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pollitoAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
      timeout = setTimeout(() => {
        // Solo dejamos de cargar; verificado se setea tras validar PIN
        setCargando(false);
        pollitoAnim.stopAnimation();
      }, 1500);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
      pollitoAnim.stopAnimation && pollitoAnim.stopAnimation();
    };
  }, [cargando]);

  // --- Scroll y enfoque de campos (front) ---
  const scrollRef = useRef(null);
  const fieldPositions = useRef({}); // { nombre: y, rif: y, ... }
  const registerFieldPosition = (key, y) => { fieldPositions.current[key] = y; };
  const scrollToField = (key) => {
    const y = fieldPositions.current[key];
    if (y != null && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTo({ y: Math.max(y - 80, 0), animated: true });
      }, 80);
    }
  };

  // Mantener compat: elegir la primera red con link como valor para 'redes'
  useEffect(() => {
    if (usaRedes === 'si') {
      const first = SOCIAL_OPTIONS.map(o => socialChecks[o.key] && socialLinks[o.key].trim()).find(v => v && v.length > 0);
      if (first) {
        setRedes(first); // backend seguirá recibiendo 'redes'
      }
    }
  }, [usaRedes, socialChecks, socialLinks]);

  // ✅ Validación
  const validarCampos = () => {
    const nuevosErrores = {};
    if (!nombre.trim()) nuevosErrores.nombre = 'Este campo es obligatorio';
    if (!rif.trim()) nuevosErrores.rif = 'Este campo es obligatorio';
    if (!lugar.trim()) nuevosErrores.lugar = 'Este campo es obligatorio';
    if (!telefono.trim()) nuevosErrores.telefono = 'Este campo es obligatorio';
    if (!correo.trim()) nuevosErrores.correo = 'Este campo es obligatorio';
    setErrores(nuevosErrores);
    console.log("Errores de validación:", nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

const handleEnviar = async () => {
  if (!validarCampos()) return;

  try {
    setCargando(true);

    const token = await AsyncStorage.getItem("accessToken");

    const rifFormateado = /^\d{9}$/.test(rif)
        ? `${rifPrefix}-${rif.slice(0, 8)}-${rif.slice(8)}`
        : (rif ? `${rifPrefix}-${rif}` : '');

    
    console.log("Entrando a handleEnviar, token:", token);
    if (!token) {
      // 🚀 Caso 1: Registro directo como empresa
      let telefonoValido = telefono;
      if (!/^\+?\d{7,15}$/.test(telefono)) {
        telefonoValido = telefono.replace(/[^\d+]/g, "");
        if (telefonoValido.length < 7 || telefonoValido.length > 15) {
          Alert.alert(
            "Error",
            "El teléfono debe tener entre 7 y 15 dígitos y solo puede contener números y un '+' opcional."
          );
          setCargando(false);
          return;
        }
      }
      
      const empresaData = {
        nombre,
        rif: rifFormateado,
        descripcion: descripcion || "",
        lugar,
        telefono: telefonoValido,
        email_contacto: correo,
        redes_sociales: redes || "",
        email: correo,
        password: "00000000",
      };

      const res = await api.post('/api/registro-empresa/', empresaData);
      const data = res.data;

      if (!res.status || res.status >= 400) {
        Alert.alert("Error", JSON.stringify(data));
        setCargando(false);
        return;
      }

      // Mantener spinner hasta que realmente se muestre el PIN
      setVerificado(false);
      setCorreo(empresaData.email);
      setMostrarPin(true);
      // Pequeño defer para permitir render de pantalla PIN antes de ocultar spinner
      requestAnimationFrame(() => {
        setTimeout(() => setCargando(false), 150); // deja visible el loader unos ms hasta que cambia la vista
      });

    } else {
      // 🚀 Caso 2: Usuario ya existe → crear empresa vinculada (en este caso sí cerramos rápido el spinner porque no hay pantalla PIN)
      console.log("Creando empresa para usuario existente, token:");
      const res = await api.post('/api/empresas/', {
        rif: rifFormateado,
        lugar,
        telefono,
        nombre,
        descripcion: descripcion || "",
        email_contacto: correo,
        redes_sociales: redes || "",
        email: correo,
        password: "00000000",
      });

      console.log("Respuesta al crear empresa:", res);
      const data = res.data;
      if (!res.status || res.status >= 400) {
        console.error("Error backend:", data);
        Alert.alert("Error", data?.non_field_errors?.[0] || "No se pudo crear la empresa");
        setCargando(false);
        return;
      }
      if (data.id) {
        await AsyncStorage.setItem("empresaId", data.id.toString());
      }
      navigation.navigate("Empresa", { empresaId: data.id });
      setCargando(false);
    }
  } catch (error) {
    console.error("Error capturado en catch:", error);
    setCargando(false);
    Alert.alert("Error", "Error inesperado, revisa la consola");
  }
};


// Nueva función para validar el pin y crear usuario+empresa
const handleValidarPin = async () => {
  const pinIngresado = pinDigits.join('');
  if (pinIngresado.length !== PIN_LENGTH) {
    Alert.alert('PIN incompleto', 'Debe ingresar los 6 dígitos.');
    return;
  }
  if (!correo) {
  Alert.alert("Error", "El correo no está definido, vuelve a registrarte.");
  setCargando(false);
  return;
}
  const rifFormateado = /^\d{9}$/.test(rif)
        ? `${rifPrefix}-${rif.slice(0, 8)}-${rif.slice(8)}`
        : (rif ? `${rifPrefix}-${rif}` : '');
  try {
    setCargando(true);
    const res = await api.post('/api/validar-pin-empresa/', {
  email: correo,
  pin: pinIngresado,
  password: "00000000",
  empresa: {
    nombre,
    rif: rifFormateado,
    lugar,
    telefono,
    email_contacto: correo,
    redes_sociales: redes || "",
    descripcion,
  }
});

const data = res.data;

if (!res.status || res.status >= 400) {
  Alert.alert("Error", data?.detail || "No se pudo validar el pin");
  setCargando(false);
  return;
}

console.log("PIN validado y empresa creada:", data);

if (data.empresa.id) {
  await AsyncStorage.setItem("empresaId", data.empresa.id.toString());
  if (data.usuario_id) {
    await AsyncStorage.setItem("usuarioId", data.usuario_id.toString());
  }
} else {
  Alert.alert("Error", "No se pudo obtener el ID de la empresa");
  setCargando(false);
  return;
}

await AsyncStorage.setItem('accessToken', data.access);
await AsyncStorage.setItem('refreshToken', data.refresh);
await AsyncStorage.setItem('empresa', JSON.stringify(data));
if (data.usuario_id) {
  await AsyncStorage.setItem('usuarioId', data.usuario_id.toString());
}

Alert.alert("Registro exitoso", "¡Bienvenido! Tu empresa ha sido registrada.");
setCargando(false);
navigation.reset({
  index: 0,
  routes: [{ name: 'HomeScreen', params: { empresaId: data.empresa.id, usuarioId: data.usuario_id } }],
});
    
  } catch (error) {
    setCargando(false);
    // Marcar error de PIN si el backend devuelve 400/401 o respuesta esperada de PIN inválido
    setPinError(true);
  }

};


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top }}>
      <View style={styles.header} />
      <View style={styles.body}>
        {mostrarPin && !verificado ? (
          // Pantalla de PIN
          <View style={styles.loadingContainer}>
            <TouchableOpacity
              style={styles.pinBackBtn}
              onPress={() => {
                setMostrarPin(false);
                setPinError(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.pinBackArrow}>←</Text>
              <Text style={styles.pinBackText}>Volver al formulario</Text>
            </TouchableOpacity>
            {!pinError && (
              <>
                <Text style={styles.loadingTitle}>Verificación de correo</Text>
                <Text style={styles.pinInstructions}>Te enviamos un PIN a tu correo. Ingresa los 6 dígitos para continuar.</Text>
              </>
            )}
            {pinError && (
              <View style={styles.pinErrorWrapper}>
                <View style={styles.pinErrorIconCircle}>
                  <Text style={styles.pinErrorIcon}>✖</Text>
                </View>
                <Text style={styles.pinErrorTitle}>PIN incorrecto</Text>
                <Text style={styles.pinErrorSubtitle}>El código ingresado es inválido o ha expirado. Puedes intentarlo nuevamente o solicitar un nuevo PIN.</Text>
                <View style={styles.pinErrorButtonsRow}>
                  <TouchableOpacity
                    style={[styles.pinErrorBtnPrimary]}
                    onPress={() => {
                      setPinError(false);
                      setPinDigits(['','','','','','']);
                      pinRefs.current[0]?.focus();
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.pinErrorBtnPrimaryText}>Intentar de nuevo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pinErrorBtnSecondary}
                    onPress={async () => {
                      try {
                        const res = await api.post('/api/reenviar-pin-empresa/', { email: correo });
                        Alert.alert('PIN reenviado', res?.data?.detail || 'Revisa tu correo');
                        setPinError(false);
                        setPinDigits(['','','','','','']);
                        const t2 = setTimeout(() => setPinResendAvailable(true), 60000);
                        pinRefs.current[0]?.focus();
                      } catch (e) {
                        Alert.alert('Error', 'No se pudo reenviar el PIN');
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.pinErrorBtnSecondaryText}>Reenviar PIN</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.pinErrorMenuLink}
                  onPress={() => navigation.navigate('HomeScreen')}
                >
                  <Text style={styles.pinErrorMenuLinkText}>← Volver al menú</Text>
                </TouchableOpacity>
              </View>
            )}
            {!pinError && (
              <>
                {pinResendAvailable ? (
                  <TouchableOpacity onPress={async () => {
                    setPinResendAvailable(false);
                    try {
                      const res = await api.post('/api/reenviar-pin-empresa/', { email: correo });
                      const result = res.data;
                      if (res.status < 400) {
                        Alert.alert('PIN enviado', result.detail || 'Se ha enviado un nuevo PIN a tu correo.');
                      } else {
                        Alert.alert('Error', result.detail || 'No se pudo reenviar el PIN.');
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
                  style={[styles.enviarBtn, { marginTop: 32, paddingHorizontal: 32 }, (!pinReady || cargando) && styles.enviarBtnDisabled]} 
                  onPress={(pinReady && !cargando) ? handleValidarPin : undefined}
                  disabled={!pinReady || cargando}
                  activeOpacity={(pinReady && !cargando) ? 0.8 : 1}
                >
                  {cargando ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.enviarBtnText, (!pinReady) && { opacity: 0.5 }]}>Confirmar PIN</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : verificado ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.successTitle}>Registro exitoso</Text>
            <Text style={styles.successText}>¡Bienvenido! Tu empresa ha sido registrada.</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex:1, width:'100%' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={[styles.formContainer, { paddingTop: topSpacer, paddingBottom: insets.bottom + 340 }]} // padding extra para evitar solapamiento
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Botón Volver */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.navigate('AccountTypeScreen')}
            >
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backText}>Volver</Text>
            </TouchableOpacity>
            <Text style={styles.formTitle}>Formulario de empresa</Text>
            <Text style={styles.label}>Nombre de la empresa</Text>
            <View onLayout={e => registerFieldPosition('nombre', e.nativeEvent.layout.y)}>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la empresa"
                placeholderTextColor="#888"
                value={nombre}
                onChangeText={text => { setNombre(text); if (errores.nombre) setErrores(e => ({ ...e, nombre: undefined })); }}
                onFocus={() => scrollToField('nombre')}
                returnKeyType='next'
              />
            </View>
            {errores.nombre && <Text style={styles.errorText}>{errores.nombre}</Text>}
            <Text style={styles.label}>RIF</Text>
            <View style={styles.rifRow} onLayout={e => registerFieldPosition('rif', e.nativeEvent.layout.y)}>
              <View style={{ position:'relative' }}>
                <TouchableOpacity
                  style={[styles.rifPrefixSingle, rifDropdownOpen && { borderColor:'#0ea5e9' }]}
                  onPress={() => setRifDropdownOpen(o => !o)}
                  activeOpacity={0.75}
                >
                  <View style={styles.rifPrefixInnerRow}>
                    <Text style={styles.rifPrefixSingleText}>{rifPrefix}</Text>
                    <Text style={[styles.rifPrefixArrow, rifDropdownOpen && { transform:[{ rotate:'180deg'}] }]}>▼</Text>
                  </View>
                </TouchableOpacity>
                {rifDropdownOpen && (
                  <View style={styles.rifDropdownMenu}>
                    {['J','V'].map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.rifDropdownItem, opt === rifPrefix && styles.rifDropdownItemActive]}
                        onPress={() => { setRifPrefix(opt); setRifDropdownOpen(false); }}
                        activeOpacity={0.65}
                      >
                        <Text style={[styles.rifDropdownItemText, opt === rifPrefix && styles.rifDropdownItemTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <TextInput
                style={[styles.input, { flex:1, marginLeft:8 }]}
                placeholder="Número"
                placeholderTextColor="#888"
                value={rif}
                keyboardType="numeric"
                onChangeText={text => {
                  const soloNumeros = text.replace(/[^0-9]/g, '');
                  setRif(soloNumeros);
                  if (errores.rif) setErrores(e => ({ ...e, rif: undefined }));
                }}
                onFocus={() => scrollToField('rif')}
                returnKeyType='next'
              />
            </View>
            {errores.rif && <Text style={styles.errorText}>{errores.rif}</Text>}
            <Text style={styles.label}>Lugar</Text>
            <View onLayout={e => registerFieldPosition('lugar', e.nativeEvent.layout.y)}>
              <TextInput
                style={styles.input}
                placeholder="Lugar"
                placeholderTextColor="#888"
                value={lugar}
                onChangeText={text => { setLugar(text); if (errores.lugar) setErrores(e => ({ ...e, lugar: undefined })); }}
                onFocus={() => scrollToField('lugar')}
                returnKeyType='next'
              />
            </View>
            {errores.lugar && <Text style={styles.errorText}>{errores.lugar}</Text>}
            <Text style={styles.label}>Teléfono del encargado</Text>
            <View onLayout={e => registerFieldPosition('telefono', e.nativeEvent.layout.y)}>
              <TextInput
                style={styles.input}
                placeholder="Teléfono del encargado"
                placeholderTextColor="#888"
                value={telefono}
                onChangeText={text => { setTelefono(text); if (errores.telefono) setErrores(e => ({ ...e, telefono: undefined })); }}
                keyboardType="phone-pad"
                onFocus={() => scrollToField('telefono')}
                returnKeyType='next'
              />
            </View>
            {errores.telefono && <Text style={styles.errorText}>{errores.telefono}</Text>}
            <Text style={styles.label}>Correo de la empresa</Text>
            <View onLayout={e => registerFieldPosition('correo', e.nativeEvent.layout.y)}>
              <TextInput
                style={styles.input}
                placeholder="Correo de la empresa"
                placeholderTextColor="#888"
                value={correo}
                onChangeText={text => { setCorreo(text); if (errores.correo) setErrores(e => ({ ...e, correo: undefined })); }}
                keyboardType="email-address"
                autoCapitalize='none'
                onFocus={() => scrollToField('correo')}
                returnKeyType='next'
              />
            </View>
            {errores.correo && <Text style={styles.errorText}>{errores.correo}</Text>}
            <Text style={styles.label}>¿Agregar redes sociales?</Text>
            <View style={{ flexDirection:'row', marginBottom: 12 }}>
              {['si','no'].map(op => (
                <TouchableOpacity
                  key={op}
                  onPress={() => {
                    setUsaRedes(op); 
                    if (op === 'no') { setSocialChecks({ instagram:false, facebook:false, tiktok:false, x:false, youtube:false, whatsapp:false }); setSocialLinks({ instagram:'', facebook:'', tiktok:'', x:'', youtube:'', whatsapp:'' }); setRedes(''); }
                  }}
                  style={{ flexDirection:'row', alignItems:'center', marginRight: 24 }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={usaRedes === op ? 'radio-button-on' : 'radio-button-off'} size={22} color={usaRedes === op ? '#0ea5e9' : '#64748b'} />
                  <Text style={{ color:'#fff', marginLeft:6, fontSize:15, textTransform:'capitalize' }}>{op}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {usaRedes === 'si' && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ color:'#94a3b8', marginBottom: 8, fontSize:13 }}>Selecciona las redes y coloca el enlace o usuario (solo se enviará la primera con enlace válido por ahora).</Text>
                {SOCIAL_OPTIONS.map(opt => {
                  const checked = socialChecks[opt.key];
                  return (
                    <View key={opt.key} style={{ marginBottom: 10 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setSocialChecks(prev => ({ ...prev, [opt.key]: !prev[opt.key] }));
                        }}
                        style={{ flexDirection:'row', alignItems:'center' }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? '#0ea5e9' : '#64748b'} />
                        <Text style={{ color:'#fff', marginLeft:8, fontSize:15 }}>{opt.label}</Text>
                      </TouchableOpacity>
                      {checked && (
                        <View onLayout={e => registerFieldPosition(`social_${opt.key}`, e.nativeEvent.layout.y)}>
                          <TextInput
                            style={[styles.input, { marginTop:6 }]}
                            placeholder={`Enlace o usuario de ${opt.label}`}
                            placeholderTextColor="#888"
                            value={socialLinks[opt.key]}
                            onChangeText={txt => setSocialLinks(prev => ({ ...prev, [opt.key]: txt }))}
                            autoCapitalize='none'
                            onFocus={() => scrollToField(`social_${opt.key}`)}
                            returnKeyType='done'
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
            {/* Campo original eliminado: se mantiene solo la sección de agregar redes sociales */}
            <TouchableOpacity
              style={[styles.enviarBtn, cargando && styles.enviarBtnDisabled, { justifyContent: 'center', alignItems: 'center' }]} 
              onPress={cargando ? undefined : handleEnviar}
              disabled={cargando}
              activeOpacity={cargando ? 1 : 0.85}
            >
              {cargando ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.enviarBtnText}>Enviar formulario</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  empresaBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  empresaBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  body: {
    flex: 1,
    // Dejamos que el scroll ocupe todo y se inicie desde arriba
    alignItems: 'center',
    width: '100%',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'stretch',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(30,41,59,0.92)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 8,
  },
  formTitle: {
    color: '#ec4899',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 12,
    fontSize: 15,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    marginBottom: 4,
  },
  enviarBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  enviarBtnDisabled: {
    backgroundColor: '#1e3a8a'
  },
  enviarBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 2,
    marginLeft: 2,
    fontWeight: 'bold',
  },
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
  letterAnimOnly: {
    fontSize: 54,
    textAlign: 'center',
    marginBottom: 8,
    width: 60,
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 12,
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
  // --- PIN Error redesigned ---
  pinErrorWrapper: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 9,
    borderWidth: 1,
    borderColor: '#334155'
  },
  pinErrorIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(239,68,68,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  pinErrorIcon: { fontSize: 34, color: '#ef4444', fontWeight: 'bold' },
  pinErrorTitle: { fontSize: 22, fontWeight: 'bold', color: '#ef4444', marginBottom: 8, textAlign: 'center' },
  pinErrorSubtitle: { fontSize: 15, color: '#cbd5e1', textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  pinErrorButtonsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 12 },
  pinErrorBtnPrimary: { flex:1, backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowColor:'#000', shadowOpacity:0.25, shadowOffset:{width:0,height:2}, shadowRadius:4, elevation:4 },
  pinErrorBtnPrimaryText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  pinErrorBtnSecondary: { flex:1, backgroundColor: '#6366f1', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowColor:'#000', shadowOpacity:0.2, shadowOffset:{width:0,height:2}, shadowRadius:4, elevation:4 },
  pinErrorBtnSecondaryText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  pinErrorMenuLink: { marginTop: 20 },
  pinErrorMenuLinkText: { color: '#94a3b8', fontSize: 14, textDecorationLine: 'underline' },
  pinBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center',
    marginBottom: 18
  },
  pinBackArrow: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginRight: 6, marginTop: -1 },
  pinBackText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  // --- Estilos PIN alineados con RegisterScreen ---
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
  // --- RIF prefix selector ---
  rifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rifPrefixGroup: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden'
  },
  rifPrefixOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rifPrefixOptionActive: {
    backgroundColor: '#0ea5e9'
  },
  rifPrefixText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
  },
  rifPrefixTextActive: {
    color: '#fff'
  },
  // Nuevo selector sencillo (toggle) para prefijo RIF
  rifPrefixSingle: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  },
  rifPrefixSingleText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5
  },
  rifPrefixInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  rifPrefixArrow: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  rifDropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    width: 70,
    zIndex: 20,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 10
  },
  rifDropdownItem: {
    paddingVertical: 8,
    alignItems: 'center'
  },
  rifDropdownItemActive: {
    backgroundColor: 'rgba(14,165,233,0.18)'
  },
  rifDropdownItemText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600'
  },
  rifDropdownItemTextActive: {
    color: '#0ea5e9'
  },
});
