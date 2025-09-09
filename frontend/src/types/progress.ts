// filepath: frontend/src/types/progress.ts
export interface ProgressData {
  completed_lesson_ids: number[];
  next_lesson_id: number | null;
  total_lessons: number;
  completed_lessons_count: number;
}