import React, { useState } from 'react';
import { View, TextInput, Button, Text, ActivityIndicator } from 'react-native';
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
      }, 1500);
    } catch (err) {
      setMensaje('Error: ' + (err.response?.data?.error || 'Intenta de nuevo.'));
    }
    setEnviando(false);
  };

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        placeholder="Código recibido"
        value={code}
        onChangeText={setCode}
        editable={!enviando}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 4,
          padding: 8,
          marginBottom: 12,
        }}
      />
      <TextInput
        placeholder="Nueva contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!enviando}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 4,
          padding: 8,
          marginBottom: 12,
        }}
      />
      <TextInput
        placeholder="Repetir contraseña"
        value={password2}
        onChangeText={setPassword2}
        secureTextEntry
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
        title={enviando ? 'Cambiando...' : 'Cambiar contraseña'}
        onPress={handleSubmit}
        disabled={enviando}
      />
      {enviando && <ActivityIndicator style={{ marginTop: 10 }} />}
      <Text style={{ marginTop: 12, color: mensaje.includes('Error') ? 'red' : 'green' }}>
        {mensaje}
      </Text>
    </View>
  );
}

export default ConfirmarRecuperacion;