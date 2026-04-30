import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView } from 'react-native';
import AppNavigator from './navigation/AppNavigator';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 60 }}>
          <Text style={{ color: '#f87171', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
            💥 Error al cargar la app
          </Text>
          <ScrollView>
            <Text style={{ color: '#fca5a5', fontFamily: 'monospace', fontSize: 13 }}>
              {this.state.error?.toString()}
            </Text>
            <Text style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11, marginTop: 12 }}>
              {this.state.error?.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}