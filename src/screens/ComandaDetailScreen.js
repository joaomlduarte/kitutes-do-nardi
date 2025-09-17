import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Alert } from 'react-native';
import dayjs from 'dayjs';
import { getDb } from '../storage/database';
import { useIsFocused, useRoute, useNavigation } from '@react-navigation/native';

export default function ComandaDetailScreen() {
  const route = useRoute();
  const nav = useNavigation();
  const { comandaId, comandaNome } = route.params;

  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [qtd, setQtd] = useState('');
  const [itens, setItens] = useState([]);
  const [total, setTotal] = useState(0);
  const isFocused = useIsFocused();

  useEffect(() => { if (isFocused) { carregarProdutos(); carregarItens(); } }, [isFocused]);

  async function carregarProdutos() {
    const db = await getDb();
    const rows = await db.getAllAsync('SELECT * FROM produtos ORDER BY nome ASC');
    setProdutos(rows);
  }

  async function carregarItens() {
    const db = await getDb();
    const rows = await db.getAllAsync('SELECT * FROM itens_abertos WHERE comanda_id = ? ORDER BY id DESC', [comandaId]);
    setItens(rows);
    const trow = await db.getAllAsync('SELECT SUM(quantidade*preco_unit) AS total FROM itens_abertos WHERE comanda_id = ?', [comandaId]);
    setTotal(Number(trow?.[0]?.total || 0));
  }

  function resolverProduto(input) {
    const s = String(input ?? '').trim();
    if (!s) return null;
    let p = produtos.find(p => String(p.id).trim() === s);
    if (p) return p;
    const low = s.toLowerCase();
    p = produtos.find(p => String(p.nome).toLowerCase().startsWith(low));
    return p || null;
  }

  async function adicionar() {
    const prod = resolverProduto(busca);
    const q = Number(String(qtd).replace(',', '.').trim());
    if (!prod) { Alert.alert('Produto não encontrado'); return; }
    if (!Number.isFinite(q) || q <= 0) { Alert.alert('Quantidade inválida'); return; }

    const db = await getDb();
    await db.runAsync(
      'INSERT INTO itens_abertos (comanda_id, produto_id, quantidade, preco_unit) VALUES (?, ?, ?, ?)',
      [comandaId, prod.id, q, prod.preco]
    );
    setBusca(''); setQtd('');
    carregarItens();
  }

  async function removerItem(itemId) {
    const db = await getDb();
    await db.runAsync('DELETE FROM itens_abertos WHERE id = ?', [itemId]);
    carregarItens();
  }

  async function finalizar() {
    if (itens.length === 0) { Alert.alert('Nada para finalizar'); return; }
    const db = await getDb();
    const data = dayjs().format('YYYY-MM-DD');

    for (const it of itens) {
      await db.runAsync(
        'INSERT INTO vendas (data, comanda, produto_id, quantidade, preco_unit) VALUES (?, ?, ?, ?, ?)',
        [data, comandaNome, it.produto_id, it.quantidade, it.preco_unit]
      );
    }
    await db.runAsync('DELETE FROM comandas_abertas WHERE id = ?', [comandaId]); // cascade apaga itens

    Alert.alert('Comanda finalizada', `Total R$ ${total.toFixed(2)}`);
    nav.goBack();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comanda: {comandaNome}</Text>

      <TextInput
        placeholder="ID ou Nome do Produto"
        style={styles.input}
        value={busca}
        onChangeText={setBusca}
      />
      <TextInput
        placeholder="Quantidade"
        style={styles.input}
        value={qtd}
        onChangeText={setQtd}
        keyboardType="decimal-pad"
      />
      <Pressable style={styles.btnAdd} onPress={adicionar}><Text style={styles.btnText}>Adicionar</Text></Pressable>

      <FlatList
        data={itens}
        keyExtractor={i => String(i.id)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{flex:1}}>
              <Text style={styles.itemTitle}>{item.produto_id}</Text>
              <Text style={styles.itemSub}>{item.quantidade} x R$ {Number(item.preco_unit).toFixed(2)}</Text>
            </View>
            <Pressable onPress={() => removerItem(item.id)}><Text style={styles.remove}>Remover</Text></Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={{color:'#666'}}>Sem itens ainda.</Text>}
      />

      <Text style={styles.total}>Total parcial: R$ {total.toFixed(2)}</Text>
      <Pressable style={styles.btnFinish} onPress={finalizar}><Text style={styles.btnText}>Finalizar Comanda</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:16, gap:10 },
  title: { fontSize:20, fontWeight:'800' },
  input: { backgroundColor:'#fff', borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10 },
  btnAdd: { backgroundColor:'#2e7d32', padding:12, borderRadius:10, alignItems:'center' },
  btnFinish: { backgroundColor:'#1565c0', padding:14, borderRadius:12, alignItems:'center', marginTop:6 },
  btnText: { color:'#fff', fontWeight:'800' },
  item: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#fff', borderWidth:1, borderColor:'#eee', borderRadius:10, padding:12, marginTop:8 },
  itemTitle: { fontWeight:'800' },
  itemSub: { color: '#666', marginTop: 2 },
  remove: { color: '#c62828', fontWeight: '700' },
  total: { fontSize: 18, fontWeight: '800', marginTop: 8 }
});
