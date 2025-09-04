import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, Animated, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function FormularioScreen({ navigation, route }) {
  const [mostrarPin, setMostrarPin] = useState(false);
  const insets = useSafeAreaInsets();
  const topSpacer = insets.top + 8; // pequeño margen superior
  //  únicamente
  const [nombre, setNombre] = useState('');
  const [rif, setRif] = useState('');
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
  const pinRefs = useRef([]);
  const PIN_LENGTH = 6;

  const ipAddress = "192.168.0.100"; // Cambia esto por tu IP real
  
  // Simulación de PIN correcto (cambiar por valor de backend cuando esté listo)
  const PIN_CORRECTO_SIMULADO = '123456';


  
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

      const rifFormateado = /^\d{9}$/.test(rif)
        ? `J-${rif.slice(0, 8)}-${rif.slice(8)}`
        : rif;

      console.log('Rif formateado:', rifFormateado);

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

      const res = await fetch(`http://${ipAddress}:8000/api/registro-empresa/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empresaData),
      });

      // ✅ CAMBIO: Manejo seguro de la respuesta (puede no tener JSON válido)
      // 🟢 CAMBIO: verificar si la respuesta es JSON o no
      let data;
      try {
        data = await res.json();
      } catch (err) {
        console.error("Respuesta no es JSON:", err);
        data = null;
      }

      if (!res.ok) {
        Alert.alert("Error", JSON.stringify(data));
        setCargando(false);
        return;
      }

      // 🟢 CAMBIO: log para confirmar éxito
      console.log("Empresa registrada:", data);


      // ✅ CAMBIO: si llega aquí, la empresa se registró
      setCargando(false);
      setVerificado(false);
      setCorreo(empresaData.email); 
      setMostrarPin(true);


    } else {
      console.log("Token recuperado:", token);
      // 🚀 Caso 2: Usuario ya existe → crear empresa vinculada
      const rifFormateado = /^\d{9}$/.test(rif)
        ? `J-${rif.slice(0, 8)}-${rif.slice(8)}`
        : rif;

      const res = await fetch(`http://${ipAddress}:8000/api/empresas/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          rif: rifFormateado,
          lugar,
          telefono,
          nombre,
          descripcion: descripcion || "",
          email_contacto: correo,
          redes_sociales: redes || "",
          email: correo,
          password: "00000000",
        }),
      });

      // ✅ CAMBIO: Manejo seguro de la respuesta
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        console.error("Error backend:", data);
        Alert.alert("Error", data?.non_field_errors?.[0] || "No se pudo crear la empresa");
        setCargando(false);
        return;
      }

      if (data.id) {
        await AsyncStorage.setItem("empresaId", data.id.toString());
      }

      console.log("Empresa creada:", data);
      navigation.navigate("Empresa", { empresaId: data.id });

      setCargando(false);
    }
  } catch (error) {
    // 🟢 CAMBIO: mostrar error real en consola
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
  try {
    setCargando(true);
    const res = await fetch(`http://${ipAddress}:8000/api/validar-pin-empresa/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: correo,
        pin: pinIngresado,
        password: "00000000",
        empresa: {
          nombre,
          rif,
          lugar,
          telefono,
          email_contacto: correo,
          redes_sociales: redes || "",
          descripcion,
        }
      })
    });

    let data = {};
    try {
      data = await res.json();
    } catch (err) {
      data = {};
    }


    if (!res.ok) {
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
      }
      else {
        Alert.alert("Error", "No se pudo obtener el ID de la empresa");
        setCargando(false);
        return;
      }

      
      console.log("Tokens recibidos:", data.access, data.refresh);

      // Guardar tokens y datos de empresa y usuario en AsyncStorage
      await AsyncStorage.setItem('accessToken', data.access);
      await AsyncStorage.setItem('refreshToken', data.refresh);
      await AsyncStorage.setItem('empresa', JSON.stringify(data));
      if (data.usuario_id) {
        await AsyncStorage.setItem('usuarioId', data.usuario_id.toString());
      }
      Alert.alert("Registro exitoso", "¡Bienvenido! Tu empresa ha sido registrada.");
      setCargando(false);
      // Redirigir automáticamente a la pantalla principal con sesión iniciada y usuarioId
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeScreen', params: { empresaId: data.empresa.id, usuarioId: data.usuario_id } }],
      });
  } catch (error) {
    setCargando(false);
    Alert.alert("Error", "No se pudo conectar con el servidor");
  }

};


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top }}>
      <View style={styles.header} />
      <View style={styles.body}>
        {mostrarPin && !verificado ? (
          // Pantalla de PIN
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingTitle}>Se ha enviado un PIN a su correo</Text>
            <Text style={[styles.loadingText, { marginTop: 12 }]}>Por favor, coloque los números de confirmación</Text>
            {pinResendAvailable ? (
              <TouchableOpacity onPress={async () => {
                setPinResendAvailable(false);
                try {
                  const response = await fetch(`http://${ipAddress}:8000/api/reenviar-pin-empresa/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: correo })
                  });
                  const result = await response.json();
                  if (response.ok) {
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
            <View style={{ flexDirection: 'row', marginTop: 28, gap: 10 }}>
              {pinDigits.map((val, i) => (
                <TextInput
                  key={i}
                  ref={el => pinRefs.current[i] = el}
                  style={{
                    width: 44,
                    height: 56,
                    backgroundColor: '#1e293b',
                    borderRadius: 10,
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: 'bold',
                    color: '#fff',
                    borderWidth: 2,
                    borderColor: '#334155'
                  }}
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
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.enviarBtn, { marginTop: 32, paddingHorizontal: 32 }]} 
              onPress={handleValidarPin}
            >
              <Text style={styles.enviarBtnText}>Confirmar PIN</Text>
            </TouchableOpacity>
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
            <View onLayout={e => registerFieldPosition('rif', e.nativeEvent.layout.y)}>
              <TextInput
                style={styles.input}
                placeholder="RIF"
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
            <TouchableOpacity style={styles.enviarBtn} onPress={handleEnviar}>
              <Text style={styles.enviarBtnText}>Enviar formulario</Text>
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
    borderRadius: 16,
    margin: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 8,
  },
  loadingTitle: {
    color: '#facc15',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
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
});
