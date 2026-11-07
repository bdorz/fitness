export interface Exercise {
  id: string;
  templateId?: string;
  name: string;
  weight: string;
  unit: 'kg' | 'lbs';
  sets: string;
  reps: string;
  restSeconds?: number;
  completed: boolean;
}

export interface ExerciseTemplate {
  id: string;
  name: string;
  weight: string;
  unit: 'kg' | 'lbs';
}

export type ExerciseDraft = Pick<
  Exercise,
  'name' | 'weight' | 'unit' | 'sets' | 'reps' | 'restSeconds'
> & { templateId: string | null };

export interface WorkoutCategory {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: string;
}
