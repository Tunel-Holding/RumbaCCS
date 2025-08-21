import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, ScrollView, Animated, Alert } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function FormularioScreen({ navigation, route }) {
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
        setCargando(false);
        setVerificado(true);
        pollitoAnim.stopAnimation();
      }, 5000);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={styles.header} />
      <View style={styles.body}>
        {cargando ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingTitle}>Verificando información...</Text>
            <Animated.View style={{
              marginVertical: 32,
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
              height: 60,
              overflow: 'hidden',
              // El ancho de movimiento se ajusta a la pantalla
              transform: [{ translateX: pollitoAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }) }],
            }}>
              <Text style={styles.letterAnimOnly}>✉️</Text>
            </Animated.View>
            <Text style={styles.loadingText}>Por favor espera mientras verificamos tu formulario.</Text>
          </View>
        ) : verificado ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.successTitle}>¡Formulario enviado con éxito!</Text>
            <Text style={styles.successText}>Tu información fue verificada correctamente.</Text>
            <TouchableOpacity style={styles.enviarBtn} onPress={() => {
              setVerificado(false);
              setNombre(''); setRif(''); setLugar(''); setTelefono(''); setCorreo(''); setRedes(''); setErrores({});
              navigation.navigate('Empresa');
            }}>
              <Text style={styles.enviarBtnText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.formContainer}>
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
    justifyContent: 'center',
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
    padding: 24,
    backgroundColor: 'rgba(30,41,59,0.92)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 8,
    marginTop: 40,
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
});
