// src/screens/DashboardScreen.js
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, RADII, SPACING } from '../theme';
import { dbSelectAll } from '../storage/database';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState({
    abertas: 0,
    fechadas: 0,
    totalAbertas: 0,
    totalFechadas: 0,
    totalGeral: 0,
    top: [], // [{produto, qtd, valor}]
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const comandasAbertas = await dbSelectAll(`SELECT * FROM comandas WHERE status = 'aberta' ORDER BY nome COLLATE NOCASE ASC;`);
      const comandasFechadas = await dbSelectAll(`SELECT * FROM comandas WHERE status = 'fechada' ORDER BY nome COLLATE NOCASE ASC;`);

      // Busca itens por comanda (compatível com fallback em memória)
      const somaItens = async (lista) => {
        let total = 0;
        let mapaProdutos = new Map(); // nome -> {qtd, valor}
        for (const c of lista) {
          const its = await dbSelectAll(`SELECT * FROM itens WHERE comanda_id = ? ORDER BY id ASC;`, [c.id]);
          for (const it of its) {
            const q = Number(it.qtd) || 0;
            const pr = Number(it.preco_unit) || 0;
            const v = q * pr;
            total += v;
            const m = mapaProdutos.get(it.produto) || { qtd: 0, valor: 0 };
            m.qtd += q;
            m.valor += v;
            mapaProdutos.set(it.produto, m);
          }
        }
        return { total, mapaProdutos };
      };

      const { total: totA, mapaProdutos: mapaA } = await somaItens(comandasAbertas);
      const { total: totF, mapaProdutos: mapaF } = await somaItens(comandasFechadas);

      // top produtos combinando abertas+fechadas
      const mapaTop = new Map(mapaA);
      for (const [k, v] of mapaF.entries()) {
        const cur = mapaTop.get(k) || { qtd: 0, valor: 0 };
        mapaTop.set(k, { qtd: cur.qtd + v.qtd, valor: cur.valor + v.valor });
      }
      const top = Array.from(mapaTop.entries())
        .map(([produto, { qtd, valor }]) => ({ produto, qtd, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      setDados({
        abertas: comandasAbertas.length,
        fechadas: comandasFechadas.length,
        totalAbertas: totA,
        totalFechadas: totF,
        totalGeral: totA + totF,
        top,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Dashboard</Text>

      <View style={styles.grid}>
        <Card title="Comandas abertas" value={String(dados.abertas)} />
        <Card title="Comandas fechadas" value={String(dados.fechadas)} />
        <Card title="Total abertas" value={`R$ ${dados.totalAbertas.toFixed(2)}`} />
        <Card title="Total fechadas" value={`R$ ${dados.totalFechadas.toFixed(2)}`} />
        <Card title="Total geral" value={`R$ ${dados.totalGeral.toFixed(2)}`} wide />
      </View>

      <Text style={[styles.h2, { marginTop: SPACING.lg }]}>Top produtos</Text>
      <FlatList
        data={dados.top}
        keyExtractor={(it, idx) => `${it.produto}-${idx}`}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} />}
        ListEmptyComponent={<Text style={styles.empty}>Sem vendas registradas.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>{item.produto}</Text>
            <Text style={[styles.cell, { flex: 1, textAlign: 'right' }]}>{item.qtd}</Text>
            <Text style={[styles.cell, { flex: 1, textAlign: 'right' }]}>R$ {item.valor.toFixed(2)}</Text>
          </View>
        )}
        ListHeaderComponent={() => (
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6 }]}>
            <Text style={[styles.th, { flex: 2 }]}>Produto</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Qtd</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Valor</Text>
          </View>
        )}
      />
    </View>
  );
}

function Card({ title, value, wide }) {
  return (
    <View style={[styles.card, wide && { flexBasis: '100%' }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.lg },
  h1: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: SPACING.lg },
  h2: { fontSize: 16, fontWeight: '900', color: COLORS.text },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  card: {
    flexBasis: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADII.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  cardTitle: { color: COLORS.textMuted, marginBottom: 6 },
  cardValue: { color: COLORS.text, fontSize: 18, fontWeight: '900' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  th: { color: COLORS.textMuted, fontWeight: '800' },
  cell: { color: COLORS.text },

  empty: { color: '#64748b', textAlign: 'center', marginTop: SPACING.md },
});
