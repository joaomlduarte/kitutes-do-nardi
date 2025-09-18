// src/screens/ComandasListScreen.js
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { dbSelectAll, dbRun } from '../storage/database';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ComandasListScreen() {
  const navigation = useNavigation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await dbSelectAll(
        "SELECT * FROM comandas WHERE status = 'aberta' ORDER BY nome COLLATE NOCASE ASC;"
      );
      setRows(r || []);
    } catch (e) {
      console.log('[ComandasList] erro:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const fechar = async (id, nome) => {
    try {
      await dbRun("UPDATE comandas SET status='fechada', updated_at = datetime('now') WHERE id = ?;", [id]);
      await carregar();
      Alert.alert('Comanda fechada', `A comanda "${nome || id}" foi fechada.`);
    } catch (e) {
      console.log('[ComandasList] fechar erro:', e);
      Alert.alert('Erro', 'Não foi possível fechar a comanda.');
    }
  };

  const abrirDetalhe = (id) => {
    // ajuste o nome da rota se no seu navigator for diferente
    navigation.navigate?.('ComandaDetail', { id, comandaId: id });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => abrirDetalhe(item.id)} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.nome}>{item.nome || '(sem nome)'}</Text>
        <Text style={styles.meta}>id: {item.id} • status: {item.status || '-'}</Text>
      </View>
      <TouchableOpacity onPress={() => fechar(item.id, item.nome)} style={styles.btnFechar}>
        <Text style={styles.btnFecharTxt}>Fechar</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comandas abertas</Text>
      <FlatList
        data={rows}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} />}
        ListEmptyComponent={!loading && (
          <Text style={styles.emptyText}>Nenhuma comanda aberta.</Text>
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
    fontWeight: FONT.weight.black, 
    marginBottom: SPACING.sm,
    color: COLORS.text
  },
  card: { 
    flexDirection: 'row', 
    gap: SPACING.sm, 
    padding: SPACING.lg, 
    backgroundColor: COLORS.card, 
    borderRadius: RADII.lg, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  nome: { 
    fontSize: FONT.size.md, 
    fontWeight: FONT.weight.bold,
    color: COLORS.text
  },
  meta: { 
    color: COLORS.textMuted, 
    marginTop: 2,
    fontSize: FONT.size.sm
  },
  btnFechar: { 
    backgroundColor: COLORS.danger, 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.sm, 
    borderRadius: RADII.sm 
  },
  btnFecharTxt: { 
    color: COLORS.card, 
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.sm
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
    fontSize: FONT.size.base,
    textAlign: 'center'
  },
});