// src/screens/ComandaDetailScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import Input from '../components/Input';
import { getDb } from '../storage/database';
import dayjs from 'dayjs';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ComandaDetailScreen({ route, navigation }) {
  const { comandaId } = route.params;
  const [produtos, setProdutos] = useState([]);
  const [itens, setItens] = useState([]);
  const [produtoRef, setProdutoRef] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [sugestoes, setSugestoes] = useState([]);

  useEffect(() => {
    navigation.setOptions({ title: `Comanda #${comandaId}` });
    carregarProdutos();
  }, [comandaId]);

  async function carregarProdutos() {
    const db = await getDb();
    const lista = await db.getAllAsync('SELECT * FROM produtos');
    setProdutos(lista);
  }

  const norm = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  function atualizarSugestoes(texto) {
    setProdutoRef(texto);
    if (!texto.trim()) {
      setSugestoes([]);
      return;
    }

    const termo = norm(texto);
    const lista = produtos.filter(
      (p) =>
        String(p.id).startsWith(texto.trim()) ||
        norm(p.nome).includes(termo)
    );

    setSugestoes(lista.slice(0, 5)); // máximo 5 sugestões
  }

  function escolherSugestao(p) {
    setProdutoRef(p.id); // insere o ID (mas poderia usar p.nome)
    setSugestoes([]);
  }

  function resolverProduto(ref) {
    const refStr = String(ref || '').trim();
    const refNorm = norm(refStr);

    if (!refStr) return null;

    let p = produtos.find((x) => String(x.id) === refStr);
    if (p) return p;

    p = produtos.find((x) => norm(x.nome) === refNorm);
    if (p) return p;

    const porIdPrefix = produtos.filter((x) => String(x.id).startsWith(refStr));
    if (porIdPrefix.length === 1) return porIdPrefix[0];

    const porNomePrefix = produtos.filter((x) => norm(x.nome).startsWith(refNorm));
    if (porNomePrefix.length === 1) return porNomePrefix[0];

    return null;
  }

  function addItem() {
    if (!produtoRef || !quantidade) {
      Alert.alert('Dados faltando', 'Informe o ID ou NOME do produto e a quantidade.');
      return;
    }

    const qtd = Number(String(quantidade).replace(',', '.'));
    if (Number.isNaN(qtd) || qtd <= 0) {
      Alert.alert('Quantidade inválida', 'Digite uma quantidade válida.');
      return;
    }

    const p = resolverProduto(produtoRef);
    if (!p) {
      Alert.alert('Produto não encontrado', 'Verifique o ID/NOME do produto.');
      return;
    }

    const novo = { produto_id: String(p.id), nome: p.nome, preco_unit: Number(p.preco), quantidade: qtd };
    setItens((prev) => [novo, ...prev]);
    setProdutoRef('');
    setSugestoes([]);
    setQuantidade('');
  }

  const total = useMemo(
    () => itens.reduce((acc, it) => acc + it.quantidade * it.preco_unit, 0),
    [itens]
  );

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
    await db.runAsync('DELETE FROM comandas WHERE id = ?', [String(comandaId)]);
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
        <View style={{ flex: 1 }}>
          <Input
            style={{ flex: 1 }}
            placeholder="ID ou NOME do produto"
            value={produtoRef}
            onChangeText={atualizarSugestoes}
            autoCapitalize="characters"
          />
          {sugestoes.length > 0 && (
            <View style={styles.dropdown}>
              {sugestoes.map((p) => (
                <TouchableOpacity key={p.id} onPress={() => escolherSugestao(p)} style={styles.sugestaoItem}>
                  <Text style={styles.sugestaoTxt}>{p.id} - {p.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ width: SPACING.md }} />
        <Input
          style={{ width: 140 }}
          placeholder="Quantidade"
          value={quantidade}
          onChangeText={setQuantidade}
          keyboardType="decimal-pad"
        />
        <View style={{ width: SPACING.md }} />
        <Pressable style={styles.addBtn} onPress={addItem}>
          <Text style={styles.addTxt}>Adicionar</Text>
        </Pressable>
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
        <Pressable style={styles.finishBtn} onPress={finalizar}>
          <Text style={styles.finishTxt}>Finalizar comanda</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.xl, backgroundColor: COLORS.bg },
  title: { fontSize: FONT.size.lg, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { marginTop: SPACING.lg, fontWeight: '800', color: COLORS.text },
  row: { flexDirection: 'row', alignItems: 'center' },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl - 2,
    paddingVertical: SPACING.lg,
    borderRadius: RADII.md,
  },
  addTxt: { color: '#fff', fontWeight: '900' },

  item: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemNome: { fontWeight: '800', color: COLORS.text },
  itemSub: { color: COLORS.textMuted, marginTop: 4 },

  footer: { marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { fontSize: FONT.size.lg, fontWeight: '900', color: COLORS.text },
  finishBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADII.lg,
  },
  finishTxt: { color: '#fff', fontWeight: '900' },

  dropdown: {
    backgroundColor: '#1e1e1e',
    borderRadius: 6,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 150,
  },
  sugestaoItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sugestaoTxt: { color: '#fff' },
});
