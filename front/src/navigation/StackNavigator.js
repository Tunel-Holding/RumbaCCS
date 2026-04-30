import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen, { AccountTypeScreen } from '../screens/RegisterScreen';
import RecuperarContrasena from '../screens/RecuperarContrasena';
import PerfilScreen from '../screens/PerfilScreen';
import EmpresaScreen from '../screens/EmpresaScreen';
import BuyScreen from '../screens/BuyScreen';
import AddScreen from '../screens/AddScreen';
import FormularioScreen from '../screens/FormularioScreen';
import EmpresaScreenUser from '../screens/EmpresaScreenUser';
import PantallaSolicitarRecuperacion from '../screens/PantallaSolicitarRecuperacion';
import ConfirmarRecuperacion from '../screens/ConfirmarRecuperacion';

const Stack = createStackNavigator();

/**
 * En web, react-navigation/stack pone cada pantalla en un div con
 * position:absolute que fija la altura al viewport y bloquea el scroll.
 * Con cardStyle sobreescribimos eso para que cada tarjeta sea un bloque
 * normal de flujo (position:relative, height:auto) y el scroll
 * funcione de forma nativa en el navegador.
 */
const webCardStyle = Platform.OS === 'web'
  ? {
      // Quita el position:absolute y permite que la pantalla crezca con su contenido
      position: 'relative',
      overflow: 'visible',
      height: 'auto',
      minHeight: '100vh',
      backgroundColor: '#0f172a',
    }
  : {};

export default function StackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="HomeScreen"
      screenOptions={{
        headerShown: false,
        // Aplica el cardStyle web a todas las pantallas
        cardStyle: webCardStyle,
        // Sin animación en web para evitar problemas con position:absolute durante transiciones
        ...(Platform.OS === 'web' && {
          animationEnabled: false,
          cardOverlayEnabled: false,
        }),
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
      <Stack.Screen name="Perfil" component={PerfilScreen} />
      <Stack.Screen name="Empresa" component={EmpresaScreen} />
      <Stack.Screen name="Add" component={AddScreen} />
      <Stack.Screen name="FormularioScreen" component={FormularioScreen} />
      <Stack.Screen name="BuyScreen" component={BuyScreen} />
      <Stack.Screen name="EmpresaScreenUser" component={EmpresaScreenUser} />
      <Stack.Screen
        name="RecuperarContrasena"
        component={RecuperarContrasena}
        options={{ title: 'Recuperar Contraseña' }}
      />
      <Stack.Screen name="AccountTypeScreen" component={AccountTypeScreen} />
      <Stack.Screen name="PantallaSolicitarRecuperacion" component={PantallaSolicitarRecuperacion} />
      <Stack.Screen name="ConfirmarRecuperacion" component={ConfirmarRecuperacion} />
    </Stack.Navigator>
  );
}