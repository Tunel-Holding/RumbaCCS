import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../services/api';

function PantallaSolicitarRecuperacion({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async () => {
    setEnviando(true);
    setMensaje('');
    try {
      await api.post('/api/password-reset/request/', { email });
      setMensaje('Revisa tu correo para el código de recuperación.');
      onSuccess(email);
    } catch (err) {
      setMensaje('No se pudo enviar el código. ¿El correo es correcto?');
    }
    setEnviando(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
       
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          placeholder="tu@correo.com"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!enviando}
          style={styles.input}
        />

        <TouchableOpacity style={[styles.button, enviando ? styles.buttonDisabled : null]} onPress={handleSubmit} disabled={enviando} activeOpacity={0.85}>
          {enviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enviar código</Text>
          )}
        </TouchableOpacity>

        {mensaje ? (
          <Text style={[styles.message, mensaje.includes('no se pudo') ? styles.messageError : styles.messageSuccess]}>{mensaje}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default PantallaSolicitarRecuperacion;

const styles = StyleSheet.create({
  wrapper: {
    padding: 8,
  },
  card: {
    backgroundColor: '#071029',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    marginBottom: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardHint: {
    color: '#9ca3af',
    fontSize: 12,
  },
  label: {
    color: '#cbd5e1',
    marginTop: 8,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0b1220',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#122133',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#eaebecff',
    fontWeight: '700',
    fontSize: 16,
  },
  message: {
    marginTop: 10,
    fontSize: 13,
    textAlign: 'center',
  },
  messageError: {
    color: '#fb7185',
  },
  messageSuccess: {
    color: '#86efac',
  },
});