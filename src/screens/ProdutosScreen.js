import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Alert } from 'react-native';
import { getDb } from '../storage/database';

export default function ProdutosScreen() {
  const [id, setId] = useState('');
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [lista, setLista] = useState([]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const db = await getDb();
    const rows = await db.getAllAsync('SELECT * FROM produtos ORDER BY nome ASC');
    setLista(rows);
  }

  async function salvar() {
    if (!id || !nome || !preco) {
      Alert.alert('Campos obrigatórios', 'Preencha ID, Nome e Preço.');
      return;
    }
    const p = Number(preco.toString().replace(',', '.'));
    if (Number.isNaN(p) || p <= 0) {
      Alert.alert('Preço inválido', 'Use número maior que zero (ex: 5.50).');
      return;
    }
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO produtos (id, nome, preco) VALUES (?, ?, ?)', [id.trim(), nome.trim(), p]);
    setId(''); setNome(''); setPreco('');
    carregar();
  }

  async function remover(prodId) {
    Alert.alert('Remover produto', `Deseja remover o produto ${prodId}?`, [
      { text: 'Cancelar' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        const db = await getDb();
        await db.runAsync('DELETE FROM produtos WHERE id = ?', [prodId]);
        carregar();
      } }
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Produtos</Text>

      <View style={styles.form}>
        <TextInput placeholder="ID do produto" value={id} onChangeText={setId} style={styles.input} />
        <TextInput placeholder="Nome do produto" value={nome} onChangeText={setNome} style={styles.input} />
        <TextInput placeholder="Preço (ex: 7.50)" value={preco} onChangeText={setPreco} style={styles.input} keyboardType="decimal-pad" />
        <Pressable style={styles.btn} onPress={salvar}><Text style={styles.btnText}>Salvar / Atualizar</Text></Pressable>
      </View>

      <FlatList
        data={lista}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.nome}</Text>
              <Text style={styles.itemSub}>ID: {item.id} • R$ {Number(item.preco).toFixed(2)}</Text>
            </View>
            <Pressable onPress={() => remover(item.id)}>
              <Text style={styles.remove}>Remover</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 16, color: '#666' }}>Nenhum produto cadastrado.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  form: { gap: 8, backgroundColor: '#f6f6f6', padding: 12, borderRadius: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
  btn: { backgroundColor: '#2e7d32', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 10, marginTop: 8, backgroundColor: '#fff' },
  itemName: { fontWeight: '700' },
  itemSub: { color: '#666', marginTop: 2 },
  remove: { color: '#c62828', fontWeight: '700' }
});
