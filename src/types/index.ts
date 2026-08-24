export interface Exercise {
  id: string;
  name: string;
  weight: string;
  unit: 'kg' | 'lbs';
  sets: string;
  reps: string;
  completed: boolean;
}

export interface WorkoutCategory {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: string;
}

export interface BodyRecord {
  date: string;
  weight: number;
  waist: number | null;
}

export type RootStackParamList = {
  MainTabs: undefined;
  Exercises: { categoryId: string };
};

export type TabParamList = {
  Workouts: undefined;
  BodyRecords: undefined;
  Converter: undefined;
  Settings: undefined;
};
