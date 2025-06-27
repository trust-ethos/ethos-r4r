import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

// Database connection
let client: Client | null = null;

export async function getClient(): Promise<Client> {
  if (!client) {
    const databaseUrl = Deno.env.get("DATABASE_URL");
    if (!databaseUrl) {
      console.warn("⚠️ DATABASE_URL not set. Database features will be disabled.");
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    try {
      client = new Client(databaseUrl);
      await client.connect();
      await initializeTables();
      console.log("✅ Connected to PostgreSQL database");
    } catch (error) {
      console.error("❌ Failed to connect to database:", error);
      client = null;
      throw error;
    }
  }
  return client;
}

async function initializeTables(): Promise<void> {
  if (!client) return;
  
  // Create leaderboard entries table
  await client.queryObject`
    CREATE TABLE IF NOT EXISTS leaderboard_entries (
      userkey VARCHAR(255) PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      avatar TEXT NOT NULL,
      score INTEGER NOT NULL,
      reviews_given INTEGER NOT NULL,
      reviews_received INTEGER NOT NULL,
      reciprocal_reviews INTEGER NOT NULL,
      farming_score INTEGER NOT NULL,
      risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high')),
      quick_reciprocations INTEGER NOT NULL,
      avg_reciprocal_time DECIMAL(10,2) NOT NULL,
      last_analyzed TIMESTAMP NOT NULL,
      analysis_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
      processing_time INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Migration: Fix column name if it exists with typo
  try {
    await client.queryObject`
      ALTER TABLE leaderboard_entries 
      RENAME COLUMN avg_reciproca_time TO avg_reciprocal_time
    `;
    console.log("✅ Fixed avg_reciprocal_time column name");
  } catch (error) {
    // Column either doesn't exist or already has correct name - that's fine
  }

  // Migration: Add missing column if it doesn't exist
  try {
    await client.queryObject`
      ALTER TABLE leaderboard_entries 
      ADD COLUMN IF NOT EXISTS avg_reciprocal_time DECIMAL(10,2) DEFAULT 0
    `;
  } catch (error) {
    // Column already exists - that's fine
  }

  // Migration: Add ethos_score and ethos_xp columns
  try {
    await client.queryObject`
      ALTER TABLE leaderboard_entries 
      ADD COLUMN IF NOT EXISTS ethos_score INTEGER DEFAULT 0
    `;
  } catch (error) {
    // Column already exists - that's fine
  }

  try {
    await client.queryObject`
      ALTER TABLE leaderboard_entries 
      ADD COLUMN IF NOT EXISTS ethos_xp INTEGER DEFAULT 0
    `;
  } catch (error) {
    // Column already exists - that's fine
  }

  // Migration: Add high_risk_r4rs column
  try {
    await client.queryObject`
      ALTER TABLE leaderboard_entries 
      ADD COLUMN IF NOT EXISTS high_risk_r4rs INTEGER DEFAULT 0
    `;
    console.log("✅ Added high_risk_r4rs column");
  } catch (error) {
    // Column already exists - that's fine
  }

  // Create index for better performance
  await client.queryObject`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_farming_score ON leaderboard_entries(farming_score DESC)
  `;
  
  await client.queryObject`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_risk_level ON leaderboard_entries(risk_level)
  `;
  
  await client.queryObject`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_last_analyzed ON leaderboard_entries(last_analyzed DESC)
  `;
  
  await client.queryObject`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_high_risk_r4rs ON leaderboard_entries(high_risk_r4rs DESC)
  `;
}

export interface LeaderboardEntry {
  userkey: string;
  username: string;
  name: string;
  avatar: string;
  score: number;
  reviews_given: number;
  reviews_received: number;
  reciprocal_reviews: number;
  farming_score: number;
  risk_level: 'low' | 'moderate' | 'high';
  quick_reciprocations: number;
  avg_reciprocal_time: number;
  last_analyzed: string;
  analysis_version: string;
  processing_time: number;
  ethos_score?: number;
  ethos_xp?: number;
  high_risk_r4rs?: number;
  created_at?: string;
  updated_at?: string;
}

export async function saveLeaderboardEntry(entry: LeaderboardEntry): Promise<void> {
  const db = await getClient();
  
  await db.queryObject`
    INSERT INTO leaderboard_entries (
      userkey, username, name, avatar, score, reviews_given, reviews_received,
      reciprocal_reviews, farming_score, risk_level, quick_reciprocations,
      avg_reciprocal_time, last_analyzed, analysis_version, processing_time,
      ethos_score, ethos_xp, high_risk_r4rs, updated_at
    ) VALUES (
      ${entry.userkey}, ${entry.username}, ${entry.name}, ${entry.avatar},
      ${entry.score}, ${entry.reviews_given}, ${entry.reviews_received},
      ${entry.reciprocal_reviews}, ${entry.farming_score}, ${entry.risk_level},
      ${entry.quick_reciprocations}, ${entry.avg_reciprocal_time},
      ${entry.last_analyzed}, ${entry.analysis_version}, ${entry.processing_time},
      ${entry.ethos_score || 0}, ${entry.ethos_xp || 0}, ${entry.high_risk_r4rs || 0}, NOW()
    )
    ON CONFLICT (userkey) DO UPDATE SET
      username = EXCLUDED.username,
      name = EXCLUDED.name,
      avatar = EXCLUDED.avatar,
      score = EXCLUDED.score,
      reviews_given = EXCLUDED.reviews_given,
      reviews_received = EXCLUDED.reviews_received,
      reciprocal_reviews = EXCLUDED.reciprocal_reviews,
      farming_score = EXCLUDED.farming_score,
      risk_level = EXCLUDED.risk_level,
      quick_reciprocations = EXCLUDED.quick_reciprocations,
      avg_reciprocal_time = EXCLUDED.avg_reciprocal_time,
      last_analyzed = EXCLUDED.last_analyzed,
      analysis_version = EXCLUDED.analysis_version,
      processing_time = EXCLUDED.processing_time,
      ethos_score = EXCLUDED.ethos_score,
      ethos_xp = EXCLUDED.ethos_xp,
      high_risk_r4rs = EXCLUDED.high_risk_r4rs,
      updated_at = NOW()
  `;
}

export async function getLeaderboard(
  limit = 50, 
  offset = 0, 
  sortBy = 'farming_score', 
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<LeaderboardEntry[]> {
  // Use a fresh connection for leaderboard queries to avoid connection conflicts
  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  
  const freshClient = new Client(databaseUrl);
  
  try {
    await freshClient.connect();
    
    // Validate sortBy column to prevent SQL injection
    const validColumns = [
      'farming_score', 'username', 'name', 'score', 'reviews_given', 
      'reviews_received', 'reciprocal_reviews', 'quick_reciprocations', 
      'avg_reciprocal_time', 'last_analyzed', 'risk_level', 'ethos_xp',
      'high_risk_r4rs'
    ];
    
    if (!validColumns.includes(sortBy)) {
      sortBy = 'farming_score';
    }
    
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Build the ORDER BY clause based on the column
    let query;
    if (sortBy === 'risk_level') {
      // For risk_level, we need custom ordering since it's not numeric
      query = `
        SELECT * FROM leaderboard_entries
        ORDER BY CASE risk_level 
          WHEN 'high' THEN 3 
          WHEN 'moderate' THEN 2 
          WHEN 'low' THEN 1 
          ELSE 0 END ${orderDirection}, farming_score DESC
        LIMIT $1 OFFSET $2
      `;
    } else {
      // For other columns, use standard ordering
      const secondarySort = sortBy !== 'farming_score' ? ', farming_score DESC' : ', reciprocal_reviews DESC';
      query = `
        SELECT * FROM leaderboard_entries
        ORDER BY ${sortBy} ${orderDirection}${secondarySort}
        LIMIT $1 OFFSET $2
      `;
    }
    
    const result = await freshClient.queryObject<LeaderboardEntry>(query, [limit, offset]);
    
    return result.rows;
  } finally {
    await freshClient.end();
  }
}

export async function getLeaderboardStats(): Promise<{
  totalEntries: number;
  highRisk: number;
  moderateRisk: number;
  lowRisk: number;
  lastUpdated: string | null;
}> {
  // Use a fresh connection for stats queries to avoid connection conflicts
  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  
  const freshClient = new Client(databaseUrl);
  
  try {
    await freshClient.connect();
    
    const totalResult = await freshClient.queryObject<{ count: bigint }>`
      SELECT COUNT(*) as count FROM leaderboard_entries
    `;
    
    const riskResult = await freshClient.queryObject<{ risk_level: string; count: bigint }>`
      SELECT risk_level, COUNT(*) as count
      FROM leaderboard_entries
      GROUP BY risk_level
    `;
    
    const lastUpdatedResult = await freshClient.queryObject<{ last_analyzed: string }>`
      SELECT last_analyzed FROM leaderboard_entries
      ORDER BY last_analyzed DESC
      LIMIT 1
    `;
  
    const riskCounts = {
      high: 0,
      moderate: 0,
      low: 0
    };
    
    riskResult.rows.forEach(row => {
      riskCounts[row.risk_level as keyof typeof riskCounts] = Number(row.count);
    });
    
    return {
      totalEntries: Number(totalResult.rows[0]?.count || 0),
      highRisk: riskCounts.high,
      moderateRisk: riskCounts.moderate,
      lowRisk: riskCounts.low,
      lastUpdated: lastUpdatedResult.rows[0]?.last_analyzed || null
    };
  } finally {
    await freshClient.end();
  }
}

export async function clearLeaderboard(): Promise<number> {
  const db = await getClient();
  
  // First get the count
  const countResult = await db.queryObject<{ count: bigint }>`
    SELECT COUNT(*) as count FROM leaderboard_entries
  `;
  
  const count = Number(countResult.rows[0]?.count || 0);
  
  // Then delete all entries
  await db.queryObject`
    DELETE FROM leaderboard_entries
  `;
  
  return count;
} 