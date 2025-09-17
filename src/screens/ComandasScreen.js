import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import db from '../storage/database';
import dayjs from 'dayjs';

export default function ComandasScreen() {
  const [comanda, setComanda] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [itens, setItens] = useState([]);
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    db.getAllAsync('SELECT * FROM produtos').then(setProdutos);
  }, []);

  function adicionarItem() {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    const item = { id: Date.now().toString(), produto, quantidade: parseInt(quantidade) };
    setItens([...itens, item]);
    setProdutoId('');
    setQuantidade('');
  }

  function encerrarComanda() {
    itens.forEach(item => {
      db.runAsync(
        'INSERT INTO vendas (data, comanda, produto_id, quantidade, preco_unit) VALUES (?, ?, ?, ?, ?)',
        [dayjs().format('YYYY-MM-DD'), comanda, item.produto.id, item.quantidade, item.produto.preco]
      );
    });
    setItens([]);
    setComanda('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Abrir Comanda</Text>
      <TextInput placeholder="Número da comanda" value={comanda} onChangeText={setComanda} style={styles.input} />
      <TextInput placeholder="ID do Produto" value={produtoId} onChangeText={setProdutoId} style={styles.input} />
      <TextInput placeholder="Quantidade" value={quantidade} onChangeText={setQuantidade} style={styles.input} keyboardType="numeric" />
      <Button title="Adicionar Item" onPress={adicionarItem} />
      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>{item.quantidade}x {item.produto.nome} - R$ {(item.produto.preco * item.quantidade).toFixed(2)}</Text>
        )}
      />
      <Button title="Encerrar Comanda" onPress={encerrarComanda} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, marginBottom: 10, padding: 8 },
});
