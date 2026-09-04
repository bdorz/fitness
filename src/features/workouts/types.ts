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
