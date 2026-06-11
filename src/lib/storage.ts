import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Project } from '@/types/project';

const STORAGE_KEY = '@groovx/projects';

export async function loadProjects(): Promise<Project[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
