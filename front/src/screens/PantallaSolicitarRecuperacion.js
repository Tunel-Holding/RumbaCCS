import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, ActivityIndicator, StyleSheet, Platform, Keyboard, TouchableOpacity, ScrollView, KeyboardAvoidingView, TouchableWithoutFeedback, Modal, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StandardHeader from '../components/StandardHeader';
import { useNavigation } from '@react-navigation/native';
import { loginConFallback } from '../utils/auth';
import api from '../services/api';

function PantallaSolicitarRecuperacion({ onSuccess }) {
  // Mantener lógica actual
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [isEmpresaAccount, setIsEmpresaAccount] = useState(false);
  const [isUserAccount, setIsUserAccount] = useState(false);
  const navigation = useNavigation();
  // Estado para modal de login (mismo patrón que HomeScreen)
  const [loginVisible, setLoginVisible] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const topSpacer = insets.top + 8;

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

  // Cargar estado de sesión para el header (como en HomeScreen)
  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const emp = await AsyncStorage.getItem('isEmpresaAccount');
        const usr = await AsyncStorage.getItem('isUserAccount');
        if (!mounted) return;
        setIsLogged(!!token);
        setIsEmpresaAccount(emp === 'true');
        setIsUserAccount(usr === 'true');
      } catch (e) {
        if (!mounted) return;
        setIsLogged(false);
        setIsEmpresaAccount(false);
        setIsUserAccount(false);
      }
    };
    loadSession();
    return () => { mounted = false; };
  }, []);

  // Manejo de login (alineado con HomeScreen)
  const handleLogin = async () => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const resultado = await loginConFallback(user, pass);
      if (resultado.error) {
        switch (resultado.tipo) {
          case 'validacion':
            setLoginError('Por favor ingresa email y contraseña');
            break;
          case 'error':
            setLoginError('Error inesperado: ' + resultado.error);
            break;
          case 'credenciales':
            setLoginError('Usuario o contraseña incorrectos');
            break;
        }
        return;
      }

      // Limpiamos cualquier sesión previa
      await AsyncStorage.clear();

      if (resultado.data?.empresa) {
        // Cuenta de Empresa
        const empresa = resultado.data.empresa;
        await AsyncStorage.setItem('accessToken', resultado.data.access);
        await AsyncStorage.setItem('refreshToken', resultado.data.refresh);
        await AsyncStorage.setItem('empresaId', String(empresa.id));
        await AsyncStorage.setItem('isEmpresaAccount', 'true');
        await AsyncStorage.setItem('isUserAccount', 'false');
        setIsEmpresaAccount(true);
        setIsUserAccount(false);
      } else if (resultado.data?.user) {
        // Cuenta de Usuario (con o sin empresa vinculada)
        const userData = resultado.data.user;
        await AsyncStorage.setItem('accessToken', resultado.data.access);
        await AsyncStorage.setItem('refreshToken', resultado.data.refresh);
        await AsyncStorage.setItem('userId', String(userData.id));
        await AsyncStorage.setItem('userName', userData.username || '');
        await AsyncStorage.setItem('isUserAccount', 'true');
        await AsyncStorage.setItem('isEmpresaAccount', 'false');
        if (resultado.data?.empresa_id) {
          await AsyncStorage.setItem('empresaId', String(resultado.data.empresa_id));
        }
        setIsEmpresaAccount(false);
        setIsUserAccount(true);
      }

      setIsLogged(true);
      setLoginVisible(false);
    } finally {
      setLoginLoading(false);
      try { setUser(''); setPass(''); } catch (e) {}
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom, paddingTop: 32, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StandardHeader
          isLogged={isLogged}
          isHomeScreen={true}
          onLoginPress={() => setLoginVisible(true)}
          onMenuPress={(item) => {
            // Opcional: comportamiento similar a HomeScreen para 'inicio'
            if (item === 'inicio') {
              try { navigation.navigate('HomeScreen'); } catch (e) {}
            }
          }}
          isEmpresaAccount={isEmpresaAccount}
          isUserAccount={isUserAccount}
          style={styles.header}
          logoContainerStyle={styles.logoContainer}
          menuButtonStyle={styles.headerRight}
        />

        <KeyboardAvoidingView
          style={{ flex: 1, width: '100%' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 24 : insets.bottom + 24}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.centerWrap}>
              <View style={[styles.formContainer, { paddingTop: topSpacer, paddingBottom: 24 }]}> 
                <Text style={styles.formTitle}>Recuperar acceso</Text>

                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#888"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!enviando}
                  returnKeyType="send"
                  onSubmitEditing={() => { if (!enviando) handleSubmit(); }}
                />

                <TouchableOpacity
                  style={[styles.enviarBtn, enviando && styles.enviarBtnDisabled, { justifyContent: 'center', alignItems: 'center' }]}
                  onPress={enviando ? undefined : handleSubmit}
                  disabled={enviando}
                  activeOpacity={enviando ? 1 : 0.85}
                >
                  {enviando ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.enviarBtnText}>Enviar código</Text>
                  )}
                </TouchableOpacity>

                {!!mensaje && (
                  <Text style={{ marginTop: 12, color: mensaje.includes('no se pudo') ? '#ef4444' : '#22c55e', textAlign: 'center' }}>
                    {mensaje}
                  </Text>
                )}
              </View>
              {/* Burbuja de volver debajo del cuadro */}
              <TouchableOpacity
                onPress={() => navigation.goBack?.()}
                activeOpacity={0.85}
                style={styles.backBubble}
              >
                <Text style={styles.backBubbleArrow}>←</Text>
                <Text style={styles.backBubbleText}>Volver</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </ScrollView>
      {/* Modal de Login (igual a HomeScreen) */}
      <Modal
        visible={loginVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLoginVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable style={styles.modalClose} onPress={() => setLoginVisible(false)}>
              <Text style={{ color: '#fff', fontSize: 16 }}>✕</Text>
            </Pressable>
            <Text style={styles.loginTitle}>Iniciar sesión</Text>
            <TextInput
              placeholder="Correo"
              autoCapitalize="none"
              keyboardType="email-address"
              value={user}
              onChangeText={setUser}
              style={styles.loginInput}
            />
            <TextInput
              placeholder="Contraseña"
              secureTextEntry
              value={pass}
              onChangeText={setPass}
              style={styles.loginInput}
            />
            {loginError ? (
              <Text style={{ color: '#ef4444', marginBottom: 8, textAlign: 'center', fontWeight: 'bold' }}>{loginError}</Text>
            ) : null}
            <TouchableOpacity style={styles.loginBtnModal} onPress={handleLogin} disabled={loginLoading}>
              {loginLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Ingresar</Text>
              )}
            </TouchableOpacity>
            <View style={styles.loginLinks}>
              <TouchableOpacity onPress={() => { setLoginVisible(false); /* ya estamos en recuperación */ }}>
                <Text style={styles.loginLink}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
              <Text style={styles.loginLink}>|</Text>
              <TouchableOpacity onPress={() => { setLoginVisible(false); navigation.navigate('AccountTypeScreen'); }}>
                <Text style={styles.loginLink}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 8 },
  header: { backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b', marginBottom: 12 },
  logoContainer: { flexDirection: 'row', alignItems: 'flex-end' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'stretch',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(30,41,59,0.92)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 8,
    alignSelf: 'center',
  },
  formTitle: {
    color: '#ec4899',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 12,
    fontSize: 15,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    marginBottom: 4,
  },
  enviarBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  enviarBtnDisabled: {
    backgroundColor: '#1e3a8a',
  },
  enviarBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  // --- Modal de Login (copiado de HomeScreen) ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, width: 320, alignItems: 'center', position: 'relative' },
  modalClose: { position: 'absolute', top: 8, right: 12, zIndex: 2 },
  loginTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  loginInput: { backgroundColor: '#fff', borderRadius: 8, padding: 10, width: '100%', marginBottom: 12 },
  loginBtnModal: { backgroundColor: '#0ea5e9', borderRadius: 8, padding: 10, alignItems: 'center', width: '100%', marginTop: 8 },
  loginLinks: { flexDirection: 'row', marginTop: 12 },
  loginLink: { color: '#0ea5e9', marginHorizontal: 6 },
  backBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  backBubbleArrow: { fontSize: 18, color: '#fff', fontWeight: 'bold', marginRight: 6 },
  backBubbleText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default PantallaSolicitarRecuperacion;