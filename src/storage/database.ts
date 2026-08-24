import AsyncStorage from '@react-native-async-storage/async-storage';
import {WorkoutCategory, Exercise, BodyRecord} from '../types';

const KEY = '@fitness_categories';
const BODY_RECORDS_KEY = '@fitness_body_records';

function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}

export async function getCategories(): Promise<WorkoutCategory[]> {
  try {
    const data = await AsyncStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function save(cats: WorkoutCategory[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(cats));
}

export async function addCategory(name: string): Promise<WorkoutCategory> {
  const cats = await getCategories();
  const cat: WorkoutCategory = {
    id: genId(),
    name,
    exercises: [],
    createdAt: new Date().toISOString(),
  };
  await save([...cats, cat]);
  return cat;
}

export async function updateCategory(id: string, name: string): Promise<void> {
  const cats = await getCategories();
  await save(cats.map(c => (c.id === id ? {...c, name} : c)));
}

export async function deleteCategory(id: string): Promise<void> {
  const cats = await getCategories();
  await save(cats.filter(c => c.id !== id));
}

export async function addExercise(
  catId: string,
  ex: Omit<Exercise, 'id' | 'completed'>,
): Promise<void> {
  const cats = await getCategories();
  await save(
    cats.map(c =>
      c.id === catId
        ? {
            ...c,
            exercises: [
              ...c.exercises,
              {...ex, id: genId(), completed: false},
            ],
          }
        : c,
    ),
  );
}

export async function updateExercise(
  catId: string,
  exId: string,
  updates: Partial<Omit<Exercise, 'id' | 'completed'>>,
): Promise<void> {
  const cats = await getCategories();
  await save(
    cats.map(c =>
      c.id === catId
        ? {
            ...c,
            exercises: c.exercises.map(e =>
              e.id === exId ? {...e, ...updates} : e,
            ),
          }
        : c,
    ),
  );
}

export async function deleteExercise(
  catId: string,
  exId: string,
): Promise<void> {
  const cats = await getCategories();
  await save(
    cats.map(c =>
      c.id === catId
        ? {...c, exercises: c.exercises.filter(e => e.id !== exId)}
        : c,
    ),
  );
}

export async function toggleExercise(
  catId: string,
  exId: string,
): Promise<void> {
  const cats = await getCategories();
  await save(
    cats.map(c =>
      c.id === catId
        ? {
            ...c,
            exercises: c.exercises.map(e =>
              e.id === exId ? {...e, completed: !e.completed} : e,
            ),
          }
        : c,
    ),
  );
}

export async function resetAllExercises(catId: string): Promise<void> {
  const cats = await getCategories();
  await save(
    cats.map(c =>
      c.id === catId
        ? {...c, exercises: c.exercises.map(e => ({...e, completed: false}))}
        : c,
    ),
  );
}

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
