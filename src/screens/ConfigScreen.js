// src/screens/ConfigScreen.js
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { dbRun } from '../storage/database';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ConfigScreen() {
  const [busy, setBusy] = useState(false);

  const limpar = useCallback(async () => {
    Alert.alert(
      'Confirmar',
      'Apagar TODAS as tabelas (comandas, itens, produtos)?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              await dbRun('DROP TABLE IF EXISTS itens;');
              await dbRun('DROP TABLE IF EXISTS comandas;');
              await dbRun('DROP TABLE IF EXISTS produtos;');
              Alert.alert('OK', 'Tabelas removidas. Reabra o app para recriar o banco.');
            } catch (e) {
              console.log('[Config] limpar erro:', e);
              Alert.alert('Erro', 'Não foi possível apagar as tabelas.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurações</Text>

      <TouchableOpacity 
        style={[styles.btn, busy && styles.btnDisabled]} 
        onPress={limpar} 
        disabled={busy}
      >
        <Text style={styles.btnTxt}>Apagar TUDO (DEV)</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        Dica: o esquema é migrado automaticamente na inicialização. Não insira colunas manualmente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: SPACING.xl, 
    gap: SPACING.lg,
    backgroundColor: COLORS.bg
  },
  title: { 
    fontSize: FONT.size.xl, 
    fontWeight: FONT.weight.black,
    color: COLORS.text
  },
  btn: { 
    backgroundColor: COLORS.danger, 
    borderRadius: RADII.md, 
    paddingVertical: SPACING.lg, 
    alignItems: 'center' 
  },
  btnDisabled: {
    opacity: 0.5
  },
  btnTxt: { 
    color: COLORS.card, 
    fontWeight: FONT.weight.black,
    fontSize: FONT.size.md
  },
  hint: {
    marginTop: SPACING.lg,
    color: COLORS.textMuted,
    fontSize: FONT.size.sm,
    lineHeight: 20
  },
});