// src/screens/ComandaDetailScreen.js
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, TouchableOpacity, Keyboard, Platform } from 'react-native';
import Input from '../components/Input';
import { getDb } from '../storage/database';
import dayjs from 'dayjs';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ComandaDetailScreen({ route, navigation }) {
  const { comandaId } = route.params;
  const [produtos, setProdutos] = useState([]);
  const [itens, setItens] = useState([]);
  const [produtoRef, setProdutoRef] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [inputHeight, setInputHeight] = useState(48);
  const inputBoxRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: `Comanda #${comandaId}` });
    carregarProdutos();
  }, [comandaId]);

  async function carregarProdutos() {
    const db = await getDb();
    const lista = await db.getAllAsync('SELECT * FROM produtos');
    // ordena por nome para uma sugestão mais “natural”
    lista.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt', { sensitivity: 'base' }));
    setProdutos(lista);
  }

  // ---- util: remover acentos com fallback (evita depender de String.prototype.normalize) ----
  const stripAccents = (s = '') => {
    try {
      return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch {
      // fallback básico
      const map = {
        á:'a', à:'a', â:'a', ã:'a', ä:'a', å:'a', æ:'ae',
        Á:'A', À:'A', Â:'A', Ã:'A', Ä:'A', Å:'A',
        é:'e', è:'e', ê:'e', ë:'e',
        É:'E', È:'E', Ê:'E', Ë:'E',
        í:'i', ì:'i', î:'i', ï:'i',
        Í:'I', Ì:'I', Î:'I', Ï:'I',
        ó:'o', ò:'o', ô:'o', õ:'o', ö:'o', œ:'oe',
        Ó:'O', Ò:'O', Ô:'O', Õ:'O', Ö:'O',
        ú:'u', ù:'u', û:'u', ü:'u',
        Ú:'U', Ù:'U', Û:'U', Ü:'U',
        ñ:'n', Ñ:'N', ç:'c', Ç:'C'
      };
      return s.split('').map(ch => map[ch] || ch).join('');
    }
  };

  const norm = (s) => stripAccents(String(s || '').trim().toLowerCase());

  // ---- sugestões (ID inicia com… OU nome contém) ----
  function atualizarSugestoes(texto) {
    setProdutoRef(texto);
    const t = String(texto || '').trim();
    if (!t) {
      setSugestoes([]);
      return;
    }
    const tNorm = norm(t);

    const lista = produtos.filter(
      (p) =>
        String(p.id).startsWith(t) ||
        norm(p.nome).includes(tNorm)
    );

    setSugestoes(lista.slice(0, 8));
  }

  function escolherSugestao(p) {
    // Preenche com o ID (mais estável); se preferir nome, troque para p.nome
    setProdutoRef(String(p.id));
    setSugestoes([]);
    // Mantém o teclado aberto para já digitar a quantidade
  }

  // ---- resolver produto por ID exato, nome exato, prefixo único de ID/NOME ----
  function resolverProduto(ref) {
    const refStr = String(ref || '').trim();
    const refNorm = norm(refStr);
    if (!refStr) return null;

    let p = produtos.find((x) => String(x.id) === refStr);
    if (p) return p;

    p = produtos.find((x) => norm(x.nome) === refNorm);
    if (p) return p;

    const porIdPrefix = produtos.filter((x) => String(x.id).startsWith(refStr));
    if (porIdPrefix.length === 1) return porIdPrefix[0];

    const porNomePrefix = produtos.filter((x) => norm(x.nome).startsWith(refNorm));
    if (porNomePrefix.length === 1) return porNomePrefix[0];

    return null;
  }

  function addItem() {
    if (!produtoRef || !quantidade) {
      Alert.alert('Dados faltando', 'Informe o ID ou NOME do produto e a quantidade.');
      return;
    }

    const qtd = Number(String(quantidade).replace(',', '.'));
    if (Number.isNaN(qtd) || qtd <= 0) {
      Alert.alert('Quantidade inválida', 'Digite uma quantidade válida.');
      return;
    }

    const p = resolverProduto(produtoRef);
    if (!p) {
      Alert.alert('Produto não encontrado', 'Verifique o ID/NOME do produto.');
      return;
    }

    const novo = { produto_id: String(p.id), nome: p.nome, preco_unit: Number(p.preco), quantidade: qtd };
    setItens((prev) => [novo, ...prev]);
    setProdutoRef('');
    setSugestoes([]);
    setQuantidade('');
  }

  const total = useMemo(
    () => itens.reduce((acc, it) => acc + it.quantidade * it.preco_unit, 0),
    [itens]
  );

  async function finalizar() {
    if (itens.length === 0) {
      Alert.alert('Sem itens', 'Adicione ao menos 1 item.');
      return;
    }
    const db = await getDb();
    const data = dayjs().format('YYYY-MM-DD');
    for (const it of itens) {
      await db.runAsync(
        'INSERT INTO vendas (data, comanda, produto_id, quantidade, preco_unit) VALUES (?, ?, ?, ?, ?)',
        [data, String(comandaId), it.produto_id, it.quantidade, it.preco_unit]
      );
    }
    await db.runAsync('DELETE FROM comandas WHERE id = ?', [String(comandaId)]);
    Alert.alert('Comanda finalizada', `Total: R$ ${total.toFixed(2)}`);
    navigation.goBack();
  }

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.itemNome}>{item.nome}</Text>
      <Text style={styles.itemSub}>
        ID: {item.produto_id} • Qtd: {item.quantidade} • Unit: R$ {item.preco_unit.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar itens</Text>

      <View
        style={styles.row}
        pointerEvents="auto"
      >
        {/* Caixa do input com posição relativa para o dropdown absoluto */}
        <View
          ref={inputBoxRef}
          style={styles.inputBox}
          onLayout={(e) => setInputHeight(e.nativeEvent.layout.height || 48)}
        >
          <Input
            style={{ flex: 1 }}
            placeholder="ID ou NOME do produto"
            value={produtoRef}
            onChangeText={atualizarSugestoes}
            autoCapitalize="characters"
            onBlur={() => setTimeout(() => setSugestoes([]), 150)} // dá tempo de tocar na sugestão
          />

          {/* DROPDOWN */}
          {sugestoes.length > 0 && (
            <View
              style={[
                styles.dropdown,
                { top: inputHeight + 4 } // logo abaixo do input
              ]}
              pointerEvents="auto"
            >
              {sugestoes.map((p) => (
                <TouchableOpacity
                  key={String(p.id)}
                  style={styles.sugestaoItem}
                  onPress={() => escolherSugestao(p)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sugestaoTxt}>{p.id} — {p.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ width: SPACING.md }} />
        <Input
          style={{ width: 140 }}
          placeholder="Quantidade"
          value={quantidade}
          onChangeText={setQuantidade}
          keyboardType="decimal-pad"
        />
        <View style={{ width: SPACING.md }} />
        <Pressable style={styles.addBtn} onPress={addItem}>
          <Text style={styles.addTxt}>Adicionar</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>Itens da comanda</Text>
      <FlatList
        data={itens}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm + 2 }} />}
        contentContainerStyle={{ paddingVertical: SPACING.md }}
        keyboardShouldPersistTaps="handled"
      />

      <View style={styles.footer}>
        <Text style={styles.total}>Total: R$ {total.toFixed(2)}</Text>
        <Pressable style={styles.finishBtn} onPress={finalizar}>
          <Text style={styles.finishTxt}>Finalizar comanda</Text>
        </Pressable>
      </View>
    </View>
  );
}

const SHADOW = Platform.select({
  android: { elevation: 12 },
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  default: {},
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.xl, backgroundColor: COLORS.bg },
  title: { fontSize: FONT.size.lg, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { marginTop: SPACING.lg, fontWeight: '800', color: COLORS.text },
  row: { flexDirection: 'row', alignItems: 'center' },

  // caixa do input para posicionar dropdown
  inputBox: {
    flex: 1,
    position: 'relative',
    zIndex: 50,
    // garante que o dropdown possa “sair” da caixa
    overflow: 'visible',
  },

  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl - 2,
    paddingVertical: SPACING.lg,
    borderRadius: RADII.md,
  },
  addTxt: { color: '#fff', fontWeight: '900' },

  item: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemNome: { fontWeight: '800', color: COLORS.text },
  itemSub: { color: COLORS.textMuted, marginTop: 4 },

  footer: { marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { fontSize: FONT.size.lg, fontWeight: '900', color: COLORS.text },
  finishBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADII.lg,
  },
  finishTxt: { color: '#fff', fontWeight: '900' },

  dropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 224,
    zIndex: 9999,
    ...SHADOW,
  },
  sugestaoItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sugestaoTxt: { color: '#fff' },
});
