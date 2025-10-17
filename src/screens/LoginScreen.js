// ...existing code...
<TouchableOpacity onPress={() => navigation.navigate('AccountTypeScreen')}>
  <Text>Regístrate</Text>
</TouchableOpacity>
// ...existing code...
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar sesión</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" />
      <TextInput placeholder="Contraseña" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
      <TouchableOpacity style={styles.btn} onPress={() => { /* login logic placeholder */ }}>
        <Text style={styles.btnText}>Ingresar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('AccountTypeScreen')}>
        <Text style={styles.link}>Regístrate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#0f172a' },
  title: { color: '#fff', fontSize: 24, marginBottom: 16 },
  input: { backgroundColor: '#fff', width: '100%', padding: 12, borderRadius: 8, marginBottom: 12 },
  btn: { backgroundColor: '#0ea5e9', padding: 12, borderRadius: 8, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  link: { color: '#3b82f6', marginTop: 12 }
});