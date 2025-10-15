import React, { useState } from 'react';
import { View, Button } from 'react-native';
import PantallaSolicitarRecuperacion from './PantallaSolicitarRecuperacion';
import ConfirmarRecuperacion from './ConfirmarRecuperacion';
import { useNavigation } from '@react-navigation/native'; // ← importa useNavigation

export default function RecuperarContrasena({ onBack }) {
  const [email, setEmail] = useState('');
  const [paso, setPaso] = useState(1);
  const navigation = useNavigation(); // ← obtiene navigation

  const handleSuccess = (correo) => {
    setEmail(correo);
    setPaso(2);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      {paso === 1 && (
        <PantallaSolicitarRecuperacion onSuccess={handleSuccess} />
      )}
      {paso === 2 && (
        <ConfirmarRecuperacion email={email} navigation={navigation} /> // ← pasa navigation
      )}
      <Button title="Volver" onPress={onBack} />
    </View>
  );
}