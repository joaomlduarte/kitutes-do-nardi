// src/screens/DashboardScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import { getDb } from '../storage/database';
import { VictoryPie, VictoryChart, VictoryBar, VictoryAxis } from 'victory-native';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const [dataRef, setDataRef] = useState(new Date());
  const dataSql = dayjs(dataRef).format('YYYY-MM-DD');
  const dataLabel = dayjs(dataRef).format('DD/MM/YYYY');

  const [vendas, setVendas] = useState([]);
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    async function load() {
      const db = await getDb();
      const vs = await db.getAllAsync('SELECT * FROM vendas WHERE data = ?', [dataSql]);
      const ps = await db.getAllAsync('SELECT * FROM produtos');
      setVendas(vs);
      setProdutos(ps);
    }
    load();
  }, [dataSql]);

  const nomePorId = useMemo(() => new Map(produtos.map(p => [String(p.id), p.nome])), [produtos]);

  const resumo = useMemo(() => {
    let total = 0;
    let qtdItens = 0;
    const porProduto = new Map(); // nome -> { qtd, total }
    const porComanda = new Map(); // comanda -> total

    for (const v of vendas) {
      const qtd = Number(v.quantidade) || 0;
      const unit = Number(v.preco_unit) || 0;
      const tot = qtd * unit;
      total += tot;
      qtdItens += qtd;

      const nome = nomePorId.get(String(v.produto_id)) || String(v.produto_id);
      const acc = porProduto.get(nome) || { qtd: 0, total: 0 };
      acc.qtd += qtd;
      acc.total += tot;
      porProduto.set(nome, acc);

      porComanda.set(v.comanda, (porComanda.get(v.comanda) || 0) + tot);
    }

    const topProdutos = Array.from(porProduto.entries())
      .map(([nome, v]) => ({ nome, qtd: v.qtd, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const porComandaArr = Array.from(porComanda.entries())
      .map(([comanda, total]) => ({ comanda, total }))
      .sort((a, b) => b.total - a.total);

    return { total, qtdItens, topProdutos, porComandaArr };
  }, [vendas, nomePorId]);

  const graficoPieData = resumo.topProdutos.length
    ? resumo.topProdutos.map((p) => ({ x: p.nome, y: Number(p.total.toFixed(2)) }))
    : [{ x: 'Sem vendas', y: 1 }];

  const graficoBarData = resumo.porComandaArr.length
    ? resumo.porComandaArr.slice(0, 8).map((c) => ({ x: `#${c.comanda}`, y: Number(c.total.toFixed(2)) }))
    : [{ x: '-', y: 0 }];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 16 }}>
      <Text style={styles.title}>Visão geral — {dataLabel}</Text>

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Arrecadação do dia</Text>
          <Text style={styles.cardValue}>R$ {resumo.total.toFixed(2)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Itens vendidos</Text>
          <Text style={styles.cardValue}>{resumo.qtdItens}</Text>
        </View>
      </View>

      <Text style={styles.section}>Produtos que mais saíram</Text>
      <View style={styles.chartWrap}>
        <VictoryPie
          width={width - 32}
          height={260}
          data={graficoPieData}
          labels={({ datum }) => `${datum.x}\nR$ ${datum.y.toFixed?.(2) ?? datum.y}`}
          innerRadius={60}
          padAngle={2}
        />
      </View>

      <Text style={styles.section}>Comandas com maior consumo</Text>
      <View style={styles.chartWrap}>
        <VictoryChart width={width - 32} height={260} domainPadding={{ x: 20, y: 20 }}>
          <VictoryAxis style={{ tickLabels: { angle: -25, fontSize: 10 } }} />
          <VictoryAxis dependentAxis />
          <VictoryBar data={graficoBarData} />
        </VictoryChart>
      </View>

      <Text style={styles.section}>Top produtos (lista)</Text>
      <FlatList
        data={resumo.topProdutos}
        keyExtractor={(i, idx) => String(idx)}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>{item.nome}</Text>
            <Text style={styles.itemRight}>Qtd: {item.qtd} • R$ {item.total.toFixed(2)}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={styles.empty}>Sem vendas no dia.</Text>}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  cardsRow: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  cardLabel: { color: '#64748b', marginBottom: 6, fontWeight: '600' },
  cardValue: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  section: { marginTop: 16, fontWeight: '800', color: '#0f172a' },
  chartWrap: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 8 },
  itemRow: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { fontWeight: '800', color: '#0f172a' },
  itemRight: { color: '#475569' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 8 },
});
