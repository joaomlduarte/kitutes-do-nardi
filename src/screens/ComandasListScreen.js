// src/screens/ComandasListScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import Input from '../components/Input';
import dayjs from 'dayjs';
import { getDb } from '../storage/database';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ComandasListScreen({ navigation }) {
  const [novaId, setNovaId] = useState('');
  const [comandas, setComandas] = useState([]); // [{id, aberta_em}]

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', carregar);
    carregar();
    return unsubscribe;
  }, [navigation]);

  async function carregar() {
    const db = await getDb();
    // ORDER BY alfabético, case-insensitive
    const lista = await db.getAllAsync('SELECT id, aberta_em FROM comandas ORDER BY id COLLATE NOCASE ASC');
    setComandas(lista);
  }

  async function criarComanda() {
    const id = (novaId || '').trim();
    if (!id) {
      Alert.alert('Informe o nome/número da comanda.');
      return;
    }
    const db = await getDb();
    const existe = await db.getAllAsync('SELECT id FROM comandas WHERE id = ?', [id]);
    if (existe.length) {
      Alert.alert('Comanda já existe', 'Escolha outro identificador.');
      return;
    }
    await db.runAsync('INSERT INTO comandas (id, aberta_em) VALUES (?, ?)', [
      id,
      dayjs().toISOString(),
    ]);
    setNovaId('');
    await carregar();
  }

  function abrir(c) {
    navigation.navigate('ComandaDetail', { comandaId: c.id });
  }

  async function excluir(c) {
    const db = await getDb();
    await db.runAsync('DELETE FROM comandas WHERE id = ?', [c.id]);
    await carregar();
  }

  const renderItem = ({ item }) => (
    <Pressable onPress={() => abrir(item)} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>Comanda #{item.id}</Text>
        <Text style={styles.cardSub}>
          Aberta: {dayjs(item.aberta_em).format('HH:mm DD/MM/YYYY')}
        </Text>
      </View>
      <Pressable onPress={() => excluir(item)} style={styles.remover}>
        <Text style={styles.removerTxt}>Excluir</Text>
      </Pressable>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comandas em aberto</Text>

      <View style={styles.row}>
        <Input
          style={{ flex: 1 }}
          placeholder="Nome/ID da comanda"
          value={novaId}
          onChangeText={setNovaId}
        />
        <View style={{ width: SPACING.md }} />
        <Pressable style={styles.addBtn} onPress={criarComanda}>
          <Text style={styles.addTxt}>Criar</Text>
        </Pressable>
      </View>

      <FlatList
        data={comandas}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
        contentContainerStyle={{ paddingVertical: SPACING.md }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma comanda aberta.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.xl, backgroundColor: COLORS.bg },
  title: { fontSize: FONT.size.xl, fontWeight: '800', marginBottom: SPACING.sm, color: COLORS.text },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADII.md,
  },
  addTxt: { color: '#fff', fontWeight: '900' },
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
  remover: { backgroundColor: COLORS.danger, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2, borderRadius: RADII.sm },
  removerTxt: { color: '#fff', fontWeight: '800' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: SPACING.lg },
});
