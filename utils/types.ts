// Core Ethos types
export interface EthosUser {
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

export interface EthosActivity {
  id: string;
  type: string;
  timestamp: string;
  archived: boolean;
  author: {
    userkey: string;
    name: string;
    username: string;
    avatar: string;
    score: number;
  };
  subject: {
    userkey: string;
    name: string;
    username: string;
    avatar: string;
    score: number;
  };
  content?: {
    text: string;
    rating?: "positive" | "negative" | "neutral";
  };
}

// Leaderboard specific types
export interface LeaderboardEntry {
  userkey: string;
  username: string;
  name: string;
  avatar: string;
  score: number;
  
  // Review statistics
  reviewsGiven: number;
  reviewsReceived: number;
  reciprocalReviews: number;
  
  // Farming metrics
  farmingScore: number;
  riskLevel: 'low' | 'moderate' | 'high';
  quickReciprocations: number;
  avgReciprocaTime: number; // in hours
  
  // Metadata
  lastAnalyzed: string;
  analysisVersion: string;
  processingTime: number; // milliseconds
}

export interface LeaderboardStats {
  totalProfiles: number;
  processedProfiles: number;
  highRiskProfiles: number;
  averageFarmingScore: number;
  lastUpdated: string;
  processingProgress: number; // 0-100
}

export interface BatchProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startIndex: number;
  endIndex: number;
  batchSize: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  processedCount: number;
}

export interface LeaderboardFilters {
  minReviews: number;
  timeRange: '30d' | '90d' | 'all';
  riskLevel: 'high' | 'moderate' | 'low' | 'all';
  sortBy: 'farmingScore' | 'reciprocalCount' | 'avgTimeGap' | 'reviewsReceived';
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
}

// API Response types
export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  stats: LeaderboardStats;
  filters: LeaderboardFilters;
  hasMore: boolean;
}

export interface BatchProcessResponse {
  job: BatchProcessingJob;
  message: string;
  estimatedCompletion?: string;
} 