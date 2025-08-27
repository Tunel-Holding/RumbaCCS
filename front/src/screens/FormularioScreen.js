import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, Animated, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function FormularioScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const topSpacer = insets.top + 8; // pequeño margen superior
  //  únicamente
  const [nombre, setNombre] = useState('');
  const [rif, setRif] = useState('');
  const [lugar, setLugar] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [redes, setRedes] = useState('');
  const [descripcion, setDescripcion] = useState(''); // si lo necesitas en actualizar
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [verificado, setVerificado] = useState(false);
  const [pinDigits, setPinDigits] = useState(['','','','','','']);
  const pinRefs = useRef([]);
  const PIN_LENGTH = 6;


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

  const pollitoAnim = useRef(new Animated.Value(0)).current;
  const ipAddress = "192.168.1.101"; // Cambia esto por tu IP real

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

  const empresaId = await AsyncStorage.getItem("empresaId");
  if (empresaId) {
    Alert.alert("Atención", "Ya tienes una empresa creada.");
    navigation.navigate("Empresa", { empresaId });
    return;
  }

  console.log("Campos validados");
  const formatearRif = (input, defaultLetter = 'J') => {
    if (!input) return null;
    const raw = String(input).trim().toUpperCase();
    const letraMatch = raw.match(/^[VEJGPC]/);
    const letra = letraMatch ? letraMatch[0] : defaultLetter;
    const soloNumeros = raw.replace(/\D/g, '');
    if (soloNumeros.length !== 9) return null;
    return `${letra}-${soloNumeros.slice(0, 8)}-${soloNumeros.slice(8)}`;
  };

  const rifFormateado = formatearRif(rif);
  if (!rifFormateado) {
    Alert.alert("Error", "Debes ingresar 9 dígitos para el RIF");
    return;
  }

  try {
    setCargando(true);
    const token = await AsyncStorage.getItem("accessToken");

    const res = await fetch(`http://${ipAddress}:8000/api/empresas/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        nombre,
        rif: rifFormateado,
        lugar,
        telefono,
        email_contacto: correo,
        redes_sociales: redes || ""
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Error backend:", data);
      Alert.alert("Error", data?.non_field_errors?.[0] || "No se pudo crear la empresa");
      return;
    }

    // Solo si todo salió bien
    if (data.id) {
      await AsyncStorage.setItem("empresaId", data.id.toString());
      await AsyncStorage.setItem("accessToken", token);
    }

    console.log("Empresa creada:", data);
    navigation.navigate("Empresa", { empresaId: data.id });

  } catch (error) {
    console.error("Error de conexión:", error);
    Alert.alert("Error", "No se pudo conectar con el servidor");
  } finally {
    setCargando(false);
  }
};


const handleActualizar = async () => {
  if (!validarCampos()) return;

    try {
      setCargando(true);
      const token = await AsyncStorage.getItem("accessToken");
      console.log("Token en fetch:", token);

      const res = await fetch(`http://${ipAddress}:8000/empresa/empresas/${empresaId}/`, {
        method: "PATCH", // o "PUT" si envías todos los campos
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre,
          rif,
          descripcion,
          lugar,
          telefono,
          email_contacto: correo,
          redes_sociales: redes
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrores(data);
      } else {
        console.log("Empresa actualizada:", data);
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error de conexión:", error);
    } finally {
      setCargando(false);
    }
  };



  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top }}>
      <View style={styles.header} />
      <View style={styles.body}>
        {cargando ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingTitle}>Se ha enviado un PIN a su correo</Text>
            <Text style={[styles.loadingText, { marginTop: 12 }]}>Por favor, coloque los números de confirmación</Text>
            {pinResendAvailable ? (
              <TouchableOpacity onPress={() => { setPinResendAvailable(false); /* reenviar ping */ const t2=setTimeout(()=>setPinResendAvailable(true),15000); }}>
                <Text style={{ color: '#3b82f6', fontSize: 14, marginTop: 14, textDecorationLine: 'underline' }}>¿No le ha llegado el ping? Presione aquí.</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 14 }}>Puedes solicitar un nuevo ping en 15 segundos…</Text>
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
              onPress={() => {
                const pinIngresado = pinDigits.join('');
                if (pinIngresado.length !== PIN_LENGTH) {
                  Alert.alert('PIN incompleto', 'Debe ingresar los 6 dígitos.');
                  return;
                }
                // Aquí se llamaría al backend para validar el PIN
                if (pinIngresado === PIN_CORRECTO_SIMULADO) {
                  setVerificado(true);
                } else {
                  Alert.alert('PIN incorrecto', 'El PIN ingresado no es válido.');
                }
              }}
            >
              <Text style={styles.enviarBtnText}>Confirmar PIN</Text>
            </TouchableOpacity>
          </View>
        ) : verificado ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.successTitle}>Su correo ha sido comprobado</Text>
            <Text style={styles.successText}>Se le enviará un correo con la respuesta a su solicitud.</Text>
            <TouchableOpacity style={styles.enviarBtn} onPress={() => navigation.navigate('HomeScreen')}>
              <Text style={styles.enviarBtnText}>Volver al inicio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={[styles.formContainer, { paddingTop: topSpacer, paddingBottom: insets.bottom + 24 }]}
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
            <TextInput
              style={styles.input}
              placeholder="Nombre de la empresa"
              placeholderTextColor="#888"
              value={nombre}
              onChangeText={text => { setNombre(text); if (errores.nombre) setErrores(e => ({ ...e, nombre: undefined })); }}
            />
            {errores.nombre && <Text style={styles.errorText}>{errores.nombre}</Text>}
            <Text style={styles.label}>RIF</Text>
            <TextInput
              style={styles.input}
              placeholder="RIF"
              placeholderTextColor="#888"
              value={rif}
              keyboardType="numeric"
              onChangeText={text => {
                // Solo permitir números
                const soloNumeros = text.replace(/[^0-9]/g, '');
                setRif(soloNumeros);
                if (errores.rif) setErrores(e => ({ ...e, rif: undefined }));
              }}
            />
            {errores.rif && <Text style={styles.errorText}>{errores.rif}</Text>}
            <Text style={styles.label}>Lugar</Text>
            <TextInput
              style={styles.input}
              placeholder="Lugar"
              placeholderTextColor="#888"
              value={lugar}
              onChangeText={text => { setLugar(text); if (errores.lugar) setErrores(e => ({ ...e, lugar: undefined })); }}
            />
            {errores.lugar && <Text style={styles.errorText}>{errores.lugar}</Text>}
            <Text style={styles.label}>Teléfono del encargado</Text>
            <TextInput
              style={styles.input}
              placeholder="Teléfono del encargado"
              placeholderTextColor="#888"
              value={telefono}
              onChangeText={text => { setTelefono(text); if (errores.telefono) setErrores(e => ({ ...e, telefono: undefined })); }}
              keyboardType="phone-pad"
            />
            {errores.telefono && <Text style={styles.errorText}>{errores.telefono}</Text>}
            <Text style={styles.label}>Correo de la empresa</Text>
            <TextInput
              style={styles.input}
              placeholder="Correo de la empresa"
              placeholderTextColor="#888"
              value={correo}
              onChangeText={text => { setCorreo(text); if (errores.correo) setErrores(e => ({ ...e, correo: undefined })); }}
              keyboardType="email-address"
            />
            {errores.correo && <Text style={styles.errorText}>{errores.correo}</Text>}
            <Text style={styles.label}>Redes sociales (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Redes sociales"
              placeholderTextColor="#888"
              value={redes}
              onChangeText={setRedes}
            />
            <TouchableOpacity style={styles.enviarBtn} onPress={handleEnviar}>
              <Text style={styles.enviarBtnText}>Enviar formulario</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

// ...existing code...

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
