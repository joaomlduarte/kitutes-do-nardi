// src/screens/ComandasListScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Input from '../components/Input';
import { COLORS, RADII, SPACING } from '../theme';
import { dbRun, dbSelectAll } from '../storage/database';

export default function ComandasListScreen() {
  const navigation = useNavigation();
  const [nome, setNome] = useState('');
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    try {
      setLoading(true);
      // ORDEM ALFABÉTICA (case-insensitive)
      const rows = await dbSelectAll(
        `SELECT * FROM comandas WHERE status = 'aberta' ORDER BY nome COLLATE NOCASE ASC;`
      );
      setComandas(rows);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', carregar);
    carregar();
    return unsub;
  }, [navigation]);

  const criar = async () => {
    const nomeTrim = nome.trim();
    if (!nomeTrim) return Alert.alert('Atenção', 'Informe o nome/ID da comanda.');
    try {
      await dbRun(`INSERT INTO comandas (nome, status) VALUES (?, 'aberta');`, [nomeTrim]);
      setNome('');
      await carregar();
    } catch (e) {
      Alert.alert('Erro', String(e.message || e));
    }
  };

  const abrir = (item) => navigation.navigate('ComandaDetail', { id: item.id, title: item.nome });

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Comandas Abertas (A–Z)</Text>

      <View style={styles.row}>
        <Input
          style={{ flex: 1 }}
          placeholder="Nome/ID da comanda"
          value={nome}
          onChangeText={setNome}
        />
        <Pressable style={styles.btnPrimary} onPress={criar} disabled={loading}>
          <Text style={styles.btnPrimaryTxt}>Criar</Text>
        </Pressable>
      </View>

      <FlatList
        refreshing={loading}
        onRefresh={carregar}
        data={comandas}
        keyExtractor={(it, idx) => (it?.id != null ? String(it.id) : `idx-${idx}`)}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma comanda aberta.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => abrir(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item?.nome ?? `#${item?.id}`}</Text>
              <Text style={styles.cardSub}>Status: {item?.status ?? '-'}</Text>
            </View>
            <Text style={{ color: COLORS.link, fontWeight: '800' }}>Abrir</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
        contentContainerStyle={{ paddingVertical: SPACING.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.lg },
  h1: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: SPACING.lg },
  row: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADII.md,
  },
  btnPrimaryTxt: { color: '#fff', fontWeight: '900' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADII.lg,
    padding: SPACING.lg + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { fontWeight: '800', color: COLORS.text },
  cardSub: { color: COLORS.textMuted, marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: SPACING.lg },
});
