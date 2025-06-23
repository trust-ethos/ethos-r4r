import { signal } from "@preact/signals";

// Shared signals for communication between components
export interface SelectedUserData {
  userkey: string;
  avatar: string;
  name: string;
  username: string;
  description: string;
  score: number;
  scoreXpMultiplier: number;
  profileId?: number;
  primaryAddress?: string;
}

// Signal to trigger analysis
export const analyzeUserSignal = signal<SelectedUserData | null>(null);

// Signal to control analysis view
export const showAnalysisSignal = signal(false); 