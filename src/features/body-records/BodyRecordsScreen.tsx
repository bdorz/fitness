import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../shared/theme/colors';
import { BodyRecord } from './types';
import {
  deleteBodyRecord,
  getBodyRecords,
  saveBodyRecord,
} from './bodyRecordRepository';

function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(year, month - 1, day));
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function BodyRecordsScreen() {
  const [records, setRecords] = useState<BodyRecord[]>([]);
  const [date, setDate] = useState(localDateString());
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');

  const load = useCallback(async () => setRecords(await getBodyRecords()), []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const latestWaist = records.find(record => record.waist !== null);
  const average = useMemo(() => {
    const recent = records.slice(0, 7);
    if (!recent.length) {
      return null;
    }
    return (
      recent.reduce((sum, record) => sum + record.weight, 0) / recent.length
    );
  }, [records]);

  function selectDate(value: string) {
    setDate(value);
    const existing = records.find(record => record.date === value);
    setWeight(existing ? existing.weight.toFixed(2) : '');
    setWaist(
      existing?.waist !== null && existing?.waist !== undefined
        ? existing.waist.toFixed(1)
        : '',
    );
  }

  async function handleSave() {
    const parsedWeight = Number(weight);
    const parsedWaist = waist.trim() === '' ? null : Number(waist);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
    if (!validDate || !Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('資料不完整', '請輸入 YYYY-MM-DD 格式日期與正確體重');
      return;
    }
    if (
      parsedWaist !== null &&
      (!Number.isFinite(parsedWaist) || parsedWaist <= 0)
    ) {
      Alert.alert('腰圍格式錯誤', '請輸入正確腰圍，或留白不記錄');
      return;
    }
    const savedWeight = roundToTwoDecimals(parsedWeight);
    await saveBodyRecord({ date, weight: savedWeight, waist: parsedWaist });
    setWeight(savedWeight.toFixed(2));
    await load();
    Alert.alert(
      '已儲存',
      records.some(record => record.date === date)
        ? '已更新這一天的紀錄'
        : '已新增今日紀錄',
    );
  }

  function confirmDelete(record: BodyRecord) {
    Alert.alert('刪除紀錄', `確定刪除 ${formatDate(record.date)} 的紀錄？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await deleteBodyRecord(record.date);
          if (date === record.date) {
            setWeight('');
            setWaist('');
          }
          await load();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>身體紀錄</Text>
          <Text style={styles.subtitle}>每天一筆，追蹤體重與腰圍變化</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>最新體重</Text>
            <Text style={styles.summaryValue}>
              {records[0] ? records[0].weight.toFixed(2) : '—'}
              <Text style={styles.unit}> kg</Text>
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>最新腰圍</Text>
            <Text style={styles.summaryValue}>
              {latestWaist?.waist?.toFixed(1) ?? '—'}
              <Text style={styles.unit}> cm</Text>
            </Text>
          </View>
        </View>
        <View style={styles.averageCard}>
          <Text style={styles.summaryLabel}>
            最近 {Math.min(records.length, 7)} 筆平均體重
          </Text>
          <Text style={styles.averageValue}>
            {average?.toFixed(2) ?? '—'} kg
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>新增或更新紀錄</Text>
          <Text style={styles.label}>日期</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={selectDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.text3}
            keyboardType="numbers-and-punctuation"
          />
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>體重（kg）</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="例如 70.50"
                placeholderTextColor={Colors.text3}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>腰圍（cm）</Text>
              <TextInput
                style={styles.input}
                value={waist}
                onChangeText={setWaist}
                placeholder="例如 80.0"
                placeholderTextColor={Colors.text3}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>
              {records.some(record => record.date === date)
                ? '更新這筆紀錄'
                : '儲存紀錄'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.historyHeader}>
            <Text style={styles.cardTitle}>歷史紀錄</Text>
            <Text style={styles.count}>{records.length} 筆</Text>
          </View>
          {!records.length ? (
            <Text style={styles.empty}>尚無紀錄，從今天開始吧。</Text>
          ) : (
            records.map(record => (
              <TouchableOpacity
                key={record.date}
                style={styles.recordRow}
                onPress={() => selectDate(record.date)}
                onLongPress={() => confirmDelete(record)}
              >
                <View style={styles.recordInfo}>
                  <Text style={styles.recordDate}>
                    {formatDate(record.date)}
                  </Text>
                  <Text style={styles.recordHint}>點一下編輯・長按刪除</Text>
                </View>
                <View style={styles.measurements}>
                  <Text style={styles.recordWeight}>
                    {record.weight.toFixed(2)} kg
                  </Text>
                  <Text style={styles.recordWaist}>
                    {record.waist !== null
                      ? `${record.waist.toFixed(1)} cm`
                      : '未記腰圍'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 28 },
  header: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.text2, marginTop: 4 },
  summaryRow: { flexDirection: 'row', marginHorizontal: 12, gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: { fontSize: 12, color: Colors.text2, fontWeight: '700' },
  summaryValue: {
    fontSize: 23,
    color: Colors.text,
    fontWeight: '800',
    marginTop: 8,
  },
  unit: { fontSize: 12, color: Colors.text2 },
  averageCard: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: Colors.accentDim,
    borderRadius: 14,
    padding: 15,
  },
  averageValue: {
    fontSize: 20,
    color: Colors.accent,
    fontWeight: '800',
    marginTop: 5,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    color: Colors.text2,
    fontWeight: '700',
    marginBottom: 7,
  },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputGroup: { flex: 1 },
  input: {
    backgroundColor: Colors.card2,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: Colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 14,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveText: { fontSize: 15, color: Colors.white, fontWeight: '800' },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: { fontSize: 12, color: Colors.text2, marginBottom: 14 },
  empty: { color: Colors.text3, textAlign: 'center', paddingVertical: 20 },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 13,
  },
  recordInfo: { flex: 1 },
  recordDate: { fontSize: 14, color: Colors.text, fontWeight: '700' },
  recordHint: { fontSize: 10, color: Colors.text3, marginTop: 3 },
  measurements: { alignItems: 'flex-end' },
  recordWeight: { fontSize: 15, color: Colors.accent, fontWeight: '800' },
  recordWaist: { fontSize: 11, color: Colors.text2, marginTop: 3 },
});
