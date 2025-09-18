// src/screens/ComandasScreen.js
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { dbRun, dbSelectAll } from '../storage/database';
import { COLORS, RADII, SPACING, FONT } from '../theme';

export default function ComandasScreen() {
  const navigation = useNavigation();
  const [nome, setNome] = useState('');
  const [qtdAbertas, setQtdAbertas] = useState(0);

  const loadAbertas = useCallback(async () => {
    try {
      const rows = await dbSelectAll(
        "SELECT * FROM comandas WHERE status = 'aberta' ORDER BY nome COLLATE NOCASE ASC;"
      );
      setQtdAbertas(rows.length || 0);
    } catch (e) {
      console.log('[ComandasScreen] erro ao carregar abertas:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAbertas(); }, [loadAbertas]));

  const criar = async () => {
    const nm = (nome || '').trim();
    if (!nm) {
      Alert.alert('Nome obrigatório', 'Digite um nome para a comanda.');
      return;
    }
    try {
      // ⚠️ Nunca passamos coluna id – AUTOINCREMENT cuida disso.
      await dbRun("INSERT INTO comandas (nome, status) VALUES (?, 'aberta');", [nm]);
      setNome('');
      await loadAbertas();
      Alert.alert('OK', `Comanda "${nm}" criada!`);
      // se tiver rota de detalhe, navegue:
      // navigation.navigate('ComandaDetail', { /* id, se precisar buscar o last id */ })
    } catch (e) {
      console.log('[ComandasScreen] erro ao criar comanda:', e);
      Alert.alert('Erro', 'Não foi possível criar a comanda.');
    }
  };

  const irParaLista = () => navigation.navigate?.('ComandasList');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comandas</Text>
      <Text style={styles.subtitle}>Abertas: {qtdAbertas}</Text>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Nome da comanda"
          value={nome}
          onChangeText={setNome}
          returnKeyType="done"
          onSubmitEditing={criar}
          placeholderTextColor={COLORS.hint}
        />
        <TouchableOpacity style={styles.btn} onPress={criar}>
          <Text style={styles.btnText}>Criar</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.link} onPress={irParaLista}>
        <Text style={styles.linkText}>Ver lista de comandas abertas</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: SPACING.xl, 
    gap: SPACING.lg,
    backgroundColor: COLORS.bg
  },
  title: { 
    fontSize: FONT.size.xxl, 
    fontWeight: FONT.weight.bold,
    color: COLORS.text
  },
  subtitle: { 
    fontSize: FONT.size.base, 
    color: COLORS.textMuted 
  },
  row: { 
    flexDirection: 'row', 
    gap: SPACING.sm, 
    alignItems: 'center' 
  },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADII.md, 
    paddingHorizontal: SPACING.lg, 
    height: 44,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    fontSize: FONT.size.md
  },
  btn: { 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: SPACING.xl, 
    height: 44, 
    borderRadius: RADII.md, 
    justifyContent: 'center' 
  },
  btnText: { 
    color: COLORS.card, 
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.md
  },
  link: { 
    marginTop: SPACING.sm 
  },
  linkText: { 
    color: COLORS.success, 
    fontWeight: FONT.weight.semi,
    fontSize: FONT.size.md
  },
});