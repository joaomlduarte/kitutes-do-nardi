// src/screens/ComandaDetailScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Input from '../components/Input';
import { COLORS, RADII, SPACING } from '../theme';
import { dbRun, dbSelectAll } from '../storage/database';

export default function ComandaDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const id = route?.params?.id;

  const [comanda, setComanda] = useState(null);
  const [itens, setItens] = useState([]);
  const [produto, setProduto] = useState('');
  const [qtd, setQtd] = useState('1');
  const [obs, setObs] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    if (id == null) {
      Alert.alert('Erro', 'ID da comanda não informado.');
      navigation.goBack();
      return;
    }
    try {
      setLoading(true);
      const c = await dbSelectAll(`SELECT * FROM comandas WHERE id = ?;`, [id]);
      if (!c.length) {
        Alert.alert('Erro', 'Comanda não encontrada.');
        navigation.goBack();
        return;
      }
      const its = await dbSelectAll(
        `SELECT * FROM itens WHERE comanda_id = ? ORDER BY id ASC;`,
        [id]
      );
      setComanda(c[0]);
      setItens(its);
      navigation.setOptions({
        title: c[0]?.nome ? `Comanda: ${c[0].nome}` : `Comanda #${c[0].id}`,
      });
    } catch (e) {
      Alert.alert('Erro', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', carregar);
    carregar();
    return unsub;
  }, [navigation, id]);

  // Autocomplete (2+ letras)
  useEffect(() => {
    const term = (produto || '').trim();
    if (term.length < 2) {
      setSugestoes([]);
      return;
    }
    (async () => {
      const rows = await dbSelectAll(
        `SELECT id, nome, preco FROM produtos WHERE nome LIKE ? ORDER BY nome LIMIT 8;`,
        [`%${term}%`]
      );
      setSugestoes(rows);
    })();
  }, [produto]);

  const selecionarSugestao = (p) => {
    setProduto(p.nome);
    setSugestoes([]);
  };

  const obterPrecoDoProduto = async (nome) => {
    const row = await dbSelectAll(
      `SELECT preco FROM produtos WHERE nome = ? LIMIT 1;`,
      [nome]
    );
    if (!row.length) return NaN;
    const n = Number(row[0].preco);
    return Number.isFinite(n) ? n : NaN;
  };

  const addItem = async () => {
    const p = (produto || '').trim();
    const q = Number(qtd);

    if (!p) return Alert.alert('Atenção', 'Informe o produto.');
    if (!Number.isFinite(q) || q <= 0) return Alert.alert('Atenção', 'Qtd inválida.');

    try {
      // pega o preço do cadastro de produtos
      const preco = await obterPrecoDoProduto(p);
      if (!Number.isFinite(preco)) {
        Alert.alert(
          'Produto não encontrado',
          'Cadastre o produto com seu preço na aba Produtos antes de adicionar à comanda.'
        );
        return;
      }

      await dbRun(
        `INSERT INTO itens (comanda_id, produto, qtd, preco_unit, obs) VALUES (?, ?, ?, ?, ?);`,
        [id, p, q, preco, obs?.trim() || null]
      );

      // limpeza e refresh
      setProduto('');
      setQtd('1');
      setObs('');
      await carregar();
    } catch (e) {
      Alert.alert('Erro', String(e?.message || e));
    }
  };

  const removerItem = async (itemId) => {
    try {
      await dbRun(`DELETE FROM itens WHERE id = ?;`, [itemId]);
      await carregar();
    } catch (e) {
      Alert.alert('Erro', String(e?.message || e));
    }
  };

  const fecharComanda = async () => {
    Alert.alert('Finalizar', 'Deseja fechar esta comanda?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Fechar',
        style: 'destructive',
        onPress: async () => {
          try {
            await dbRun(`UPDATE comandas SET status = 'fechada' WHERE id = ?;`, [id]);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Erro', String(e?.message || e));
          }
        },
      },
    ]);
  };

  const total = useMemo(() => {
    return itens.reduce((acc, it) => {
      const q = Number(it.qtd) || 0;
      const pr = Number(it.preco_unit);
      return acc + q * (Number.isFinite(pr) ? pr : 0);
    }, 0);
  }, [itens]);

  if (!comanda) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Carregando comanda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com ação de finalizar */}
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Itens da Comanda</Text>
        <Pressable
          style={[styles.btnWarn, { opacity: loading ? 0.6 : 1 }]}
          onPress={fecharComanda}
          disabled={loading}
        >
          <Text style={styles.btnWarnTxt}>Fechar comanda</Text>
        </Pressable>
      </View>

      {/* Form de item (sem preço) */}
      <View style={styles.row}>
        <View style={{ flex: 2 }}>
          <Input placeholder="Produto" value={produto} onChangeText={setProduto} />
          {sugestoes.length > 0 && (
            <View style={styles.suggestBox}>
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={sugestoes}
                keyExtractor={(it, idx) => (it?.id ? String(it.id) : `s-${idx}`)}
                renderItem={({ item }) => (
                  <Pressable style={styles.suggestItem} onPress={() => selecionarSugestao(item)}>
                    <Text style={styles.suggestName}>{item.nome}</Text>
                    <Text style={styles.suggestPrice}>R$ {(Number(item.preco) || 0).toFixed(2)}</Text>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORS.border }} />}
              />
            </View>
          )}
        </View>

        <Input style={{ flex: 1 }} placeholder="Qtd" keyboardType="numeric" value={qtd} onChangeText={setQtd} />
      </View>

      <Input placeholder="Observação (opcional)" value={obs} onChangeText={setObs} />

      <Pressable style={styles.btnPrimary} onPress={addItem} disabled={loading}>
        <Text style={styles.btnPrimaryTxt}>Adicionar</Text>
      </Pressable>

      {/* Lista de itens */}
      <FlatList
        style={{ marginTop: SPACING.lg }}
        data={itens}
        keyExtractor={(it, idx) => (it?.id ? String(it.id) : `i-${idx}`)}
        ListEmptyComponent={<Text style={styles.empty}>Sem itens.</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemNome}>{item.produto}</Text>
              <Text style={styles.itemSub}>
                Qtd: {item.qtd} • Preço: R$ {(Number(item.preco_unit) || 0).toFixed(2)}
              </Text>
              {item.obs ? <Text style={styles.itemObs}>Obs: {item.obs}</Text> : null}
            </View>
            <Pressable style={styles.btnDanger} onPress={() => removerItem(item.id)}>
              <Text style={styles.btnDangerTxt}>Remover</Text>
            </Pressable>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
      />

      {/* Total */}
      <View style={styles.totalBox}>
        <Text style={styles.totalTxt}>Total: R$ {total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.lg },
  h1: { fontSize: 18, fontWeight: '900', color: COLORS.text },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },

  row: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start', marginBottom: SPACING.md },

  btnPrimary: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADII.md,
    marginTop: SPACING.sm,
  },
  btnPrimaryTxt: { color: '#fff', fontWeight: '900' },

  btnWarn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  btnWarnTxt: { color: '#1f2937', fontWeight: '900' },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADII.md,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  itemNome: { fontWeight: '800', color: COLORS.text },
  itemSub: { color: COLORS.textMuted, marginTop: 4 },
  itemObs: { color: COLORS.text, marginTop: 4, fontStyle: 'italic' },

  btnDanger: { backgroundColor: COLORS.danger, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADII.sm },
  btnDangerTxt: { color: '#fff', fontWeight: '800' },

  totalBox: { marginTop: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.lg, alignItems: 'flex-end' },
  totalTxt: { fontSize: 16, fontWeight: '900', color: COLORS.text },

  // Autocomplete
  suggestBox: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.card,
    maxHeight: 180,
    overflow: 'hidden',
  },
  suggestItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  suggestName: { color: COLORS.text, fontWeight: '600' },
  suggestPrice: { color: COLORS.textMuted },
  empty: { color: '#64748b', textAlign: 'center', marginTop: SPACING.md },
});
