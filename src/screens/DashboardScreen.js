import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import db from '../storage/database';
import dayjs from 'dayjs';

export default function DashboardScreen() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const hoje = dayjs().format('YYYY-MM-DD');
    db.getAllAsync('SELECT quantidade, preco_unit FROM vendas WHERE data = ?', [hoje]).then(rows => {
      const soma = rows.reduce((acc, r) => acc + r.quantidade * r.preco_unit, 0);
      setTotal(soma);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Dashboard</Text>
      <Text>Total arrecadado hoje: R$ {total.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
});
