import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Modal } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Dimensions, SafeAreaView, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ipAddress = '192.168.1.101'; // Cambia esto por la IP de tu servidor

const API_URL = `http://${ipAddress}:8000/api`;

//funcion de registro
export const registerUser = async (formData) => {
  try {
    const response = await fetch(`${API_URL}/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log('Error backend completo:', errorData);
      throw new Error(errorData.detail || 'Error en el registro');
    }

    const data = await response.json();

    await AsyncStorage.setItem('access', data.access);
    await AsyncStorage.setItem('refresh', data.refresh);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error('Error en registerUser:', error);
    throw error;
  }
};



export default function RegisterScreen({ navigation }) {
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

const handleRegister = async () => {
  try {

    const birthday = fechaNacimiento instanceof Date
    ? `${fechaNacimiento.getFullYear()}-${String(fechaNacimiento.getMonth() + 1).padStart(2, '0')}-${String(fechaNacimiento.getDate()).padStart(2, '0')}`
    : (() => {
        const [d, m, y] = fechaNacimiento.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      })();


    const payload = {
      username: user.trim(),
      phone: telefono.replace(/[^\d]/g, ''),
      birthday,
      region,
      gender: sexo,
      email: email.trim(),
      password: pass
    };

    if (!user.trim() || !email.trim() || !pass) {
      Alert.alert('Campos incompletos', 'Por favor llena usuario, email y contraseña');
      return;
    }

    if (!region) {
      Alert.alert('Campo requerido', 'Selecciona tu estado antes de continuar');
      return;
    }

    if (pass.length < 8) {
      Alert.alert('Contraseña', 'Debe tener mínimo 8 caracteres');
      return;
    }

    if (pass !== repeatPass) {
      Alert.alert('Contraseña', 'Las contraseñas no coinciden');
      return;
    }

    // Usamos el mismo birthday formateado en dd/mm/aaaa para enviar
    const formData = {
      username: user.trim(),
      phone: telefono.replace(/[^\d]/g, ''),
      birthday, // <-- aquí ya va dd/mm/aaaa
      region,
      gender: sexo,
      email: email.trim(),
      password: pass
    };
    const res = await registerUser(formData);
    Alert.alert('Registro exitoso', `Bienvenido ${res.user.username}`);
  } catch (err) {
    console.error('Error en handleRegister:', err);
    Alert.alert('Error', err.message || 'Algo salió mal');
  }
};



  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={styles.bgImageContainer}>
          <Image source={require('../../assets/register-bg.jpg')} style={styles.bgImage} resizeMode="cover" />
        </View>
        <View style={styles.registerContainer}>
          {/* Flecha para volver */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>RumbaCCS</Text>
          <Text style={styles.subtitle}>¡Regístrate para continuar!</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Nombre de Usuario"
              placeholderTextColor="#888"
              value={user}
              onChangeText={setUser}
            />
          </View>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Número de teléfono"
              placeholderTextColor="#888"
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
              maxLength={15}
            />
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
          </View>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Contraseña"
                placeholderTextColor="#888"
                value={pass}
                onChangeText={setPass}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12 }}>
                <Ionicons name={showPass ? 'eye-off' : 'eye'} size={24} color="#888" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Repetir contraseña"
                placeholderTextColor="#888"
                value={repeatPass}
                onChangeText={setRepeatPass}
                secureTextEntry={!showRepeatPass}
              />
              <TouchableOpacity onPress={() => setShowRepeatPass(!showRepeatPass)} style={{ position: 'absolute', right: 12 }}>
                <Ionicons name={showRepeatPass ? 'eye-off' : 'eye'} size={24} color="#888" />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
            <Text style={styles.registerBtnText}>Registrarse</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
});
