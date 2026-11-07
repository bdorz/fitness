import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Exercise,
  ExerciseDraft,
  ExerciseTemplate,
  WorkoutCategory,
} from './types';

const KEY = '@fitness_categories';

interface WorkoutStore {
  categories: WorkoutCategory[];
  templates: ExerciseTemplate[];
}

function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sameTemplate(
  template: ExerciseTemplate,
  fields: Pick<ExerciseTemplate, 'name' | 'weight' | 'unit'>,
): boolean {
  return (
    template.name.trim().toLocaleLowerCase() ===
      fields.name.trim().toLocaleLowerCase() &&
    template.weight.trim() === fields.weight.trim() &&
    template.unit === fields.unit
  );
}

async function readStore(): Promise<WorkoutStore> {
  let parsed: WorkoutStore | WorkoutCategory[] | null;
  try {
    const data = await AsyncStorage.getItem(KEY);
    if (!data) {
      return { categories: [], templates: [] };
    }
    parsed = JSON.parse(data);
  } catch {
    return { categories: [], templates: [] };
  }
  if (!Array.isArray(parsed)) {
    return {
      categories: Array.isArray(parsed?.categories) ? parsed.categories : [],
      templates: Array.isArray(parsed?.templates) ? parsed.templates : [],
    };
  }

  // Previous releases stored only the category array. Link exact matches without
  // changing any sets, reps, rest times, or completion state.
  const templates: ExerciseTemplate[] = [];
  const categories: WorkoutCategory[] = parsed.map(category => ({
    ...category,
    exercises: (category.exercises ?? []).map((exercise: Exercise) => {
      let template = templates.find(item => sameTemplate(item, exercise));
      if (!template) {
        template = {
          id: genId(),
          name: exercise.name,
          weight: exercise.weight,
          unit: exercise.unit,
        };
        templates.push(template);
      }
      return { ...exercise, templateId: template.id };
    }),
  }));
  const migrated = { categories, templates };
  await save(migrated);
  return migrated;
}

async function save(store: WorkoutStore): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
}

export async function getCategories(): Promise<WorkoutCategory[]> {
  return (await readStore()).categories;
}

export async function getExerciseTemplates(): Promise<ExerciseTemplate[]> {
  return (await readStore()).templates;
}

export async function addCategory(name: string): Promise<WorkoutCategory> {
  const store = await readStore();
  const cat: WorkoutCategory = {
    id: genId(),
    name,
    exercises: [],
    createdAt: new Date().toISOString(),
  };
  await save({ ...store, categories: [...store.categories, cat] });
  return cat;
}

export async function updateCategory(id: string, name: string): Promise<void> {
  const store = await readStore();
  await save({
    ...store,
    categories: store.categories.map(c => (c.id === id ? { ...c, name } : c)),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const store = await readStore();
  await save({
    ...store,
    categories: store.categories.filter(c => c.id !== id),
  });
}

async function writeExercise(
  catId: string,
  exId: string | null,
  draft: ExerciseDraft,
): Promise<void> {
  const store = await readStore();
  const shared = {
    name: draft.name.trim(),
    weight: draft.weight.trim(),
    unit: draft.unit,
  };
  let template = draft.templateId
    ? store.templates.find(item => item.id === draft.templateId)
    : null;
  if (!template) {
    template = store.templates.find(item => sameTemplate(item, shared));
  }
  if (template) {
    const templateId = template.id;
    store.templates = store.templates.map(item =>
      item.id === templateId ? { ...item, ...shared } : item,
    );
  } else {
    template = { id: genId(), ...shared };
    store.templates.push(template);
  }
  const templateId = template.id;
  store.categories = store.categories.map(category => ({
    ...category,
    exercises: category.exercises.map(exercise =>
      exercise.templateId === templateId
        ? { ...exercise, ...shared }
        : exercise,
    ),
  }));
  store.categories = store.categories.map(category => {
    if (category.id !== catId) {
      return category;
    }
    const fields = {
      ...shared,
      templateId,
      sets: draft.sets,
      reps: draft.reps,
      restSeconds: draft.restSeconds,
    };
    return {
      ...category,
      exercises: exId
        ? category.exercises.map(exercise =>
            exercise.id === exId ? { ...exercise, ...fields } : exercise,
          )
        : [
            ...category.exercises,
            { ...fields, id: genId(), completed: false },
          ],
    };
  });
  await save(store);
}

export async function addExercise(
  catId: string,
  ex: ExerciseDraft,
): Promise<void> {
  await writeExercise(catId, null, ex);
}

export async function updateExercise(
  catId: string,
  exId: string,
  updates: ExerciseDraft,
): Promise<void> {
  await writeExercise(catId, exId, updates);
}

export async function deleteExercise(
  catId: string,
  exId: string,
): Promise<void> {
  const store = await readStore();
  await save({
    ...store,
    categories: store.categories.map(c =>
      c.id === catId
        ? { ...c, exercises: c.exercises.filter(e => e.id !== exId) }
        : c,
    ),
  });
}

export async function toggleExercise(
  catId: string,
  exId: string,
): Promise<void> {
  const store = await readStore();
  await save({
    ...store,
    categories: store.categories.map(c =>
      c.id === catId
        ? {
            ...c,
            exercises: c.exercises.map(e =>
              e.id === exId ? { ...e, completed: !e.completed } : e,
            ),
          }
        : c,
    ),
  });
}

export async function resetAllExercises(catId: string): Promise<void> {
  const store = await readStore();
  await save({
    ...store,
    categories: store.categories.map(c =>
      c.id === catId
        ? {
            ...c,
            exercises: c.exercises.map(e => ({ ...e, completed: false })),
          }
        : c,
    ),
  });
}
