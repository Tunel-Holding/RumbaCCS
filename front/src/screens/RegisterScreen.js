
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Dimensions, SafeAreaView, Image } from 'react-native';

import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


const { width } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [user, setUser] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [repeatPass, setRepeatPass] = useState('');


//Función para registrarse
const handleRegister = async () => {
  if (pass !== repeatPass) {
    Alert.alert('Error', 'Las contraseñas no coinciden');
    return;
  }
  if (!user.trim() || !pass.trim() || !email.trim()) {
      Alert.alert('Campos vacíos', 'Por favor completa todos los campos');
      return; // Detiene la función si faltan datos
    }

  try {
    // URL de conexión al backend para registro:
    // - Cambia '127.0.0.1:8000' por la IP local de tu backend si pruebas en red local.
    // - Si usas emulador, puedes usar '10.0.2.2' (Android) o 'localhost' si el frontend y backend están en la misma máquina.
    // - Asegúrate que el puerto (8000) coincida con el que usas en Django.
    // - Si despliegas en producción, pon el dominio público del backend.
    
  const response = await fetch('http://192.168.0.104:8000/api/register/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        nombre: user,
        password: pass,
      }),
    });

    if (response.ok) {
      Alert.alert('Registro exitoso', 'Usuario creado correctamente');
      navigation.goBack();  // Regresa a login o pantalla anterior
    } else {
      const errorData = await response.json();
      Alert.alert('Error en registro', JSON.stringify(errorData));
    }
  } catch (error) {
    Alert.alert('Error', 'No se pudo conectar con el servidor');
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
              placeholder="Email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#888"
              value={pass}
              onChangeText={setPass}
              secureTextEntry
            />
          </View>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Repetir contraseña"
              placeholderTextColor="#888"
              value={repeatPass}
              onChangeText={setRepeatPass}
              secureTextEntry
            />
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
    shadowColor: '#000',
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
    color: '#fff',
    marginRight: 8,
  },
  backText: {
    color: '#fff',
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
