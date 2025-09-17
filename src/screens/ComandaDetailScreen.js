// src/screens/ComandaDetailScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import Input from '../components/Input';
import { getDb } from '../storage/database';
import dayjs from 'dayjs';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ComandaDetailScreen({ route, navigation }) {
  const { comandaId } = route.params;
  const [produtos, setProdutos] = useState([]);
  const [itens, setItens] = useState([]);
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: `Comanda #${comandaId}` });
    carregarProdutos();
  }, [comandaId]);

  async function carregarProdutos() {
    const db = await getDb();
    const lista = await db.getAllAsync('SELECT * FROM produtos');
    setProdutos(lista);
  }

  function addItem() {
    if (!produtoId || !quantidade) {
      Alert.alert('Dados faltando', 'Informe ID do produto e quantidade.');
      return;
    }
    const qtd = Number(String(quantidade).replace(',', '.'));
    if (Number.isNaN(qtd) || qtd <= 0) {
      Alert.alert('Quantidade inválida', 'Digite uma quantidade válida.');
      return;
    }
    const p = produtos.find(p => String(p.id) === String(produtoId));
    if (!p) {
      Alert.alert('Produto não encontrado', 'Verifique o ID do produto.');
      return;
    }
    const novo = { produto_id: String(p.id), nome: p.nome, preco_unit: Number(p.preco), quantidade: qtd };
    setItens(prev => [novo, ...prev]);
    setProdutoId(''); setQuantidade('');
  }

  const total = useMemo(() => itens.reduce((acc, it) => acc + it.quantidade * it.preco_unit, 0), [itens]);

  async function finalizar() {
    if (itens.length === 0) {
      Alert.alert('Sem itens', 'Adicione ao menos 1 item.');
      return;
    }
    const db = await getDb();
    const data = dayjs().format('YYYY-MM-DD');
    for (const it of itens) {
      await db.runAsync(
        'INSERT INTO vendas (data, comanda, produto_id, quantidade, preco_unit) VALUES (?, ?, ?, ?, ?)',
        [data, String(comandaId), it.produto_id, it.quantidade, it.preco_unit]
      );
    }
    Alert.alert('Comanda finalizada', `Total: R$ ${total.toFixed(2)}`);
    navigation.goBack();
  }

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.itemNome}>{item.nome}</Text>
      <Text style={styles.itemSub}>
        ID: {item.produto_id} • Qtd: {item.quantidade} • Unit: R$ {item.preco_unit.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar itens</Text>

      <View style={styles.row}>
        <Input style={{ flex: 1 }} placeholder="ID do produto" value={produtoId} onChangeText={setProdutoId} />
        <View style={{ width: SPACING.md }} />
        <Input style={{ width: 140 }} placeholder="Quantidade" value={quantidade} onChangeText={setQuantidade} keyboardType="decimal-pad" />
        <View style={{ width: SPACING.md }} />
        <Pressable style={styles.addBtn} onPress={addItem}><Text style={styles.addTxt}>Adicionar</Text></Pressable>
      </View>

      <Text style={styles.subtitle}>Itens da comanda</Text>
      <FlatList
        data={itens}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm + 2 }} />}
        contentContainerStyle={{ paddingVertical: SPACING.md }}
      />

      <View style={styles.footer}>
        <Text style={styles.total}>Total: R$ {total.toFixed(2)}</Text>
        <Pressable style={styles.finishBtn} onPress={finalizar}><Text style={styles.finishTxt}>Finalizar comanda</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.xl, backgroundColor: COLORS.bg },
  title: { fontSize: FONT.size.lg, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { marginTop: SPACING.lg, fontWeight: '800', color: COLORS.text },
  row: { flexDirection: 'row', alignItems: 'center' },
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl - 2, paddingVertical: SPACING.lg, borderRadius: RADII.md },
  addTxt: { color: '#fff', fontWeight: '900' },

  item: { backgroundColor: COLORS.card, borderRadius: RADII.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  itemNome: { fontWeight: '800', color: COLORS.text },
  itemSub: { color: COLORS.textMuted, marginTop: 4 },

  footer: { marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { fontSize: FONT.size.lg, fontWeight: '900', color: COLORS.text },
  finishBtn: { backgroundColor: COLORS.success, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg, borderRadius: RADII.lg },
  finishTxt: { color: '#fff', fontWeight: '900' },
});
