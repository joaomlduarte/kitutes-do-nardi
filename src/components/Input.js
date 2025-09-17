// src/components/Input.js
import React from 'react';
import { TextInput, StyleSheet, Platform } from 'react-native';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function Input({
  style,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'none',
  ...rest
}) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      placeholderTextColor={COLORS.hint}
      selectionColor={COLORS.primary}
      cursorColor={COLORS.primary}
      returnKeyType="done"
      underlineColorAndroid="transparent"
      keyboardAppearance={Platform.OS === 'ios' ? 'light' : undefined}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.xl - 2,
    paddingVertical: SPACING.lg,
    fontSize: FONT.size.md,
  },
});
