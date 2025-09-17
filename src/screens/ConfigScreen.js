import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import dayjs from 'dayjs';
import { getDb } from '../storage/database';

export default function ConfigScreen() {
  async function limparHoje() {
    const db = await getDb();
    const hoje = dayjs().format('YYYY-MM-DD');
    await db.runAsync('DELETE FROM vendas WHERE data = ?', [hoje]);
    Alert.alert('Pronto', 'Vendas de hoje foram apagadas.');
  }

  async function limparTudo() {
    Alert.alert('Atenção', 'Apagar TODAS as vendas? (irreversível)', [
      { text: 'Cancelar' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        const db = await getDb();
        await db.runAsync('DELETE FROM vendas', []);
        Alert.alert('Pronto', 'Todas as vendas foram apagadas.');
      } }
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurações</Text>
      <Pressable style={[styles.btn, { backgroundColor: '#ef6c00' }]} onPress={limparHoje}>
        <Text style={styles.btnText}>Limpar vendas de HOJE</Text>
      </Pressable>
      <Pressable style={[styles.btn, { backgroundColor: '#c62828' }]} onPress={limparTudo}>
        <Text style={styles.btnText}>Limpar TODAS as vendas</Text>
      </Pressable>
      <Text style={{ color: '#666', marginTop: 12 }}>
        Os produtos cadastrados não são apagados por essas ações.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  btn: { padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' }
});
