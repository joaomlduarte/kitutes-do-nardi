import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import dayjs from 'dayjs';
import { getDb } from '../storage/database';
import { VictoryChart, VictoryAxis, VictoryBar, VictoryArea, VictoryTheme, VictoryTooltip, VictoryLabel } from 'victory-native';

/**
 * Dashboard bonito e responsivo:
 * - Cards de métricas do dia
 * - Gráfico de barras: Top produtos (hoje)
 * - Gráfico de área: Faturamento últimos 7 dias
 *
 * Observação: o banco salva vendas por data (YYYY-MM-DD).
 * Para o histórico de 7 dias, buscamos cada dia individualmente.
 */

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900; // tablet em paisagem
  const [refreshing, setRefreshing] = useState(false);

  const [hojeTotal, setHojeTotal] = useState(0);
  const [hojeQtdItens, setHojeQtdItens] = useState(0);
  const [hojeQtdComandas, setHojeQtdComandas] = useState(0);
  const [topProdutos, setTopProdutos] = useState([]); // [{x: 'Coxinha', y: 42}]
  const [serie7d, setSerie7d] = useState([]); // [{x:'12/09', y: 120.5}]

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setRefreshing(true);
    try {
      const db = await getDb();
      const hoje = dayjs().format('YYYY-MM-DD');

      // Produtos (para mapear id->nome)
      const produtos = await db.getAllAsync('SELECT * FROM produtos ORDER BY nome ASC');
      const nomePorId = new Map(produtos.map(p => [String(p.id), p.nome]));

      // --- VENDAS HOJE (para cards e top produtos)
      const vendasHoje = await db.getAllAsync('SELECT * FROM vendas WHERE data = ?', [hoje]);
      const totalHoje = vendasHoje.reduce((s, v) => s + Number(v.quantidade) * Number(v.preco_unit), 0);
      const qtdItensHoje = vendasHoje.reduce((s, v) => s + Number(v.quantidade), 0);
      const comandasSet = new Set(vendasHoje.map(v => v.comanda));
      const qtdComandasHoje = comandasSet.size;

      // Top produtos (por valor arrecadado no dia)
      const porProduto = new Map();
      for (const v of vendasHoje) {
        const key = String(v.produto_id);
        const valor = Number(v.quantidade) * Number(v.preco_unit);
        porProduto.set(key, (porProduto.get(key) || 0) + valor);
      }
      // pega os 6 melhores e troca id -> nome
      const top = Array.from(porProduto.entries())
        .map(([id, valor]) => ({ id, nome: nomePorId.get(id) || id, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 6)
        .map((it) => ({ x: it.nome, y: Number(it.valor.toFixed(2)) }));

      // --- Últimos 7 dias (de hoje -6 até hoje)
      const serie = [];
      for (let i = 6; i >= 0; i--) {
        const d = dayjs().subtract(i, 'day');
        const dataStr = d.format('YYYY-MM-DD');
        const vendasDia = await db.getAllAsync('SELECT quantidade, preco_unit FROM vendas WHERE data = ?', [dataStr]);
        const total = vendasDia.reduce((s, v) => s + Number(v.quantidade) * Number(v.preco_unit), 0);
        serie.push({ x: d.format('DD/MM'), y: Number(total.toFixed(2)) });
      }

      setHojeTotal(Number(totalHoje.toFixed(2)));
      setHojeQtdItens(qtdItensHoje);
      setHojeQtdComandas(qtdComandasHoje);
      setTopProdutos(top);
      setSerie7d(serie);
    } finally {
      setRefreshing(false);
    }
  }

  const cards = useMemo(() => ([
    { title: 'Faturamento (hoje)', value: `R$ ${hojeTotal.toFixed(2)}` },
    { title: 'Itens vendidos (hoje)', value: String(hojeQtdItens) },
    { title: 'Comandas fechadas (hoje)', value: String(hojeQtdComandas) },
  ]), [hojeTotal, hojeQtdItens, hojeQtdComandas]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.container, isWide && styles.containerWide]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={carregar} />}
    >
      {/* HEADER */}
      <View style={[styles.headerRow, isWide && styles.headerRowWide]}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>{dayjs().format('[Hoje] ddd, DD/MM/YYYY')}</Text>
      </View>

      {/* CARDS */}
      <View style={[styles.cards, isWide && styles.cardsWide]}>
        {cards.map((c, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <Text style={styles.cardValue}>{c.value}</Text>
          </View>
        ))}
      </View>

      {/* GRAFICOS */}
      <View style={[styles.chartsRow, isWide && styles.chartsRowWide]}>
        {/* Top produtos (barras) */}
        <View style={[styles.chartBox, isWide && styles.chartBoxWide]}>
          <Text style={styles.chartTitle}>Top produtos (hoje)</Text>
          {topProdutos.length === 0 ? (
            <Text style={styles.empty}>Sem vendas hoje.</Text>
          ) : (
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={{ x: [20, 20], y: 30 }}
              padding={{ top: 30, left: 60, right: 20, bottom: 80 }}
              height={320}
            >
              <VictoryAxis
                style={{
                  tickLabels: { angle: -30, fontSize: 11, padding: 18 },
                  grid: { stroke: '#eee' },
                }}
              />
              <VictoryAxis
                dependentAxis
                tickFormat={(t) => `R$ ${t}`}
                style={{ grid: { stroke: '#f1f1f1' }, tickLabels: { fontSize: 11 } }}
              />
              <VictoryBar
                data={topProdutos}
                labels={({ datum }) => `R$ ${datum.y.toFixed(2)}`}
                labelComponent={<VictoryTooltip flyoutPadding={6} />}
                barRatio={0.8}
                cornerRadius={{ top: 6 }}
              />
            </VictoryChart>
          )}
        </View>

        {/* Série 7 dias (área) */}
        <View style={[styles.chartBox, isWide && styles.chartBoxWide]}>
          <Text style={styles.chartTitle}>Faturamento • últimos 7 dias</Text>
          {serie7d.length === 0 ? (
            <Text style={styles.empty}>Sem dados.</Text>
          ) : (
            <VictoryChart
              theme={VictoryTheme.material}
              padding={{ top: 30, left: 60, right: 20, bottom: 50 }}
              height={320}
            >
              <VictoryAxis
                style={{ tickLabels: { fontSize: 11 }, grid: { stroke: '#eee' } }}
              />
              <VictoryAxis
                dependentAxis
                tickFormat={(t) => `R$ ${t}`}
                style={{ grid: { stroke: '#f1f1f1' }, tickLabels: { fontSize: 11 } }}
              />
              <VictoryArea
                data={serie7d}
                interpolation="monotoneX"
                labels={({ datum }) => `R$ ${datum.y.toFixed(2)}`}
                labelComponent={<VictoryTooltip flyoutPadding={6} />}
                style={{
                  data: { opacity: 0.9 },
                }}
              />
            </VictoryChart>
          )}
        </View>
      </View>

      {/* Rodapé leve */}
      <View style={{ height: 16 }} />
      <Text style={styles.legend}>
        Toque e arraste nos gráficos para ver os valores (tooltip).
      </Text>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  containerWide: { paddingHorizontal: 24, maxWidth: 1200, alignSelf: 'center' },

  headerRow: { gap: 6 },
  headerRowWide: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },

  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#6A6A6A', fontWeight: '600' },

  cards: { gap: 12 },
  cardsWide: { flexDirection: 'row' },

  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { color: '#6A6A6A', fontWeight: '700' },
  cardValue: { marginTop: 6, fontSize: 22, fontWeight: '900' },

  chartsRow: { gap: 16 },
  chartsRowWide: { flexDirection: 'row' },

  chartBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 16,
    padding: 12,
  },
  chartBoxWide: { minWidth: 0 },

  chartTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  empty: { color: '#888', padding: 8 },

  legend: { alignSelf: 'center', color: '#8a8a8a' },
});
