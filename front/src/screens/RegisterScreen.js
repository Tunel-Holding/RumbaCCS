import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Modal } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Dimensions, SafeAreaView, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ipAddress = '192.168.1.101'; // Cambia esto por la IP de tu servidor

const API_URL = `http://${ipAddress}:8000/api`;

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

// función de registro
export const registerUser = async (formData) => {
  try {
    const response = await fetch(`${API_URL}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const isJson = response.headers
      ?.get('content-type')
      ?.includes('application/json');

    // Intenta parsear JSON si corresponde
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorData = payload || { detail: 'Error en el registro' };
      const err = new Error(getFirstMessage(errorData));
      // Adjunta datos útiles para el front
      err.fields = errorData;      // ej: { email: ["Este correo ya está registrado"] }
      err.status = response.status; // ej: 400
      throw err;
    }

    

    // Éxito
    const data = payload; // ya está parseado

    console.log('Registro exitoso:', data.user);

    await AsyncStorage.setItem('access', data.access);
    await AsyncStorage.setItem('refresh', data.refresh);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    return data;
  } catch (error) {
    throw error;
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
  const [fechaNacimiento, setFechaNacimiento] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [region, setRegion] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [repeatPass, setRepeatPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showRepeatPass, setShowRepeatPass] = useState(false);
  const { accountType } = route.params ?? {};

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const handleRegister = async () => {
  try {
    const birthday = fechaNacimiento instanceof Date
      ? `${fechaNacimiento.getFullYear()}-${String(fechaNacimiento.getMonth() + 1).padStart(2, '0')}-${String(fechaNacimiento.getDate()).padStart(2, '0')}`
      : (() => {
          const [d, m, y] = fechaNacimiento.split('/');
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        })();

    const newErrors = {};
    if (!user.trim()) newErrors.user = 'Este campo es obligatorio';
    if (!telefono.trim()) newErrors.telefono = 'Este campo es obligatorio';
    if (!region) newErrors.region = 'Este campo es obligatorio';
    if (!email.trim()) newErrors.email = 'Este campo es obligatorio';
    if (!pass) newErrors.pass = 'Este campo es obligatorio';
    if (!repeatPass) newErrors.repeatPass = 'Este campo es obligatorio';

    if (pass && pass.length < 8) newErrors.pass = 'Debe tener mínimo 8 caracteres';
    if (pass && repeatPass && pass !== repeatPass) newErrors.repeatPass = 'Las contraseñas no coinciden';

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

    console.log('Datos del formulario:', formData);
    const res = await registerUser(formData);
    Alert.alert('Registro exitoso', `Bienvenido ${res.user.username}`);
    console.log('Usuario registrado:', res.user.username);

    await AsyncStorage.setItem('accessToken', res.access);
    await AsyncStorage.setItem('refreshToken', res.refresh);
    await AsyncStorage.setItem('user', JSON.stringify(res.user));
    await AsyncStorage.setItem('userName', res.user.username);

    navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
  } catch (err) {
    Alert.alert('Error', err.message || 'Algo salió mal');
  }
};



  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={{ flex: 1, width: '100%' }}>
        {/* Spacer fijo superior */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topSpacer, backgroundColor: '#0f172a', zIndex: 5 }} />
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
              style={[styles.input, { justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }]}
              activeOpacity={0.8}
            >
              <Text style={{ color: fechaNacimiento ? '#fff' : '#888', fontSize: 16 }}>
                Fecha de nacimiento {fechaNacimiento ? `(${fechaNacimiento.toLocaleDateString()})` : '(ej: 01/01/2000)'}
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
                    Para registrarte debes tener al menos 18 años de edad. Selecciona tu fecha de nacimiento y asegúrate de cumplir con este requisito.
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
                    value={fechaNacimiento}
                    mode="date"
                    display={Platform.OS === 'android' ? 'calendar' : 'spinner'}
                    themeVariant="dark"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) setFechaNacimiento(selectedDate);
                    }}
                    maximumDate={(() => {
                      const today = new Date();
                      return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                    })()}
                  />
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ marginTop: 12, alignSelf: 'center' }}>
                    <Text style={{ color: '#ec4899', fontWeight: 'bold', fontSize: 16 }}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
            <View style={{ backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#0ea5e9', overflow: 'hidden' }}>
              <Picker
                selectedValue={region}
                style={{ color: '#fff', backgroundColor: '#1e293b', height: 56, paddingVertical: 8 }}
                dropdownIconColor="#fff"
                onValueChange={(itemValue) => setRegion(itemValue)}
                mode="dropdown"
              >
                <Picker.Item label="Selecciona tu estado" value="" color="#888" />
                <Picker.Item label="Amazonas" value="Amazonas" color="#000" />
                <Picker.Item label="Anzoátegui" value="Anzoátegui" color="#000" />
                <Picker.Item label="Apure" value="Apure" color="#000" />
                <Picker.Item label="Aragua" value="Aragua" color="#000" />
                <Picker.Item label="Barinas" value="Barinas" color="#000" />
                <Picker.Item label="Bolívar" value="Bolívar" color="#000" />
                <Picker.Item label="Carabobo" value="Carabobo" color="#000" />
                <Picker.Item label="Cojedes" value="Cojedes" color="#000" />
                <Picker.Item label="Delta Amacuro" value="Delta Amacuro" color="#000" />
                <Picker.Item label="Distrito Capital" value="Distrito Capital" color="#000" />
                <Picker.Item label="Falcón" value="Falcón" color="#000" />
                <Picker.Item label="Guárico" value="Guárico" color="#000" />
                <Picker.Item label="Lara" value="Lara" color="#000" />
                <Picker.Item label="Mérida" value="Mérida" color="#000" />
                <Picker.Item label="Miranda" value="Miranda" color="#000" />
                <Picker.Item label="Monagas" value="Monagas" color="#000" />
                <Picker.Item label="Nueva Esparta" value="Nueva Esparta" color="#000" />
                <Picker.Item label="Portuguesa" value="Portuguesa" color="#000" />
                <Picker.Item label="Sucre" value="Sucre" color="#000" />
                <Picker.Item label="Táchira" value="Táchira" color="#000" />
                <Picker.Item label="Trujillo" value="Trujillo" color="#000" />
                <Picker.Item label="La Guaira" value="La Guaira" color="#000" />
                <Picker.Item label="Yaracuy" value="Yaracuy" color="#000" />
                <Picker.Item label="Zulia" value="Zulia" color="#000" />
              </Picker>
            </View>
            {errors.region && <Text style={styles.errorMsg}>{errors.region}</Text>}
          </View>
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
      </View>
    </SafeAreaView>
  );
}

// Nueva pantalla para seleccionar tipo de cuenta
export function AccountTypeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top }}>
      {/* Botón volver al menú principal mejorado (azul) */}
      <TouchableOpacity
        onPress={() => navigation.navigate('HomeScreen')}
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
            onPress={() => navigation.navigate('RegisterScreen', { accountType: 'normal' })}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Cuenta Normal</Text>
            <Text style={{ color: '#fff', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
              Cuenta de usuario para ver eventos y RUMBEAR
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
            onPress={() => navigation.navigate('FormularioScreen', { accountType: 'empresa' })}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Cuenta Empresa</Text>
            <Text style={{ color: '#fff', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
              Cuenta empresarial para publicar eventos y ser tu el que prende la RUMBA
            </Text>
          </TouchableOpacity>
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
});
