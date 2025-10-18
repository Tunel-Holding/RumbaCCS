import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

export default function HeaderBase({
  isLogged,
  onLoginPress,
  onLogoutPress,
  navigation,
  isEmpresaAccount,
  isUserAccount,
  userAvatarUrl,
  empresaData,
  styles
}) 


{
  const avatarFuente = userAvatarUrl
    ? userAvatarUrl
    : isEmpresaAccount && empresaData?.logo
      ? empresaData.logo
      : null;

  return (
    <View style={styles.header}>
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>R U M B A</Text>
          <Text style={styles.logoSubtext}>CCS</Text>
        </View>

        <View style={styles.headerRight}>
          {isLogged ? (
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: '#ef4444' }]}
              onPress={onLogoutPress}
            >
              <Text style={styles.loginBtnText}>Cerrar sesión</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={onLoginPress}
            >
              <Text style={styles.loginBtnText}>Iniciar sesión</Text>
            </TouchableOpacity>
          )}

          {isLogged && (
            <TouchableOpacity
              onPress={() => {
                if (isEmpresaAccount && !isUserAccount) {
                  navigation.navigate('Empresa');
                } else {
                  navigation.navigate('Perfil');
                }
              }}
            >
              {avatarFuente ? (
              <Image
                source={{ uri: avatarFuente }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  marginLeft: 12,
                  borderWidth: 1,
                  borderColor: '#0ea5e9',
                }}
              />
            ) : (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  marginLeft: 12,
                  borderWidth: 1,
                  borderColor: '#0ea5e9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#a4a5dfff',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>👤</Text>
              </View>
            )}
            </TouchableOpacity>
            )}

        </View>
      </View>
    </View>
  );
}
