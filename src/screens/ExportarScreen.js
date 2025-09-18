// src/screens/ExportarScreen.js
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { dbSelectAll } from '../storage/database';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ExportarScreen() {
  const [dump, setDump] = useState({ comandas: [], itens: [], produtos: [] });
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    setBusy(true);
    try {
      const [comandas, itens, produtos] = await Promise.all([
        dbSelectAll('SELECT * FROM comandas ORDER BY id ASC;'),
        dbSelectAll('SELECT * FROM itens ORDER BY id ASC;'),
        dbSelectAll('SELECT * FROM produtos ORDER BY id ASC;'),
      ]);
      setDump({ comandas: comandas || [], itens: itens || [], produtos: produtos || [] });
    } catch (e) {
      console.log('[Exportar] erro ao carregar:', e);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const toJson = () => JSON.stringify(dump, null, 2);

  const copiar = async () => {
    try {
      // sem dependências: usa fallback simples com Alert mostrando que está na área de transferência
      // Se você tiver expo-clipboard, pode importar e usar Clipboard.setStringAsync(toJson()).
      Alert.alert('Exportação pronta', 'Selecione e copie o texto da exportação manualmente abaixo.');
    } catch (e) {
      console.log('[Exportar] erro ao copiar:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exportar dados</Text>

      <View style={styles.row}>
        <Stat label="Comandas" value={dump.comandas.length} />
        <Stat label="Itens" value={dump.itens.length} />
        <Stat label="Produtos" value={dump.produtos.length} />
      </View>

      <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} onPress={copiar} disabled={busy}>
        <Text style={styles.btnText}>{busy ? 'Carregando…' : 'Copiar/Salvar (manual)'}</Text>
      </TouchableOpacity>

      <ScrollView style={styles.box}>
        <Text selectable style={styles.mono}>{toJson()}</Text>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{String(value)}</Text>
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
  row: { 
    flexDirection: 'row', 
    gap: SPACING.md 
  },
  stat: { 
    flex: 1, 
    backgroundColor: COLORS.card, 
    borderRadius: RADII.md, 
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  statLabel: { 
    color: COLORS.textMuted,
    fontSize: FONT.size.sm
  },
  statValue: { 
    marginTop: 2, 
    fontSize: FONT.size.lg, 
    fontWeight: FONT.weight.black,
    color: COLORS.text
  },
  btn: { 
    backgroundColor: COLORS.primary, 
    borderRadius: RADII.md, 
    paddingVertical: SPACING.lg, 
    alignItems: 'center' 
  },
  btnDisabled: { 
    opacity: 0.6 
  },
  btnText: { 
    color: COLORS.card, 
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.md
  },
  box: { 
    flex: 1, 
    marginTop: SPACING.sm, 
    backgroundColor: COLORS.card, 
    borderRadius: RADII.md, 
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  mono: { 
    fontFamily: Platform.select({ 
      ios: 'Menlo', 
      android: 'monospace', 
      default: 'monospace' 
    }), 
    fontSize: FONT.size.sm,
    color: COLORS.text,
    lineHeight: 18
  },
});