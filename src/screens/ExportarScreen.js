// src/screens/ExportarScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert } from 'react-native';
import dayjs from 'dayjs';
import { getDb } from '../storage/database';
import * as FileSystem from 'expo-file-system/legacy'; // API legacy para writeAsStringAsync
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ExportarScreen() {
  const [data, setData] = useState(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const dataSql = dayjs(data).format('YYYY-MM-DD');
  const dataLabel = dayjs(data).format('DD/MM/YYYY');

  async function consultarVendasDoDia(dataStr) {
    const db = await getDb();
    const vendas = await db.getAllAsync('SELECT * FROM vendas WHERE data = ?', [dataStr]);
    const produtos = await db.getAllAsync('SELECT * FROM produtos');
    const nomePorId = new Map(produtos.map(p => [String(p.id), p.nome]));
    return { vendas, nomePorId };
  }

  function montarWorkbook({ vendas, nomePorId }) {
    const mapa = new Map(); // id -> { nome, qtd, total }
    let totalGeral = 0;

    for (const v of vendas) {
      const id = String(v.produto_id);
      const nome = nomePorId.get(id) || id;
      const qtd = Number(v.quantidade) || 0;
      const unit = Number(v.preco_unit) || 0;
      const tot = qtd * unit;
      totalGeral += tot;

      const acc = mapa.get(id) || { nome, qtd: 0, total: 0 };
      acc.qtd += qtd;
      acc.total += tot;
      mapa.set(id, acc);
    }

    const linhasResumo = Array.from(mapa.values())
      .sort((a, b) => b.total - a.total)
      .map((r) => [r.nome, r.qtd, Number(r.total.toFixed(2))]);

    const sheetResumo = XLSX.utils.aoa_to_sheet([
      [`Kitutes do Nardi — Resumo do dia ${dataLabel}`],
      [],
      ['Produto', 'Quantidade', 'Total (R$)'],
      ...linhasResumo,
      [],
      ['TOTAL GERAL', '', Number(totalGeral.toFixed(2))]
    ]);
    sheetResumo['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 14 }];

    const linhasVendas = vendas.map((v) => {
      const nome = nomePorId.get(String(v.produto_id)) || String(v.produto_id);
      const qtd = Number(v.quantidade) || 0;
      const unit = Number(v.preco_unit) || 0;
      const tot = Number((qtd * unit).toFixed(2));
      return [v.comanda, String(v.produto_id), nome, qtd, unit, tot];
    });

    const sheetVendas = XLSX.utils.aoa_to_sheet([
      [`Kitutes do Nardi — Vendas do dia ${dataLabel}`],
      [],
      ['Comanda', 'Produto ID', 'Produto', 'Qtd', 'Preço Unit (R$)', 'Total (R$)'],
      ...linhasVendas,
    ]);
    sheetVendas['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 16 }, { wch: 14 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetResumo, 'Resumo');
    XLSX.utils.book_append_sheet(wb, sheetVendas, 'Vendas');

    return wb;
  }

  async function salvarECompartilhar(wb) {
    const filename = `kitutes_${dayjs(data).format('YYYY-MM-DD')}.xlsx`;

    if (Platform.OS === 'web') {
      const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Arquivo XLSX baixado.');
      return;
    }

    const wboutB64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const uri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, wboutB64, { encoding: 'base64' });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exportar XLSX',
      });
    } else {
      Alert.alert('Exportação concluída', `Arquivo salvo em:\n${uri}`);
    }
  }

  async function exportar() {
    try {
      const { vendas, nomePorId } = await consultarVendasDoDia(dataSql);
      if (!vendas || vendas.length === 0) {
        Alert.alert('Sem vendas', `Não há vendas em ${dataLabel}.`);
        return;
      }
      const wb = montarWorkbook({ vendas, nomePorId });
      await salvarECompartilhar(wb);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro ao exportar', 'Tente novamente.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exportar para Excel (XLSX)</Text>
      <Text style={styles.hint}>Gera um arquivo com "Resumo" e "Vendas" para a data escolhida.</Text>

      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>Data:</Text>
        <Pressable onPress={() => setPickerVisible(true)} style={styles.dateBtn}>
          <Text style={styles.dateBtnText}>{dayjs(data).format('DD/MM/YYYY')}</Text>
        </Pressable>
      </View>

      {pickerVisible && (
        <DateTimePicker
          value={data}
          onChange={(_, d) => { setPickerVisible(false); if (d) setData(d); }}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
        />
      )}

      <Pressable style={styles.exportBtn} onPress={exportar}>
        <Text style={styles.exportText}>Exportar XLSX</Text>
      </Pressable>

      <View style={{ height: 8 }} />
      <Text style={styles.footnote}>Dica: finalize as comandas para que as vendas entrem no histórico do dia.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  hint: { color: '#707070', marginTop: 4 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  dateLabel: { fontWeight: '700', color: '#0f172a' },
  dateBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  dateBtnText: { fontWeight: '800', color: '#0f172a' },

  exportBtn: { marginTop: 16, backgroundColor: '#1565c0', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  exportText: { color: '#fff', fontWeight: '900' },
  footnote: { color: '#888' },
});
