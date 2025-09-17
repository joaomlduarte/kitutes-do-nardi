// src/components/Input.js
import React from 'react';
import { TextInput, StyleSheet, Platform } from 'react-native';

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
      placeholderTextColor="#6b7280"   // cinza médio (sempre visível)
      selectionColor="#2563eb"
      cursorColor="#2563eb"
      returnKeyType="done"
      underlineColorAndroid="transparent"
      keyboardAppearance={Platform.OS === 'ios' ? 'light' : undefined}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#ffffff',
    color: '#111827',              // texto sempre escuro
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
