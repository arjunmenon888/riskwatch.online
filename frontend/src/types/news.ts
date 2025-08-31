import { type UserRole } from '../context/AuthContext';

export interface Post {
  id: number;
  title: string;
  summary: string;
  description: string;
  image_url: string;
  source_name: string;
  source_url: string;
  published_date: string;
}

export interface FetchStatus {
  stage: string;
  progress: number;
  message: string;
  is_complete: boolean;
}