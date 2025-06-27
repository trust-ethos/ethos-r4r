import { FreshContext } from "$fresh/server.ts";
import { getClient, getLeaderboard } from "../../utils/database.ts";

interface EthosActivity {
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
  data?: {
    score: "positive" | "negative" | "neutral";
    comment: string;
  };
}

interface EthosActivitiesResponse {
  values: EthosActivity[];
  total: number;
  limit: number;
  offset: number;
}

// Function to fetch activities for a user
async function fetchUserActivities(username: string, type: 'given' | 'received'): Promise<EthosActivity[]> {
  try {
    const endpoint = type === 'given' 
      ? `/api/ethos-activities-given?username=${encodeURIComponent(username)}`
      : `/api/ethos-activities-received?username=${encodeURIComponent(username)}`;
    
    const response = await fetch(`http://localhost:8000${endpoint}`);
    if (!response.ok) {
      console.warn(`Failed to fetch ${type} activities for ${username}: ${response.status}`);
      return [];
    }
    
    const data: EthosActivitiesResponse = await response.json();
    return data.values?.filter(activity => !activity.archived) || [];
  } catch (error) {
    console.warn(`Error fetching ${type} activities for ${username}:`, error);
    return [];
  }
}

// Function to calculate high risk R4Rs for a user
async function calculateHighRiskR4rs(username: string, allEntries: any[]): Promise<number> {
  try {
    const [givenReviews, receivedReviews] = await Promise.all([
      fetchUserActivities(username, 'given'),
      fetchUserActivities(username, 'received')
    ]);

    // Create a map of users by username for quick R4R score lookup
    const userR4rMap = new Map<string, number>();
    allEntries.forEach(entry => {
      userR4rMap.set(entry.username, entry.farming_score);
    });

    // Find reciprocal reviews
    let highRiskR4rs = 0;
    
    givenReviews.forEach(givenReview => {
      const targetUsername = givenReview.subject.username;
      const matchingReceived = receivedReviews.find(r => r.author.username === targetUsername);
      
      if (matchingReceived) {
        // Only count as R4R if BOTH reviews are positive
        const givenRating = givenReview.data?.score || givenReview.content?.rating;
        const receivedRating = matchingReceived.data?.score || matchingReceived.content?.rating;
        
        if (givenRating === 'positive' && receivedRating === 'positive') {
          // Check if the other user has high R4R score (≥70%)
          const otherUserR4rScore = userR4rMap.get(targetUsername);
          if (otherUserR4rScore !== undefined && otherUserR4rScore >= 70) {
            highRiskR4rs++;
          }
        }
      }
    });

    return highRiskR4rs;
  } catch (error) {
    console.error(`Error calculating high risk R4Rs for ${username}:`, error);
    return 0;
  }
}

export const handler = {
  async POST(_req: Request, _ctx: FreshContext) {
    try {
      console.log("🔄 Starting High Risk R4Rs update...");
      
      // Get all entries from the leaderboard
      const entries = await getLeaderboard(1000, 0); // Get up to 1000 entries
      console.log(`📊 Found ${entries.length} entries to update`);

      const client = await getClient();
      let updatedCount = 0;
      
      for (const entry of entries) {
        try {
          // Calculate actual high risk R4Rs based on real review data
          const actualHighRiskR4rs = await calculateHighRiskR4rs(entry.username, entries);
          
          await client.queryObject`
            UPDATE leaderboard_entries 
            SET high_risk_r4rs = ${actualHighRiskR4rs}
            WHERE userkey = ${entry.userkey}
          `;
          
          updatedCount++;
          console.log(`✅ Updated ${entry.username}: ${actualHighRiskR4rs} high risk R4Rs`);
        } catch (error) {
          console.error(`❌ Failed to update ${entry.username}:`, error.message);
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: `Updated ${updatedCount}/${entries.length} entries successfully!`,
        updatedCount,
        totalEntries: entries.length
      }), {
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error) {
      console.error("❌ Failed to update high risk R4Rs:", error.message);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 