// src/screens/ProdutosScreen.js
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { dbSelectAll, dbRun } from '../storage/database';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ProdutosScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await dbSelectAll('SELECT * FROM produtos ORDER BY nome COLLATE NOCASE ASC;');
      setRows(r || []);
    } catch (e) {
      console.log('[Produtos] erro:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const salvar = async () => {
    const nm = (nome || '').trim();
    if (!nm) {
      Alert.alert('Nome obrigatório', 'Informe o nome do produto.');
      return;
    }
    let pr = parseFloat(String(preco).replace(',', '.'));
    if (Number.isNaN(pr)) pr = 0;

    try {
      const r = await dbSelectAll('SELECT id FROM produtos WHERE nome = ?;', [nm]);
      if (r?.length) {
        await dbRun('UPDATE produtos SET nome = ?, preco = ?, updated_at = datetime(\'now\') WHERE id = ?;', [nm, pr, r[0].id]);
      } else {
        await dbRun('INSERT INTO produtos (nome, preco, updated_at) VALUES (?, ?, datetime(\'now\'));', [nm, pr]);
      }
      setNome('');
      setPreco('');
      await carregar();
    } catch (e) {
      console.log('[Produtos] salvar erro:', e);
      Alert.alert('Erro', 'Não foi possível salvar o produto.');
    }
  };

  const remover = async (id) => {
    try {
      await dbRun('DELETE FROM produtos WHERE id = ?;', [id]);
      await carregar();
    } catch (e) {
      console.log('[Produtos] remover erro:', e);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.rowCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.nome}>{item.nome}</Text>
        <Text style={styles.meta}>id: {item.id} • R$ {Number(item.preco || 0).toFixed(2)}</Text>
      </View>
      <TouchableOpacity onPress={() => remover(item.id)} style={styles.btnDel}>
        <Text style={styles.btnDelTxt}>Excluir</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Produtos</Text>

      <View style={styles.formRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Nome do produto"
          value={nome}
          onChangeText={setNome}
          placeholderTextColor={COLORS.hint}
        />
        <TextInput
          style={[styles.input, { width: 120 }]}
          placeholder="Preço"
          keyboardType="decimal-pad"
          value={preco}
          onChangeText={setPreco}
          placeholderTextColor={COLORS.hint}
        />
        <TouchableOpacity style={styles.btnAdd} onPress={salvar}>
          <Text style={styles.btnAddTxt}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={{ flex: 1, marginTop: SPACING.lg }}
        data={rows}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} />}
        ListEmptyComponent={!loading && (
          <Text style={styles.emptyText}>Nenhum produto cadastrado.</Text>
        )}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: SPACING.xl,
    backgroundColor: COLORS.bg
  },
  title: { 
    fontSize: FONT.size.xl, 
    fontWeight: FONT.weight.black,
    color: COLORS.text
  },
  formRow: { 
    flexDirection: 'row', 
    gap: SPACING.sm, 
    marginTop: SPACING.lg, 
    alignItems: 'center' 
  },
  input: { 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADII.md, 
    paddingHorizontal: SPACING.lg, 
    height: 44,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    fontSize: FONT.size.md
  },
  btnAdd: { 
    backgroundColor: COLORS.primary, 
    borderRadius: RADII.md, 
    paddingHorizontal: SPACING.lg, 
    height: 44, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  btnAddTxt: { 
    color: COLORS.card, 
    fontWeight: FONT.weight.black,
    fontSize: FONT.size.md
  },
  rowCard: { 
    flexDirection: 'row', 
    gap: SPACING.sm, 
    padding: SPACING.lg, 
    backgroundColor: COLORS.card, 
    borderRadius: RADII.lg, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  nome: { 
    fontSize: FONT.size.md, 
    fontWeight: FONT.weight.bold,
    color: COLORS.text
  },
  meta: { 
    color: COLORS.textMuted, 
    marginTop: 2,
    fontSize: FONT.size.sm
  },
  btnDel: { 
    backgroundColor: COLORS.danger, 
    borderRadius: RADII.sm, 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.sm 
  },
  btnDelTxt: { 
    color: COLORS.card, 
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.sm
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
    fontSize: FONT.size.base,
    textAlign: 'center'
  },
});