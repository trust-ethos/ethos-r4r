import { FreshContext } from "$fresh/server.ts";

interface TestBatchRequest {
  userkeys?: string[];
  maxUsers?: number;
  testMode?: boolean;
}

interface EthosActivity {
  subject: {
    userkey: string;
    username: string;
    name: string;
    avatar: string;
    score: number;
  };
  author: {
    userkey: string;
    username: string;
    name: string;
    avatar: string;
    score: number;
  };
  data: {
    score: string;
  };
  createdAt: string;
  archived: boolean;
}

// Simple function to fetch active users from Ethos
async function fetchActiveUsers(limit: number = 10): Promise<Array<{
  userkey: string;
  username: string;
  name: string;
  score: number;
}>> {
  try {
    console.log(`🔍 Fetching ${limit} active users from Ethos...`);
    
    const response = await fetch("https://ethos.network/api/activities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        limit: limit * 2, // Get more activities to find unique users
        offset: 0,
        filter: "reviews"
      }),
    });

    if (!response.ok) {
      console.error(`Failed to fetch activities: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const activities: EthosActivity[] = data.values || [];

    // Extract unique users
    const userMap = new Map();
    for (const activity of activities) {
      if (activity.author && !userMap.has(activity.author.userkey)) {
        userMap.set(activity.author.userkey, {
          userkey: activity.author.userkey,
          username: activity.author.username,
          name: activity.author.name,
          score: activity.author.score
        });
      }
      if (activity.subject && !userMap.has(activity.subject.userkey)) {
        userMap.set(activity.subject.userkey, {
          userkey: activity.subject.userkey,
          username: activity.subject.username,
          name: activity.subject.name,
          score: activity.subject.score
        });
      }
    }

    const users = Array.from(userMap.values()).slice(0, limit);
    console.log(`✅ Found ${users.length} unique active users`);
    return users;

  } catch (error) {
    console.error("Error fetching active users:", error);
    return [];
  }
}

// Simple R4R calculation for a user
async function calculateSimpleR4r(userkey: string): Promise<{
  userkey: string;
  username: string;
  r4rScore: number;
  reviewsGiven: number;
  reviewsReceived: number;
  processingTime: number;
} | null> {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Calculating R4R for user: ${userkey}`);

    // Fetch given reviews
    const givenResponse = await fetch("https://ethos.network/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userkey: userkey,
        limit: 100,
        offset: 0,
        filter: "reviews",
        direction: "given"
      }),
    });

    if (!givenResponse.ok) {
      console.warn(`Failed to fetch given reviews for ${userkey}: ${givenResponse.status}`);
      return null;
    }

    const givenData = await givenResponse.json();
    const givenReviews: EthosActivity[] = givenData.values || [];

    // Fetch received reviews
    const receivedResponse = await fetch("https://ethos.network/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userkey: userkey,
        limit: 100,
        offset: 0,
        filter: "reviews",
        direction: "received"
      }),
    });

    if (!receivedResponse.ok) {
      console.warn(`Failed to fetch received reviews for ${userkey}: ${receivedResponse.status}`);
      return null;
    }

    const receivedData = await receivedResponse.json();
    const receivedReviews: EthosActivity[] = receivedData.values || [];

    // Get user info
    const userInfo = givenReviews[0]?.author || receivedReviews[0]?.subject;
    if (!userInfo) {
      console.warn(`No user info found for ${userkey}`);
      return null;
    }

    // Filter active reviews
    const activeGiven = givenReviews.filter(r => !r.archived);
    const activeReceived = receivedReviews.filter(r => !r.archived);

    // Calculate reciprocal relationships
    let reciprocalCount = 0;
    for (const given of activeGiven) {
      const reciprocal = activeReceived.find(
        r => r.author.username === given.subject.username
      );
      if (reciprocal) {
        reciprocalCount++;
      }
    }

    // Simple R4R score calculation
    const reviewsGiven = activeGiven.length;
    const reviewsReceived = activeReceived.length;
    const r4rScore = reviewsReceived > 0 ? (reciprocalCount / reviewsReceived) * 100 : 0;

    const processingTime = Date.now() - startTime;

    console.log(`✅ Calculated R4R for @${userInfo.username}: ${r4rScore.toFixed(1)}%`);

    return {
      userkey: userInfo.userkey,
      username: userInfo.username,
      r4rScore: Math.round(r4rScore * 10) / 10,
      reviewsGiven,
      reviewsReceived,
      processingTime
    };

  } catch (error) {
    console.error(`Error calculating R4R for ${userkey}:`, error);
    return null;
  }
}

export async function GET(_req: Request, _ctx: FreshContext): Promise<Response> {
  return new Response(JSON.stringify({
    ok: true,
    message: "Simple Batch R4R Calculator",
    usage: {
      method: "POST",
      body: {
        userkeys: "array of user keys (optional)",
        maxUsers: "number (default: 5) - max users to process",
        testMode: "boolean (default: true) - use test data"
      },
      example: {
        maxUsers: 3,
        testMode: true
      }
    }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function POST(req: Request, _ctx: FreshContext): Promise<Response> {
  try {
    const body: TestBatchRequest = await req.json().catch(() => ({}));
    const { userkeys, maxUsers = 5, testMode = true } = body;

    console.log(`🚀 Starting simple batch R4R calculation...`);
    console.log(`📊 Config: maxUsers=${maxUsers}, testMode=${testMode}`);

    let targetUserkeys: string[] = [];

    if (userkeys && userkeys.length > 0) {
      // Use provided user keys
      targetUserkeys = userkeys.slice(0, maxUsers);
      console.log(`📝 Using provided userkeys: ${targetUserkeys.length}`);
    } else {
      // Fetch active users
      const activeUsers = await fetchActiveUsers(maxUsers);
      targetUserkeys = activeUsers.map(u => u.userkey);
      console.log(`🔍 Fetched active userkeys: ${targetUserkeys.length}`);
    }

    if (targetUserkeys.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: "No users found to process"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const results: Array<{
      userkey: string;
      username: string;
      r4rScore: number;
      reviewsGiven: number;
      reviewsReceived: number;
      processingTime: number;
    }> = [];
    const errors: string[] = [];
    let processed = 0;

    // Process users one by one (to avoid overwhelming the API)
    for (const userkey of targetUserkeys) {
      try {
        const result = await calculateSimpleR4r(userkey);
        if (result) {
          results.push(result);
          processed++;
        } else {
          errors.push(`Failed to process ${userkey}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        const errorMsg = `Error processing ${userkey}: ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`🎉 Simple batch processing complete: ${processed}/${targetUserkeys.length} users`);

    return new Response(JSON.stringify({
      ok: true,
      data: {
        processed,
        total: targetUserkeys.length,
        results,
        errors,
        summary: {
          avgR4rScore: results.length > 0 ? 
            Math.round((results.reduce((sum, r) => sum + r.r4rScore, 0) / results.length) * 10) / 10 : 0,
          avgProcessingTime: results.length > 0 ?
            Math.round(results.reduce((sum, r) => sum + r.processingTime, 0) / results.length) : 0,
          totalReviewsGiven: results.reduce((sum, r) => sum + r.reviewsGiven, 0),
          totalReviewsReceived: results.reduce((sum, r) => sum + r.reviewsReceived, 0)
        }
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in simple batch calculation:", error);
    return new Response(JSON.stringify({
      ok: false,
      error: "Simple batch calculation failed",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
} 