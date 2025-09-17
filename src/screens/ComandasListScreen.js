import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Alert } from 'react-native';
import dayjs from 'dayjs';
import { getDb } from '../storage/database';
import { useIsFocused, useNavigation } from '@react-navigation/native';

export default function ComandasListScreen() {
  const [nome, setNome] = useState('');
  const [lista, setLista] = useState([]);
  const isFocused = useIsFocused();
  const nav = useNavigation();

  useEffect(() => { if (isFocused) carregar(); }, [isFocused]);

  async function carregar() {
    const db = await getDb();
    const rows = await db.getAllAsync('SELECT * FROM comandas_abertas ORDER BY criada_em DESC');
    const enrich = await Promise.all(rows.map(async c => {
      const trow = await db.getAllAsync(
        'SELECT SUM(quantidade*preco_unit) AS TOTAL FROM itens_abertos WHERE comanda_id = ?',
        [c.id]
      );
      const total = Number(trow?.[0]?.TOTAL || trow?.[0]?.total || 0);
      return { ...c, total };
    }));
    setLista(enrich);
  }

  async function criar() {
    const nomeTrim = nome.trim();
    if (!nomeTrim) { Alert.alert('Informe um nome/numero da comanda'); return; }
    const db = await getDb();
    const id = `${Date.now()}`;
    await db.runAsync(
      'INSERT INTO comandas_abertas (id, nome, criada_em) VALUES (?, ?, ?)',
      [id, nomeTrim, dayjs().toISOString()]
    );
    setNome('');
    await carregar();
    nav.navigate('Comanda', { comandaId: id, comandaNome: nomeTrim });
  }

  function abrir(c) {
    nav.navigate('Comanda', { comandaId: c.id, comandaNome: c.nome });
  }

  async function remover(c) {
    Alert.alert('Remover comanda', `Excluir a comanda "${c.nome}"?`, [
      { text: 'Cancelar' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        const db = await getDb();
        await db.runAsync('DELETE FROM comandas_abertas WHERE id = ?', [c.id]);
        await carregar();
      }}
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comandas Abertas</Text>

      <View style={styles.row}>
        <TextInput
          placeholder="Nome/Número da nova comanda"
          style={styles.input}
          value={nome}
          onChangeText={setNome}
        />
        <Pressable style={styles.btn} onPress={criar}><Text style={styles.btnText}>Criar</Text></Pressable>
      </View>

      <FlatList
        data={lista}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => abrir(item)} style={styles.item}>
            <View style={{flex:1}}>
              <Text style={styles.itemTitle}>{item.nome}</Text>
              <Text style={styles.itemSub}>{dayjs(item.criada_em).format('DD/MM HH:mm')}</Text>
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text style={styles.total}>R$ {item.total.toFixed(2)}</Text>
              <Pressable onPress={() => remover(item)}><Text style={styles.remove}>Remover</Text></Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{color:'#666', marginTop:12}}>Nenhuma comanda aberta.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:16, gap:12 },
  title: { fontSize:22, fontWeight:'800' },
  row: { flexDirection:'row', gap:8 },
  input: { flex:1, backgroundColor:'#fff', borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10 },
  btn: { backgroundColor:'#2e7d32', paddingHorizontal:16, borderRadius:8, justifyContent:'center' },
  btnText: { color:'#fff', fontWeight:'800' },
  item: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#fff', borderWidth:1, borderColor:'#eee', borderRadius:10, padding:12, marginTop:8 },
  itemTitle: { fontWeight:'800' },
  itemSub: { color:'#666', marginTop:2 },
  total: { fontWeight:'800' },
  remove: { marginTop:6, color:'#c62828', fontWeight:'700' }
});
