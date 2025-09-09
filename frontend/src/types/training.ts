// filepath: frontend/src/types/training.ts

export interface Attachment {
  id: number;
  filename: string;
  mime_type: string;
  size: number;
  public_url: string; // The full, direct URL to the resource
  created_at: string;
}

export interface Lesson {
  id: number;
  title: string;
  content: string | null;
  order: number;
  attachments: Attachment[];
}

export interface Module {
  id: number;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Training {
  id: number;
  title: string;
  description: string | null;
  is_published: boolean;
  modules: Module[];
}

// For the public-facing navbar dropdown
export interface TrainingListItem {
  id: number;
  title: string;
}

// For the superadmin's "My Trainings" management page
export interface TrainingManagementListItem {
  id: number;
  title: string;
  is_published: boolean;
  created_at: string;
}