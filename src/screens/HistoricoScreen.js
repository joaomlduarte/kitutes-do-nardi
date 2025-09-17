import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { getDb } from '../storage/database';

export default function HistoricoScreen() {
  const [vendas, setVendas] = useState([]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const hoje = dayjs().format('YYYY-MM-DD');
    const db = await getDb();
    const rows = await db.getAllAsync('SELECT * FROM vendas WHERE data = ? ORDER BY id DESC', [hoje]);
    setVendas(rows);
  }

  const totalDia = vendas.reduce((a, v) => a + Number(v.quantidade) * Number(v.preco_unit), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico do Dia</Text>
      <FlatList
        data={vendas}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Text>
            Comanda {item.comanda} — {item.quantidade}x {item.produto_id} — R$ {(item.quantidade * item.preco_unit).toFixed(2)}
          </Text>
        )}
        ListEmptyComponent={<Text style={{ color: '#666' }}>Sem vendas hoje.</Text>}
      />
      <Text style={{ marginTop: 8, fontWeight: '700' }}>Total do dia: R$ {totalDia.toFixed(2)}</Text>
      <Button title="Recarregar" onPress={carregar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: '800' }
});
