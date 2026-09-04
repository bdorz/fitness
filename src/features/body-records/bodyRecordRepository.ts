import AsyncStorage from '@react-native-async-storage/async-storage';
import { BodyRecord } from './types';

const BODY_RECORDS_KEY = '@fitness_body_records';

export async function getBodyRecords(): Promise<BodyRecord[]> {
  try {
    const data = await AsyncStorage.getItem(BODY_RECORDS_KEY);
    const parsed = data ? JSON.parse(data) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        record =>
          /^\d{4}-\d{2}-\d{2}$/.test(record.date) &&
          Number.isFinite(Number(record.weight)),
      )
      .map(record => ({
        date: record.date,
        weight: Number(record.weight),
        waist:
          record.waist !== null &&
          record.waist !== undefined &&
          Number.isFinite(Number(record.waist))
            ? Number(record.waist)
            : null,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export async function saveBodyRecord(record: BodyRecord): Promise<void> {
  const records = await getBodyRecords();
  const next = records.filter(item => item.date !== record.date);
  next.push(record);
  next.sort((a, b) => b.date.localeCompare(a.date));
  await AsyncStorage.setItem(BODY_RECORDS_KEY, JSON.stringify(next));
}

export async function deleteBodyRecord(date: string): Promise<void> {
  const records = await getBodyRecords();
  await AsyncStorage.setItem(
    BODY_RECORDS_KEY,
    JSON.stringify(records.filter(record => record.date !== date)),
  );
}
