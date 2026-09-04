import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise, WorkoutCategory } from './types';

const KEY = '@fitness_categories';

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
  await save(cats.map(c => (c.id === id ? { ...c, name } : c)));
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
              { ...ex, id: genId(), completed: false },
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
              e.id === exId ? { ...e, ...updates } : e,
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
        ? { ...c, exercises: c.exercises.filter(e => e.id !== exId) }
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
              e.id === exId ? { ...e, completed: !e.completed } : e,
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
        ? {
            ...c,
            exercises: c.exercises.map(e => ({ ...e, completed: false })),
          }
        : c,
    ),
  );
}
