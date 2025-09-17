// src/screens/HistoricoScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, Pressable } from 'react-native';
import dayjs from 'dayjs';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getDb } from '../storage/database';

export default function HistoricoScreen() {
  const [data, setData] = useState(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const dataSql = dayjs(data).format('YYYY-MM-DD');
  const dataLabel = dayjs(data).format('DD/MM/YYYY');

  const [vendas, setVendas] = useState([]);
  const [produtos, setProdutos] = useState([]);

  async function carregar() {
    const db = await getDb();
    const vs = await db.getAllAsync('SELECT * FROM vendas WHERE data = ?', [dataSql]);
    const ps = await db.getAllAsync('SELECT * FROM produtos');
    setVendas(vs);
    setProdutos(ps);
  }

  useEffect(() => { carregar(); }, [dataSql]);

  const nomePorId = useMemo(() => new Map(produtos.map(p => [String(p.id), p.nome])), [produtos]);

  const linhas = useMemo(() => {
    return vendas
      .map(v => {
        const nome = nomePorId.get(String(v.produto_id)) || String(v.produto_id);
        const qtd = Number(v.quantidade) || 0;
        const unit = Number(v.preco_unit) || 0;
        const tot = qtd * unit;
        return {
          id: v.id,
          comanda: v.comanda,
          nome,
          quantidade: qtd,
          preco: unit,
          total: tot,
        };
      })
      .sort((a, b) => b.id - a.id);
  }, [vendas, nomePorId]);

  const totalGeral = useMemo(() => linhas.reduce((acc, l) => acc + l.total, 0), [linhas]);

  function abrirPicker() { setPickerVisible(true); }
  function onChangeDate(_, selected) { setPickerVisible(false); if (selected) setData(selected); }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico do dia</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Data:</Text>
        <Pressable style={styles.btn} onPress={abrirPicker}>
          <Text style={styles.btnText}>{dataLabel}</Text>
        </Pressable>
      </View>

      {pickerVisible && (
        <DateTimePicker
          value={data}
          onChange={onChangeDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
        />
      )}

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total do dia</Text>
        <Text style={styles.totalValue}>R$ {totalGeral.toFixed(2)}</Text>
      </View>

      <FlatList
        data={linhas}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemNome}>{item.nome}</Text>
            <Text style={styles.itemSub}>
              Comanda #{item.comanda} • Qtd: {item.quantidade} • Unit: R$ {item.preco.toFixed(2)}
            </Text>
            <Text style={styles.itemTotal}>R$ {item.total.toFixed(2)}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={styles.empty}>Sem vendas na data.</Text>}
        contentContainerStyle={{ paddingVertical: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  label: { fontWeight: '700', color: '#0f172a' },
  btn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnText: { fontWeight: '800', color: '#0f172a' },
  totalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 },
  totalLabel: { color: '#64748b', fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  itemNome: { fontWeight: '800', color: '#0f172a' },
  itemSub: { color: '#475569', marginTop: 2 },
  itemTotal: { marginTop: 4, fontWeight: '900', color: '#0f172a' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 8 },
});
