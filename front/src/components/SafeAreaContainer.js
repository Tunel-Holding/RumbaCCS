import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets?.() ?? { top: 0, bottom: 0, left: 0, right: 0 };
  return (
    <SafeAreaView style={[styles.base, { paddingTop: insets.top ?? 0, paddingBottom: (insets.bottom ?? 0) + contentBottomExtra }, style]}>
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
