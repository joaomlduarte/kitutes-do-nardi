// src/screens/HistoricoScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { initDb } from '../storage/database';

export default function HistoricoScreen() {
  const [vendas, setVendas] = useState([]);

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function carregarHistorico() {
    const db = await initDb();
    try {
      const data = await db.getAllAsync(
        'SELECT * FROM vendas',
        []
      );

      // Ordenar por comanda em ordem alfabética
      const ordenadas = data.sort((a, b) =>
        a.comanda.localeCompare(b.comanda, 'pt', { sensitivity: 'base' })
      );

      setVendas(ordenadas);
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Histórico de Vendas</Text>
      <FlatList
        data={vendas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.vendaItem}>
            <Text style={styles.texto}>
              <Text style={styles.label}>Comanda: </Text>{item.comanda}
            </Text>
            <Text style={styles.texto}>
              <Text style={styles.label}>Produto: </Text>{item.produto_id}
            </Text>
            <Text style={styles.texto}>
              <Text style={styles.label}>Quantidade: </Text>{item.quantidade}
            </Text>
            <Text style={styles.texto}>
              <Text style={styles.label}>Preço Unitário: </Text>R$ {item.preco_unit.toFixed(2)}
            </Text>
            <Text style={styles.texto}>
              <Text style={styles.label}>Data: </Text>{item.data}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#fff',
  },
  vendaItem: {
    padding: 16,
    marginBottom: 10,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
  },
  texto: {
    fontSize: 16,
    color: '#fff',
  },
  label: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});
