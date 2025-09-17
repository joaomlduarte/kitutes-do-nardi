// src/screens/ConfigScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { getDb, initDb } from '../storage/database';

export default function ConfigScreen() {
  const [busy, setBusy] = useState(false);

  async function limparVendasDoDia() {
    try {
      setBusy(true);
      const db = await getDb();
      // remove vendas de hoje
      const hoje = new Date().toISOString().slice(0, 10);
      await db.runAsync('DELETE FROM vendas WHERE data = ?', [hoje]);
      Alert.alert('Pronto', 'Vendas de hoje removidas.');
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível limpar as vendas de hoje.');
    } finally {
      setBusy(false);
    }
  }

  async function resetBanco() {
    Alert.alert(
      'Atenção',
      'Isso apaga TODOS os dados (produtos e vendas). Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              const db = await getDb();
              await db.execAsync(`
                DROP TABLE IF EXISTS vendas;
                DROP TABLE IF EXISTS produtos;
              `);
              await initDb();
              Alert.alert('Banco resetado', 'Todas as tabelas foram recriadas.');
            } catch (e) {
              console.error(e);
              Alert.alert('Erro', 'Não foi possível resetar o banco.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurações</Text>
      <Text style={styles.desc}>Ferramentas administrativas do app.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Limpeza rápida</Text>
        <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={limparVendasDoDia} disabled={busy}>
          <Text style={styles.btnTxt}>Remover vendas de hoje</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Banco de dados</Text>
        <Pressable style={[styles.btnDanger, busy && styles.btnDisabled]} onPress={resetBanco} disabled={busy}>
          <Text style={styles.btnTxt}>Resetar banco (apaga tudo)</Text>
        </Pressable>
        <Text style={styles.warn}>Use com cautela. Esta ação não pode ser desfeita.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  desc: { color: '#475569', marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 14 },
  cardTitle: { fontWeight: '800', color: '#0f172a', marginBottom: 8 },

  btn: { backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  btnDanger: { backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontWeight: '900' },
  warn: { color: '#b91c1c', marginTop: 8, fontSize: 12 },
});
