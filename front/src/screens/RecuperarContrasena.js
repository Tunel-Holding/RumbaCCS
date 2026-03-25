import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, KeyboardAvoidingView, ScrollView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PantallaSolicitarRecuperacion from './PantallaSolicitarRecuperacion';
import ConfirmarRecuperacion from './ConfirmarRecuperacion';
import { useNavigation } from '@react-navigation/native'; // ← importa useNavigation

export default function RecuperarContrasena({ onBack }) {
  const [email, setEmail] = useState('');
  const [paso, setPaso] = useState(1);
  const navigation = useNavigation(); // ← obtiene navigation
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  const fieldPositions = useRef({});
  const registerFieldPosition = (key, y) => { fieldPositions.current[key] = y; };
  const scrollToField = (key) => {
    const y = fieldPositions.current[key];
    if (y != null && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTo({ y: Math.max(y - 120, 0), animated: true });
      }, 300);
    }
  };

  const handleSuccess = (correo) => {
    setEmail(correo);
    setPaso(2);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 24}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}> 
              <TouchableOpacity accessibilityLabel="Volver" style={styles.backButton} onPress={navigation.goBack} activeOpacity={0.85}>
                <Ionicons name="chevron-back" size={40} color="#ffffffff" />
              </TouchableOpacity>
            </View>
              
            <View style={styles.inner}>
              <Text style={styles.title}>Recuperar contraseña</Text>
              <View style={styles.content}>
                {paso === 1 && (
                  <PantallaSolicitarRecuperacion 
                    onSuccess={handleSuccess} 
                    registerFieldPosition={registerFieldPosition}
                    scrollToField={scrollToField}
                  />
                )}
                {paso === 2 && (
                  <ConfirmarRecuperacion 
                    email={email} 
                    navigation={navigation} 
                    registerFieldPosition={registerFieldPosition}
                    scrollToField={scrollToField}
                  /> // ← pasa navigation
                )}
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  inner: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 14,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    marginBottom: 4, // further reduce space so 'Volver' sits closer to the action button
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    position: 'absolute',
    left: 2,
    top: 14,
   
  },
  header: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
});