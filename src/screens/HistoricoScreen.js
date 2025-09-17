import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import db from '../storage/database';
import dayjs from 'dayjs';

export default function HistoricoScreen() {
  const [vendas, setVendas] = useState([]);

  useEffect(() => {
    carregar();
  }, []);

  function carregar() {
    const hoje = dayjs().format('YYYY-MM-DD');
    db.getAllAsync('SELECT * FROM vendas WHERE data = ?', [hoje]).then(setVendas);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Histórico do Dia</Text>
      <FlatList
        data={vendas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text>
            Comanda {item.comanda} - Produto {item.produto_id} - {item.quantidade}x - R$ {(item.quantidade * item.preco_unit).toFixed(2)}
          </Text>
        )}
      />
      <Button title="Recarregar" onPress={carregar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
});
