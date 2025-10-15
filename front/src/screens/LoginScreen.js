import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

export default function LoginScreen({ navigation }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('AccountTypeScreen')}>
      <Text>Regístrate</Text>
    </TouchableOpacity>
  );
}