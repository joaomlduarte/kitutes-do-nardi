// src/screens/DashboardScreen.js
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { dbSelectAll } from '../storage/database';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState({
    comandasAbertas: 0,
    comandasFechadas: 0,
    totalProdutos: 0,
    totalItensHoje: 0,
    faturamentoHoje: 0,
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const abertas = await dbSelectAll("SELECT COUNT(*) AS c FROM comandas WHERE status = 'aberta';");
      const fechadas = await dbSelectAll("SELECT COUNT(*) AS c FROM comandas WHERE status = 'fechada';");
      const produtos = await dbSelectAll('SELECT COUNT(*) AS c FROM produtos;');

      // simples: itens do dia = todos (ajuste se tiver timestamp em itens)
      const itens = await dbSelectAll('SELECT qtd, preco_unit FROM itens;');
      const totalItens = itens.reduce((acc, it) => acc + Number(it.qtd || 0), 0);
      const faturamento = itens.reduce((acc, it) => acc + (Number(it.qtd || 0) * Number(it.preco_unit || 0)), 0);

      setCards({
        comandasAbertas: abertas?.[0]?.c || 0,
        comandasFechadas: fechadas?.[0]?.c || 0,
        totalProdutos: produtos?.[0]?.c || 0,
        totalItensHoje: totalItens,
        faturamentoHoje: Number(faturamento.toFixed(2)),
      });
    } catch (e) {
      console.log('[Dashboard] erro:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} />}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.grid}>
        <Card label="Comandas abertas" value={cards.comandasAbertas} />
        <Card label="Comandas fechadas" value={cards.comandasFechadas} />
        <Card label="Produtos" value={cards.totalProdutos} />
        <Card label="Itens (total)" value={cards.totalItensHoje} />
        <Card label="Faturamento (R$)" value={cards.faturamentoHoje} />
      </View>
    </ScrollView>
  );
}

function Card({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: COLORS.bg
  },
  content: { 
    padding: SPACING.xl, 
    gap: SPACING.lg 
  },
  title: { 
    fontSize: FONT.size.xxl, 
    fontWeight: FONT.weight.bold,
    color: COLORS.text
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: SPACING.lg 
  },
  card: { 
    width: '47%', 
    backgroundColor: COLORS.card, 
    borderRadius: RADII.lg, 
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardLabel: { 
    fontSize: FONT.size.sm, 
    color: COLORS.textMuted 
  },
  cardValue: { 
    marginTop: 4, 
    fontSize: FONT.size.xxl, 
    fontWeight: FONT.weight.black,
    color: COLORS.text
  },
});