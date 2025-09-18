// src/screens/ProdutosScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import Input from '../components/Input';
import { COLORS, RADII, SPACING } from '../theme';
import { dbRun, dbSelectAll } from '../storage/database';

export default function ProdutosScreen() {
  const [produtos, setProdutos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const rows = await dbSelectAll(`SELECT * FROM produtos ORDER BY nome COLLATE NOCASE ASC;`);
      setProdutos(rows);
    } catch (e) {
      Alert.alert('Erro', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const parsePreco = (val) => {
    // aceita "12,34" ou "12.34"
    const n = Number(String(val).replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
    };

  const limparForm = () => {
    setEditingId(null);
    setNome('');
    setPreco('');
  };

  const salvar = async () => {
    const nomeTrim = nome.trim();
    const valor = parsePreco(preco);
    if (!nomeTrim) return Alert.alert('Atenção', 'Informe o nome do produto.');
    if (!Number.isFinite(valor) || valor < 0) return Alert.alert('Atenção', 'Preço inválido.');

    try {
      if (editingId == null) {
        // INSERT
        await dbRun(`INSERT INTO produtos (nome, preco) VALUES (?, ?);`, [nomeTrim, valor]);
      } else {
        // UPDATE por id
        await dbRun(`UPDATE produtos SET nome = ?, preco = ? WHERE id = ?;`, [nomeTrim, valor, editingId]);
      }
      limparForm();
      await carregar();
    } catch (e) {
      Alert.alert('Erro ao salvar', String(e?.message || e));
    }
  };

  const editar = (p) => {
    setEditingId(p.id);
    setNome(p.nome ?? '');
    setPreco((Number(p.preco) || 0).toString().replace('.', ','));
  };

  const excluir = async (id) => {
    Alert.alert('Excluir', 'Deseja remover este produto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await dbRun(`DELETE FROM produtos WHERE id = ?;`, [id]);
            if (editingId === id) limparForm();
            await carregar();
          } catch (e) {
            Alert.alert('Erro', String(e?.message || e));
          }
        },
      },
    ]);
  };

  const emEdicao = editingId != null;

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{emEdicao ? 'Editar produto' : 'Novo produto'}</Text>

      <View style={styles.formRow}>
        <Input
          style={{ flex: 2 }}
          placeholder="Nome do produto"
          value={nome}
          onChangeText={setNome}
          autoCapitalize="words"
        />
        <Input
          style={{ flex: 1 }}
          placeholder="Preço"
          keyboardType="decimal-pad"
          value={preco}
          onChangeText={setPreco}
        />
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={[styles.btnPrimary, { opacity: loading ? 0.7 : 1 }]} onPress={salvar} disabled={loading}>
          <Text style={styles.btnPrimaryTxt}>{emEdicao ? 'Atualizar' : 'Salvar'}</Text>
        </Pressable>

        {emEdicao && (
          <Pressable style={styles.btnGhost} onPress={limparForm}>
            <Text style={styles.btnGhostTxt}>Cancelar</Text>
          </Pressable>
        )}
      </View>

      <Text style={[styles.h1, { marginTop: SPACING.xl }]}>Produtos</Text>

      <FlatList
        refreshing={loading}
        onRefresh={carregar}
        data={produtos}
        keyExtractor={(it, idx) => (it?.id != null ? String(it.id) : `p-${idx}`)}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum produto cadastrado.</Text>}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.nome}</Text>
              <Text style={styles.cardSub}>R$ {(Number(item.preco) || 0).toFixed(2)}</Text>
            </View>

            <View style={styles.cardBtns}>
              <Pressable style={styles.btnSmall} onPress={() => editar(item)}>
                <Text style={styles.btnSmallTxt}>Editar</Text>
              </Pressable>
              <Pressable style={[styles.btnSmall, styles.btnDanger]} onPress={() => excluir(item.id)}>
                <Text style={[styles.btnSmallTxt, { color: '#fff' }]}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: SPACING.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.lg },
  h1: { fontSize: 18, fontWeight: '900', color: COLORS.text, marginBottom: SPACING.md },

  formRow: { flexDirection: 'row', gap: SPACING.md },
  actionsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },

  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADII.md,
  },
  btnPrimaryTxt: { color: '#fff', fontWeight: '900' },

  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADII.md,
  },
  btnGhostTxt: { color: COLORS.text, fontWeight: '700' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADII.md,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontWeight: '800', color: COLORS.text },
  cardSub: { color: COLORS.textMuted, marginTop: 2 },

  cardBtns: { flexDirection: 'row', gap: SPACING.sm },
  btnSmall: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSmallTxt: { color: COLORS.text, fontWeight: '800' },

  btnDanger: { backgroundColor: COLORS.danger, borderColor: 'transparent' },

  empty: { color: '#64748b', textAlign: 'center', marginTop: SPACING.md },
});
