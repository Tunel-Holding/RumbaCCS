import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import StackNavigator from './StackNavigator';

const WebScrollTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f172a',
    card: '#0f172a',
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer
      theme={WebScrollTheme}
      // En web, el NavigationContainer es un div flex que ocupa todo el viewport.
      // Le decimos que su altura sea automática para permitir scroll del navegador.
      style={Platform.OS === 'web' ? { height: 'auto', flex: 0, minHeight: '100vh' } : undefined}
    >
      <StackNavigator />
    </NavigationContainer>
  );
}