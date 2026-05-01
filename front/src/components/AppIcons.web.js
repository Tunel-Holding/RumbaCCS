
import React from 'react';
import { Text } from 'react-native';

function createFallbackIcon() {
  return function FallbackIcon({ size = 24, color = '#fff', style, ...props }) {
    return (
      <Text
        {...props}
        style={[
          {
            fontSize: size,
            color,
            lineHeight: size,
          },
          style,
        ]}
      >
        ●
      </Text>
    );
  };
}

export const Ionicons = createFallbackIcon();
export const MaterialCommunityIcons = createFallbackIcon();
