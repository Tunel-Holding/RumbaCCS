import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Contenedor reutilizable que aplica padding top/bottom basado en los insets
 * evitando que el contenido quede detrás de la barra de estado o la barra de gestos.
 * Props:
 *  - children: nodos a renderizar
 *  - style: estilos adicionales para el SafeAreaView
 *  - contentBottomExtra: número opcional para añadir espacio extra inferior sobre insets.bottom
 */
export default function SafeAreaContainer({ children, style, contentBottomExtra = 0 }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={[styles.base, { paddingTop: insets.top, paddingBottom: insets.bottom + contentBottomExtra }, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: '#0f172a'
  }
});
