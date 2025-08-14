import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PerfilScreen from '../screens/PerfilScreen';
import EmpresaScreen from '../screens/EmpresaScreen';
import BuyScreen from '../screens/BuyScreen';
import AddScreen from '../screens/AddScreen';

const Stack = createStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator initialRouteName="HomeScreen" screenOptions={{ headerShown: false }}>
  <Stack.Screen name="HomeScreen" component={HomeScreen} />
  <Stack.Screen name="Registro" component={RegisterScreen} />
  <Stack.Screen name="Perfil" component={PerfilScreen} />
  <Stack.Screen name="Empresa" component={EmpresaScreen} />
  <Stack.Screen name="Reservar/Comprar" component={BuyScreen} />
  <Stack.Screen name="Add" component={AddScreen} />
</Stack.Navigator>

  );
}