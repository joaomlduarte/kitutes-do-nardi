// src/screens/HistoricoScreen.js
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { dbSelectAll } from '../storage/database';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function HistoricoScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await dbSelectAll(
        "SELECT * FROM comandas WHERE status = 'fechada' ORDER BY updated_at DESC, nome COLLATE NOCASE ASC;"
      );
      setData(rows || []);
    } catch (e) {
      console.log('[Historico] erro:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico (Comandas fechadas)</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.nome}>{item.nome || '(sem nome)'}</Text>
            <Text style={styles.meta}>
              id: {item.id} • status: {item.status || '-'} {item.updated_at ? `• ${item.updated_at}` : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={!loading && (
          <Text style={styles.emptyText}>Nenhuma comanda fechada.</Text>
        )}
        contentContainerStyle={{ paddingVertical: SPACING.sm }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: SPACING.xl,
    backgroundColor: COLORS.bg
  },
  title: { 
    fontSize: FONT.size.xl, 
    fontWeight: FONT.weight.bold, 
    marginBottom: SPACING.sm,
    color: COLORS.text
  },
  sep: { 
    height: SPACING.sm 
  },
  item: { 
    backgroundColor: COLORS.card, 
    borderRadius: RADII.md, 
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  nome: { 
    fontSize: FONT.size.md, 
    fontWeight: FONT.weight.bold,
    color: COLORS.text
  },
  meta: { 
    marginTop: 4, 
    color: COLORS.textMuted,
    fontSize: FONT.size.sm
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
    fontSize: FONT.size.base,
    textAlign: 'center'
  },
});