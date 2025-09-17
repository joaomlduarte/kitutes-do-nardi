// src/screens/ProdutosScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from 'react-native';
import { getDb } from '../storage/database';
import Input from '../components/Input';

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
        <View style={{ width: 10 }} />
        <Input style={{ flex: 2 }} placeholder="Nome do produto" value={nome} onChangeText={setNome} />
      </View>

      <View style={styles.row}>
        <Input style={{ flex: 1 }} placeholder="Preço (ex: 12.50)" value={preco} onChangeText={setPreco} keyboardType="decimal-pad" />
        <View style={{ width: 10 }} />
        <Pressable style={styles.salvarBtn} onPress={salvar}><Text style={styles.salvarTxt}>Salvar</Text></Pressable>
      </View>

      <FlatList
        data={produtos}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingVertical: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8, color: '#0f172a' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  salvarBtn: { backgroundColor: '#16a34a', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  salvarTxt: { color: '#fff', fontWeight: '900' },
  item: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  itemNome: { fontWeight: '800', color: '#0f172a' },
  itemSub: { color: '#475569', marginTop: 4 },
  removeBtn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  removeTxt: { color: '#fff', fontWeight: '800' },
});
