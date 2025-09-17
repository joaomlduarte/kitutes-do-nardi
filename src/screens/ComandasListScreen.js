// src/screens/ComandasListScreen.js
import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import dayjs from 'dayjs';
import Input from '../components/Input';

export default function ComandasListScreen({ navigation }) {
  const [novaId, setNovaId] = useState('');
  const [comandas, setComandas] = useState([]); // [{id, abertaEm}]

  function criarComanda() {
    const id = (novaId || '').trim();
    if (!id) {
      Alert.alert('Informe o número/identificação da comanda.');
      return;
    }
    if (comandas.some(c => c.id === id)) {
      Alert.alert('Comanda já existe', 'Escolha outro identificador.');
      return;
    }
    setComandas(prev => [{ id, abertaEm: new Date().toISOString() }, ...prev]);
    setNovaId('');
  }

  function abrir(c) {
    navigation.navigate('ComandaDetail', { comandaId: c.id });
  }

  function remover(c) {
    setComandas(prev => prev.filter(x => x.id !== c.id));
  }

  const renderItem = ({ item }) => (
    <Pressable onPress={() => abrir(item)} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>Comanda #{item.id}</Text>
        <Text style={styles.cardSub}>Aberta: {dayjs(item.abertaEm).format('HH:mm DD/MM')}</Text>
      </View>
      <Pressable onPress={() => remover(item)} style={styles.remover}>
        <Text style={styles.removerTxt}>Fechar/Excluir</Text>
      </Pressable>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comandas em aberto</Text>

      <View style={styles.row}>
        <Input
          style={{ flex: 1 }}
          placeholder="Número/ID da comanda"
          value={novaId}
          onChangeText={setNovaId}
          autoCapitalize="none"
          keyboardType="default"
        />
        <View style={{ width: 10 }} />
        <Pressable style={styles.addBtn} onPress={criarComanda}>
          <Text style={styles.addTxt}>Criar</Text>
        </Pressable>
      </View>

      <FlatList
        data={comandas}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingVertical: 10 }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma comanda aberta.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8, color: '#0f172a' },
  row: { flexDirection: 'row', alignItems: 'center' },
  addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  addTxt: { color: '#fff', fontWeight: '900' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: { fontWeight: '800', color: '#0f172a' },
  cardSub: { color: '#475569', marginTop: 4 },
  remover: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  removerTxt: { color: '#fff', fontWeight: '800' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 16 },
});
