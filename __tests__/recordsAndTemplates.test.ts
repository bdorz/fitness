import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getBodyRecords,
  saveBodyRecord,
} from '../src/features/body-records/bodyRecordRepository';
import {
  addCategory,
  addExercise,
  getCategories,
  getExerciseTemplates,
  mergeExerciseTemplates,
  updateExercise,
} from '../src/features/workouts/workoutRepository';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const storage = new Map<string, string>();
const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  storage.clear();
  getItem.mockReset().mockImplementation(async (key: string) => storage.get(key) ?? null);
  setItem.mockReset().mockImplementation(async (key: string, value: string) => {
    storage.set(key, value);
  });
});

it('loads old body records and saves the three optional measurements', async () => {
  storage.set(
    '@fitness_body_records',
    JSON.stringify([{ date: '2026-11-01', weight: 70, waist: 80 }]),
  );
  expect(await getBodyRecords()).toEqual([
    {
      date: '2026-11-01',
      weight: 70,
      waist: 80,
      bodyFat: null,
      visceralFat: null,
      muscleMass: null,
    },
  ]);

  await saveBodyRecord({
    date: '2026-11-01',
    weight: 69.5,
    waist: null,
    bodyFat: 19.2,
    visceralFat: 7,
    muscleMass: 30.8,
  });
  expect(await getBodyRecords()).toEqual([
    {
      date: '2026-11-01',
      weight: 69.5,
      waist: null,
      bodyFat: 19.2,
      visceralFat: 7,
      muscleMass: 30.8,
    },
  ]);
});

it('migrates matching old exercises into one card and keeps local fields', async () => {
  storage.set(
    '@fitness_categories',
    JSON.stringify([
      {
        id: 'day-a',
        name: '胸 A',
        createdAt: '2026-11-01',
        exercises: [
          {
            id: 'a',
            name: '史密斯上斜胸推',
            weight: '40',
            unit: 'kg',
            sets: '4',
            reps: '10',
            restSeconds: 90,
            completed: true,
          },
        ],
      },
      {
        id: 'day-b',
        name: '胸 B',
        createdAt: '2026-11-02',
        exercises: [
          {
            id: 'b',
            name: '史密斯上斜胸推',
            weight: '40',
            unit: 'kg',
            sets: '3',
            reps: '8',
            restSeconds: 120,
            completed: false,
          },
        ],
      },
    ]),
  );
  const templates = await getExerciseTemplates();
  expect(templates).toHaveLength(1);
  const categories = await getCategories();
  expect(categories[0].exercises[0].templateId).toBe(templates[0].id);
  expect(categories[1].exercises[0].templateId).toBe(templates[0].id);

  await updateExercise('day-a', 'a', {
    templateId: templates[0].id,
    name: '史密斯上斜推',
    weight: '45',
    unit: 'kg',
    sets: '5',
    reps: '6',
    restSeconds: 75,
  });
  const updated = await getCategories();
  expect(updated[1].exercises[0]).toMatchObject({
    name: '史密斯上斜推',
    weight: '45',
    unit: 'kg',
    sets: '3',
    reps: '8',
    restSeconds: 120,
    completed: false,
  });
  expect(updated[0].exercises[0]).toMatchObject({
    sets: '5',
    reps: '6',
    restSeconds: 75,
    completed: true,
  });
});

it('reuses a card on another day with independent sets, reps, and rest', async () => {
  const first = await addCategory('胸 A');
  const second = await addCategory('胸 B');
  await addExercise(first.id, {
    templateId: null,
    name: '史密斯上斜胸推',
    weight: '40',
    unit: 'kg',
    sets: '4',
    reps: '10',
    restSeconds: 90,
  });
  const [template] = await getExerciseTemplates();
  await addExercise(second.id, {
    templateId: template.id,
    name: template.name,
    weight: template.weight,
    unit: template.unit,
    sets: '3',
    reps: '12',
    restSeconds: 60,
  });
  expect(await getExerciseTemplates()).toHaveLength(1);
  const categories = await getCategories();
  expect(categories[1].exercises[0]).toMatchObject({
    templateId: template.id,
    name: '史密斯上斜胸推',
    weight: '40',
    sets: '3',
    reps: '12',
    restSeconds: 60,
  });
});

it('keeps different old weights separate until the user merges their cards', async () => {
  storage.set(
    '@fitness_categories',
    JSON.stringify([
      {
        id: 'day-a',
        name: '胸 A',
        createdAt: '2026-11-01',
        exercises: [
          {
            id: 'a',
            name: '史密斯上斜胸推',
            weight: '40',
            unit: 'kg',
            sets: '4',
            reps: '10',
            restSeconds: 90,
            completed: true,
          },
          {
            id: 'b',
            name: '史密斯上斜胸推',
            weight: '45',
            unit: 'kg',
            sets: '3',
            reps: '8',
            restSeconds: 120,
            completed: false,
          },
        ],
      },
    ]),
  );
  const templates = await getExerciseTemplates();
  expect(templates).toHaveLength(2);
  expect((await getCategories())[0].exercises.map(exercise => exercise.weight)).toEqual([
    '40',
    '45',
  ]);

  await mergeExerciseTemplates(templates[1].id, templates[0].id);
  expect(await getExerciseTemplates()).toHaveLength(1);
  expect((await getCategories())[0].exercises).toMatchObject([
    {
      templateId: templates[0].id,
      weight: '40',
      sets: '4',
      reps: '10',
      restSeconds: 90,
      completed: true,
    },
    {
      templateId: templates[0].id,
      weight: '40',
      sets: '3',
      reps: '8',
      restSeconds: 120,
      completed: false,
    },
  ]);
});
