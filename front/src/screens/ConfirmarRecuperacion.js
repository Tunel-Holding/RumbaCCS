import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../services/api';

function ConfirmarRecuperacion({ email, navigation }) { // ← recibe navigation
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async () => {
    setEnviando(true);
    setMensaje('');
    try {
      await api.post('/api/password-reset/confirm/', {
        email,
        code,
        password,
        password2,
      });
      setMensaje('¡Contraseña cambiada correctamente!');
      setTimeout(() => {
        navigation.navigate('HomeScreen'); // ← Aquí navegas a la pantalla principal
      }, 1200);
    } catch (err) {
      setMensaje('Error: ' + (err.response?.data?.error || 'Intenta de nuevo.'));
    }
    setEnviando(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <Text style={styles.label}>Código recibido</Text>
        <TextInput
          placeholder="Ingresa el código"
          placeholderTextColor="#9ca3af"
          value={code}
          onChangeText={setCode}
          editable={!enviando}
          style={styles.input}
        />

        <Text style={styles.label}>Nueva contraseña</Text>
        <TextInput
          placeholder="Nueva contraseña"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!enviando}
          style={styles.input}
        />

        <Text style={styles.label}>Repetir contraseña</Text>
        <TextInput
          placeholder="Repetir contraseña"
          placeholderTextColor="#9ca3af"
          value={password2}
          onChangeText={setPassword2}
          secureTextEntry
          editable={!enviando}
          style={styles.input}
        />

        <TouchableOpacity style={[styles.button, enviando ? styles.buttonDisabled : null]} onPress={handleSubmit} disabled={enviando} activeOpacity={0.85}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cambiar contraseña</Text>}
        </TouchableOpacity>

        {mensaje ? (
          <Text style={[styles.message, mensaje.includes('Error') ? styles.messageError : styles.messageSuccess]}>{mensaje}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { padding: 16 },
  card: {
    backgroundColor: '#0b1220',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#111827',
  },
  label: {
    color: '#e2e8f0',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: '#ffffff',
    backgroundColor: '#071029',
  },
  button: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontWeight: '700' },
  message: { marginTop: 12, fontSize: 13 },
  messageError: { color: '#ef4444' },
  messageSuccess: { color: '#10b981' },
});

export default ConfirmarRecuperacion;