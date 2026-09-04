import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Colors } from '../../shared/theme/colors';

const REF_KG = [
  2.5, 5, 7.5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120,
  140, 160, 180, 200,
];

export default function ConverterScreen() {
  const [kg, setKg] = useState('');
  const [lbs, setLbs] = useState('');

  function handleKgChange(v: string) {
    setKg(v);
    const n = parseFloat(v);
    setLbs(!isNaN(n) && v !== '' ? (n * 2.20462).toFixed(2) : '');
  }

  function handleLbsChange(v: string) {
    setLbs(v);
    const n = parseFloat(v);
    setKg(!isNaN(n) && v !== '' ? (n / 2.20462).toFixed(2) : '');
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={styles.header}>
        <Text style={styles.title}>重量換算</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Converter */}
        <View style={styles.card}>
          <View style={styles.convRow}>
            <View style={styles.convGroup}>
              <TextInput
                style={styles.convInput}
                value={kg}
                onChangeText={handleKgChange}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.text3}
              />
              <Text style={styles.convUnit}>公斤 kg</Text>
            </View>
            <Text style={styles.convSym}>⇌</Text>
            <View style={styles.convGroup}>
              <TextInput
                style={styles.convInput}
                value={lbs}
                onChangeText={handleLbsChange}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.text3}
              />
              <Text style={styles.convUnit}>磅 lbs</Text>
            </View>
          </View>
          <Text style={styles.formula}>
            1 kg = 2.20462 磅　／　1 磅 = 0.453592 kg
          </Text>
        </View>

        {/* Reference Table */}
        <View style={styles.card}>
          <Text style={styles.tableTitle}>常用對照表</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.cell, styles.headText]}>公斤 (kg)</Text>
            <Text style={[styles.cell, styles.headText]}>磅 (lbs)</Text>
          </View>
          {REF_KG.map((k, i) => (
            <View
              key={k}
              style={[styles.tableRow, i % 2 === 1 && styles.rowAlt]}
            >
              <Text style={[styles.cell, styles.cellText]}>{k}</Text>
              <Text style={[styles.cell, styles.cellText]}>
                {(k * 2.20462).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 20, paddingBottom: 14, paddingHorizontal: 20 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    margin: 12,
    marginBottom: 0,
  },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  convGroup: { flex: 1, alignItems: 'center', gap: 8 },
  convInput: {
    backgroundColor: Colors.card2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 14,
    width: '100%',
  },
  convUnit: {
    fontSize: 13,
    color: Colors.text2,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  convSym: { fontSize: 26, color: Colors.accent, flexShrink: 0 },
  formula: {
    marginTop: 14,
    fontSize: 12,
    color: Colors.text3,
    textAlign: 'center',
  },
  tableTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingBottom: 8,
    marginBottom: 4,
  },
  cell: { flex: 1, textAlign: 'center' },
  headText: { fontSize: 12, fontWeight: '700', color: Colors.text2 },
  tableRow: { flexDirection: 'row', paddingVertical: 7, borderRadius: 6 },
  rowAlt: { backgroundColor: Colors.card2 },
  cellText: { fontSize: 14, color: Colors.text },
  bottomSpacer: { height: 32 },
});
