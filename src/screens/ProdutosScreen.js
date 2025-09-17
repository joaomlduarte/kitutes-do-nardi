// src/screens/ProdutosScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from 'react-native';
import { getDb } from '../storage/database';
import Input from '../components/Input';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ProdutosScreen() {
  const [id, setId] = useState('');
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [produtos, setProdutos] = useState([]);

  async function carregar() {
    const db = await getDb();
    const lista = await db.getAllAsync('SELECT * FROM produtos');
    setProdutos(lista);
  }
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!id || !nome || !preco) {
      Alert.alert('Dados faltando', 'Preencha ID, nome e preço.');
      return;
    }
    const valor = Number(String(preco).replace(',', '.'));
    if (Number.isNaN(valor) || valor < 0) {
      Alert.alert('Preço inválido', 'Digite um número válido.');
      return;
    }
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO produtos (id, nome, preco) VALUES (?, ?, ?)', [String(id), String(nome), valor]);
    setId(''); setNome(''); setPreco(''); await carregar();
  }

  async function remover(pid) {
    const db = await getDb();
    await db.runAsync('DELETE FROM produtos WHERE id = ?', [String(pid)]);
    await carregar();
  }

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.itemNome}>{item.nome}</Text>
      <Text style={styles.itemSub}>ID: {item.id} • R$ {Number(item.preco).toFixed(2)}</Text>
      <Pressable style={styles.removeBtn} onPress={() => remover(item.id)}>
        <Text style={styles.removeTxt}>Remover</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro de Produtos</Text>

      <View style={styles.row}>
        <Input style={{ flex: 1 }} placeholder="ID do produto" value={id} onChangeText={setId} />
        <View style={{ width: SPACING.md }} />
        <Input style={{ flex: 2 }} placeholder="Nome do produto" value={nome} onChangeText={setNome} />
      </View>

      <View style={styles.row}>
        <Input style={{ flex: 1 }} placeholder="Preço (ex: 12.50)" value={preco} onChangeText={setPreco} keyboardType="decimal-pad" />
        <View style={{ width: SPACING.md }} />
        <Pressable style={styles.salvarBtn} onPress={salvar}><Text style={styles.salvarTxt}>Salvar</Text></Pressable>
      </View>

      <FlatList
        data={produtos}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
        contentContainerStyle={{ paddingVertical: SPACING.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.xl, backgroundColor: COLORS.bg },
  title: { fontSize: FONT.size.xl, fontWeight: '800', marginBottom: SPACING.sm, color: COLORS.text },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  salvarBtn: { backgroundColor: COLORS.success, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg, borderRadius: RADII.md },
  salvarTxt: { color: '#fff', fontWeight: '900' },
  item: { backgroundColor: COLORS.card, borderRadius: RADII.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  itemNome: { fontWeight: '800', color: COLORS.text },
  itemSub: { color: COLORS.textMuted, marginTop: 4 },
  removeBtn: { marginTop: SPACING.sm, alignSelf: 'flex-start', backgroundColor: COLORS.danger, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADII.sm },
  removeTxt: { color: '#fff', fontWeight: '800' },
});
