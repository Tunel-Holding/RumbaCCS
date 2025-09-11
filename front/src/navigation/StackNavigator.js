import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import RegisterScreen, { AccountTypeScreen } from '../screens/RegisterScreen';
import PerfilScreen from '../screens/PerfilScreen';
import EmpresaScreen from '../screens/EmpresaScreen';
import BuyScreen from '../screens/BuyScreen';
import AddScreen from '../screens/AddScreen';
import FormularioScreen from '../screens/FormularioScreen';
import EmpresaScreenUser from '../screens/EmpresaScreenUser';

const Stack = createStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator initialRouteName="HomeScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="AccountTypeScreen" component={AccountTypeScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
      <Stack.Screen name="Perfil" component={PerfilScreen} />
      <Stack.Screen name="Empresa" component={EmpresaScreen} />
      <Stack.Screen name="Reservar/Comprar" component={BuyScreen} />
      <Stack.Screen name="Add" component={AddScreen} />
      <Stack.Screen name="FormularioScreen" component={FormularioScreen} />
      <Stack.Screen name="BuyScreen" component={BuyScreen} />
      <Stack.Screen name="EmpresaScreenUser" component={EmpresaScreenUser} />
    </Stack.Navigator>
  );
}