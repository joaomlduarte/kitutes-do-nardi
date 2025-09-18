// src/screens/ComandaDetailScreen.js
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { dbSelectAll, dbRun } from '../storage/database';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ComandaDetailScreen() {
  const route = useRoute();
  const comandaId = route.params?.id ?? route.params?.comandaId;

  const [comanda, setComanda] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);

  // inputs
  const [produto, setProduto] = useState('');
  const [qtd, setQtd] = useState('1');
  const [preco, setPreco] = useState('');
  const [obs, setObs] = useState('');

  const carregar = useCallback(async () => {
    if (!comandaId) return;
    setLoading(true);
    try {
      const [c] = await dbSelectAll('SELECT * FROM comandas WHERE id = ?;', [comandaId]);
      const its = await dbSelectAll('SELECT * FROM itens WHERE comanda_id = ? ORDER BY id ASC;', [comandaId]);
      setComanda(c || null);
      setItens(its || []);
    } catch (e) {
      console.log('[ComandaDetail] erro:', e);
    } finally {
      setLoading(false);
    }
  }, [comandaId]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const addItem = async () => {
    const nome = (produto || '').trim();
    const nQtd = Math.max(1, parseInt(qtd || '1', 10) || 1);
    let nPreco = parseFloat(preco.replace(',', '.'));
    if (Number.isNaN(nPreco)) {
      // tenta pegar preço do catálogo
      const r = await dbSelectAll('SELECT preco FROM produtos WHERE nome = ?;', [nome]);
      if (r?.length) nPreco = Number(r[0].preco || 0);
      if (Number.isNaN(nPreco)) nPreco = 0;
    }

    if (!nome) {
      Alert.alert('Produto obrigatório', 'Digite o nome do produto.');
      return;
    }

    try {
      await dbRun(
        'INSERT INTO itens (comanda_id, produto, qtd, preco_unit, obs, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'));',
        [comandaId, nome, nQtd, nPreco, obs || null]
      );

      // upsert simples do produto (cadastra/atualiza pelo nome)
      const row = await dbSelectAll('SELECT id FROM produtos WHERE nome = ?;', [nome]);
      if (row?.length) {
        await dbRun('UPDATE produtos SET preco = ?, updated_at = datetime(\'now\') WHERE id = ?;', [nPreco, row[0].id]);
      } else {
        await dbRun('INSERT INTO produtos (nome, preco, updated_at) VALUES (?, ?, datetime(\'now\'));', [nome, nPreco]);
      }

      // limpa inputs e recarrega
      setProduto('');
      setQtd('1');
      setPreco('');
      setObs('');
      await carregar();
    } catch (e) {
      console.log('[ComandaDetail] addItem erro:', e);
      Alert.alert('Erro', 'Não foi possível adicionar o item.');
    }
  };

  const removerItem = async (id) => {
    try {
      await dbRun('DELETE FROM itens WHERE id = ?;', [id]);
      await carregar();
    } catch (e) {
      console.log('[ComandaDetail] removerItem erro:', e);
    }
  };

  const total = itens.reduce((acc, it) => acc + Number(it.qtd || 0) * Number(it.preco_unit || 0), 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', default: undefined })}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Comanda #{comandaId}</Text>
        <Text style={styles.subtitle}>
          {(comanda?.nome || '(sem nome)')} • {comanda?.status || '-'}
        </Text>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Produto"
            value={produto}
            onChangeText={setProduto}
            placeholderTextColor={COLORS.hint}
          />
          <TextInput
            style={[styles.input, { width: 70, textAlign: 'center' }]}
            placeholder="Qtd"
            keyboardType="number-pad"
            value={qtd}
            onChangeText={setQtd}
            placeholderTextColor={COLORS.hint}
          />
          <TextInput
            style={[styles.input, { width: 110 }]}
            placeholder="Preço"
            keyboardType="decimal-pad"
            value={preco}
            onChangeText={setPreco}
            placeholderTextColor={COLORS.hint}
          />
        </View>
        <TextInput
          style={[styles.input, { marginTop: SPACING.sm }]}
          placeholder="Observações (opcional)"
          value={obs}
          onChangeText={setObs}
          placeholderTextColor={COLORS.hint}
        />
        <TouchableOpacity style={styles.btnAdd} onPress={addItem}>
          <Text style={styles.btnAddTxt}>Adicionar item</Text>
        </TouchableOpacity>

        <FlatList
          style={{ flex: 1, marginTop: SPACING.lg }}
          data={itens}
          keyExtractor={(it) => String(it.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} />}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemNome}>
                  {item.produto} × {item.qtd}
                </Text>
                <Text style={styles.itemMeta}>
                  R$ {Number(item.preco_unit || 0).toFixed(2)} {item.obs ? `• ${item.obs}` : ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.itemDel} onPress={() => removerItem(item.id)}>
                <Text style={styles.itemDelTxt}>Remover</Text>
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={
            <View style={{ marginTop: SPACING.lg, alignItems: 'flex-end' }}>
              <Text style={styles.total}>Total: R$ {total.toFixed(2)}</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: SPACING.xl }}
        />
      </View>
    </KeyboardAvoidingView>
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
  subtitle: { 
    marginTop: 2, 
    color: COLORS.textMuted,
    fontSize: FONT.size.base
  },
  row: { 
    marginTop: SPACING.lg, 
    flexDirection: 'row', 
    gap: SPACING.sm 
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
    marginTop: SPACING.sm, 
    backgroundColor: COLORS.primary, 
    borderRadius: RADII.md, 
    height: 46, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  btnAddTxt: { 
    color: COLORS.card, 
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.md
  },
  item: { 
    flexDirection: 'row', 
    gap: SPACING.sm, 
    padding: SPACING.lg, 
    backgroundColor: COLORS.card, 
    borderRadius: RADII.lg, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  itemNome: { 
    fontSize: FONT.size.md, 
    fontWeight: FONT.weight.bold,
    color: COLORS.text
  },
  itemMeta: { 
    color: COLORS.textMuted, 
    marginTop: 2,
    fontSize: FONT.size.sm
  },
  itemDel: { 
    backgroundColor: COLORS.danger, 
    borderRadius: RADII.sm, 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.sm 
  },
  itemDelTxt: { 
    color: COLORS.card, 
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.sm
  },
  total: { 
    fontSize: FONT.size.lg, 
    fontWeight: FONT.weight.black,
    color: COLORS.text
  },
});