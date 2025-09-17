// src/screens/ComandasListScreen.js
import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import dayjs from 'dayjs';
import Input from '../components/Input';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ComandasListScreen({ navigation }) {
  const [novaId, setNovaId] = useState('');
  const [comandas, setComandas] = useState([]); // [{id, abertaEm}]

  function criarComanda() {
    const id = (novaId || '').trim();
    if (!id) {
      Alert.alert('Informe o número/identificação da comanda.');
      return;
    }
    if (comandas.some(c => c.id === id)) {
      Alert.alert('Comanda já existe', 'Escolha outro identificador.');
      return;
    }
    setComandas(prev => [{ id, abertaEm: new Date().toISOString() }, ...prev]);
    setNovaId('');
  }

  function abrir(c) { navigation.navigate('ComandaDetail', { comandaId: c.id }); }
  function remover(c) { setComandas(prev => prev.filter(x => x.id !== c.id)); }

  const renderItem = ({ item }) => (
    <Pressable onPress={() => abrir(item)} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>Comanda #{item.id}</Text>
        <Text style={styles.cardSub}>Aberta: {dayjs(item.abertaEm).format('HH:mm DD/MM')}</Text>
      </View>
      <Pressable onPress={() => remover(item)} style={styles.remover}>
        <Text style={styles.removerTxt}>Fechar/Excluir</Text>
      </Pressable>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comandas em aberto</Text>

      <View style={styles.row}>
        <Input
          style={{ flex: 1 }}
          placeholder="Número/ID da comanda"
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
  row: { flexDirection: 'row', alignItems: 'center' },
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
