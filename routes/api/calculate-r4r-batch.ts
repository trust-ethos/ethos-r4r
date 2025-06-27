import { FreshContext } from "$fresh/server.ts";
import { saveLeaderboardEntry } from "../../utils/database.ts";

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

interface BatchCalculationRequest {
  userkeys: string[];
  limit?: number;
}

interface BatchCalculationResponse {
  processed: number;
  errors: string[];
  results: Array<{
    userkey: string;
    username: string;
    r4rScore: number;
    processingTime: number;
  }>;
}

// Calculate R4R score for a single user
async function calculateUserR4rScore(userkey: string): Promise<{
  userkey: string;
  username: string;
  name: string;
  avatar: string;
  score: number;
  r4rScore: number;
  reviewsGiven: number;
  reviewsReceived: number;
  reciprocalReviews: number;
  quickReciprocations: number;
  avgReciprocalTime: number;
  riskLevel: "low" | "moderate" | "high";
  processingTime: number;
} | null> {
  const startTime = Date.now();
  
  try {
    // Fetch user's given reviews
    const givenResponse = await fetch("https://ethos.network/api/activities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userkey: userkey,
        limit: 1000, // Get more reviews for better analysis
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

    // Fetch user's received reviews
    const receivedResponse = await fetch("https://ethos.network/api/activities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userkey: userkey,
        limit: 1000,
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

    // Get user info from the first review
    const userInfo = givenReviews[0]?.author || receivedReviews[0]?.subject;
    if (!userInfo) {
      console.warn(`No user info found for ${userkey}`);
      return null;
    }

    // Filter out archived reviews
    const activeGivenReviews = givenReviews.filter(r => !r.archived);
    const activeReceivedReviews = receivedReviews.filter(r => !r.archived);

    // Find reciprocal relationships
    const reciprocalPairs: Array<{
      givenReview: EthosActivity;
      reciprocalReview: EthosActivity;
      timeDifference: number;
    }> = [];
    const quickReciprocations: Array<{
      givenReview: EthosActivity;
      reciprocalReview: EthosActivity;
      timeDifference: number;
    }> = [];
    let totalReciprocalTime = 0;

    for (const givenReview of activeGivenReviews) {
      const reciprocalReview = activeReceivedReviews.find(
        r => r.author.username === givenReview.subject.username
      );

      if (reciprocalReview) {
        const givenTime = new Date(givenReview.createdAt).getTime();
        const receivedTime = new Date(reciprocalReview.createdAt).getTime();
        const timeDifference = Math.abs(givenTime - receivedTime) / (1000 * 60 * 60); // hours

        reciprocalPairs.push({
          givenReview,
          reciprocalReview,
          timeDifference
        });

        totalReciprocalTime += timeDifference;

        // Count quick reciprocations (within 24 hours)
        if (timeDifference <= 24) {
          quickReciprocations.push({ givenReview, reciprocalReview, timeDifference });
        }
      }
    }

    const reviewsGiven = activeGivenReviews.length;
    const reviewsReceived = activeReceivedReviews.length;
    const reciprocalCount = reciprocalPairs.length;
    const quickReciprocalCount = quickReciprocations.length;
    const avgReciprocalTime = reciprocalCount > 0 ? totalReciprocalTime / reciprocalCount : 0;

    // Calculate R4R Score using the same algorithm as ReviewAnalysis
    let baseScore = reviewsReceived > 0 ? (reciprocalCount / reviewsReceived) * 100 : 0;

    // Volume multiplier (reduced from original harsh values)
    let volumeMultiplier = 1.0;
    if (reciprocalCount >= 50) volumeMultiplier = 1.2;
    else if (reciprocalCount >= 20) volumeMultiplier = 1.15;
    else if (reciprocalCount >= 10) volumeMultiplier = 1.05;

    // Account age factor (would need actual account creation date - using review activity as proxy)
    let accountAgeMultiplier = 1.0;
    const oldestReview = Math.min(
      ...activeGivenReviews.map(r => new Date(r.createdAt).getTime()),
      ...activeReceivedReviews.map(r => new Date(r.createdAt).getTime())
    );
    const accountAgeDays = (Date.now() - oldestReview) / (1000 * 60 * 60 * 24);
    const reviewsPerDay = (reviewsGiven + reviewsReceived) / Math.max(accountAgeDays, 1);

    if (accountAgeDays < 30 && reviewsPerDay > 10) accountAgeMultiplier = 1.4;
    else if (accountAgeDays < 60 && reviewsPerDay > 5) accountAgeMultiplier = 1.25;
    else if (accountAgeDays < 90 && reviewsPerDay > 2) accountAgeMultiplier = 1.1;

    // Time-based penalties
    let timePenalty = 0;
    const quickReciprocalPercentage = reciprocalCount > 0 ? (quickReciprocalCount / reciprocalCount) * 100 : 0;
    
    if (quickReciprocalPercentage >= 80) timePenalty = 12.5; // 10-15 range
    else if (quickReciprocalPercentage >= 60) timePenalty = 10; // 8-12 range  
    else if (quickReciprocalPercentage >= 40) timePenalty = 6.5; // 5-8 range
    else if (quickReciprocalPercentage >= 20) timePenalty = 3; // 2-4 range

    // Final calculation
    const r4rScore = Math.min(100, Math.max(0, 
      (baseScore * volumeMultiplier * accountAgeMultiplier) + timePenalty
    ));

    // Risk level
    let riskLevel: "low" | "moderate" | "high" = "low";
    if (r4rScore >= 70) riskLevel = "high";
    else if (r4rScore >= 40) riskLevel = "moderate";

    const processingTime = Date.now() - startTime;

    return {
      userkey: userInfo.userkey,
      username: userInfo.username,
      name: userInfo.name,
      avatar: userInfo.avatar,
      score: userInfo.score,
      r4rScore: Math.round(r4rScore * 100) / 100, // Round to 2 decimal places
      reviewsGiven,
      reviewsReceived,
      reciprocalReviews: reciprocalCount,
      quickReciprocations: quickReciprocalCount,
      avgReciprocalTime: Math.round(avgReciprocalTime * 100) / 100,
      riskLevel,
      processingTime
    };

  } catch (error) {
    console.error(`Error calculating R4R score for ${userkey}:`, error);
    return null;
  }
}

export async function POST(req: Request, _ctx: FreshContext): Promise<Response> {
  try {
    const body: BatchCalculationRequest = await req.json();
    const { userkeys, limit = 50 } = body;

    if (!userkeys || !Array.isArray(userkeys) || userkeys.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: "userkeys array is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Limit batch size to prevent overload
    const limitedUserkeys = userkeys.slice(0, Math.min(limit, 100));
    
    console.log(`🔄 Starting batch R4R calculation for ${limitedUserkeys.length} users...`);
    
    const results: BatchCalculationResponse["results"] = [];
    const errors: string[] = [];
    let processed = 0;

    // Process users in smaller chunks to avoid overwhelming the API
    const chunkSize = 5;
    for (let i = 0; i < limitedUserkeys.length; i += chunkSize) {
      const chunk = limitedUserkeys.slice(i, i + chunkSize);
      
      // Process chunk in parallel
      const chunkPromises = chunk.map(async (userkey) => {
        try {
          const result = await calculateUserR4rScore(userkey);
          if (result) {
            // Save to database
            await saveLeaderboardEntry({
              userkey: result.userkey,
              username: result.username,
              name: result.name,
              avatar: result.avatar,
              score: result.score,
              reviews_given: result.reviewsGiven,
              reviews_received: result.reviewsReceived,
              reciprocal_reviews: result.reciprocalReviews,
              farming_score: result.r4rScore,
              risk_level: result.riskLevel,
              quick_reciprocations: result.quickReciprocations,
              avg_reciprocal_time: result.avgReciprocalTime,
              last_analyzed: new Date(),
              analysis_version: 1,
              processing_time: result.processingTime
            });

            results.push({
              userkey: result.userkey,
              username: result.username,
              r4rScore: result.r4rScore,
              processingTime: result.processingTime
            });
            
            processed++;
            console.log(`✅ Processed ${result.username} (${result.r4rScore}% R4R score)`);
          } else {
            errors.push(`Failed to calculate R4R score for ${userkey}`);
          }
        } catch (error) {
          const errorMsg = `Error processing ${userkey}: ${error.message}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      });

      await Promise.allSettled(chunkPromises);
      
      // Small delay between chunks to be respectful to the API
      if (i + chunkSize < limitedUserkeys.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`🎉 Batch processing complete: ${processed}/${limitedUserkeys.length} users processed`);

    return new Response(JSON.stringify({
      ok: true,
      data: {
        processed,
        errors,
        results,
        totalRequested: limitedUserkeys.length
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in batch R4R calculation:", error);
    return new Response(JSON.stringify({
      ok: false,
      error: "Internal server error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
} 