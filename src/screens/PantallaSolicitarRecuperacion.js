import React, { useState } from 'react';
import { View, TextInput, Button, Text, ActivityIndicator } from 'react-native';
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
    <View style={{ padding: 16 }}>
      <TextInput
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!enviando}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 4,
          padding: 8,
          marginBottom: 12,
        }}
      />
      <Button
        title={enviando ? 'Enviando...' : 'Enviar código'}
        onPress={handleSubmit}
        disabled={enviando}
      />
      {enviando && <ActivityIndicator style={{ marginTop: 10 }} />}
      <Text style={{ marginTop: 12, color: mensaje.includes('no se pudo') ? 'red' : 'green' }}>
        {mensaje}
      </Text>
    </View>
  );
}

export default PantallaSolicitarRecuperacion;