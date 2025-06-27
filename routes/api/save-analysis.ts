import { Handlers } from "$fresh/server.ts";
import { saveLeaderboardEntry, type LeaderboardEntry } from "../../utils/database.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const analysisData = await req.json();
      
      // Validate required fields
      if (!analysisData.userkey || !analysisData.username || !analysisData.name) {
        return new Response(JSON.stringify({
          ok: false,
          error: "Missing required fields: userkey, username, name"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Determine risk level based on farming score
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (analysisData.farmingScore >= 70) {
        riskLevel = 'high';
      } else if (analysisData.farmingScore >= 40) {
        riskLevel = 'moderate';
      }

      // Calculate average reciprocal time (in days)
      const avgReciprocalTime = analysisData.avgReciprocalTime || 0;

      const entry: LeaderboardEntry = {
        userkey: analysisData.userkey,
        username: analysisData.username,
        name: analysisData.name,
        avatar: analysisData.avatar || '',
        score: analysisData.score || 0,
        reviews_given: analysisData.reviewsGiven || 0,
        reviews_received: analysisData.reviewsReceived || 0,
        reciprocal_reviews: analysisData.reciprocalReviews || 0,
        farming_score: analysisData.farmingScore || 0,
        risk_level: riskLevel,
        quick_reciprocations: analysisData.quickReciprocations || 0,
        avg_reciprocal_time: avgReciprocalTime,
        last_analyzed: new Date().toISOString(),
        analysis_version: 'v1.0',
        processing_time: analysisData.processingTime || 0,
        ethos_score: analysisData.ethosScore || 0,
        ethos_xp: analysisData.ethosXp || 0,
        high_risk_r4rs: analysisData.highRiskR4rs || 0
      };

      await saveLeaderboardEntry(entry);

      return new Response(JSON.stringify({
        ok: true,
        message: "Analysis saved successfully",
        entry: {
          username: entry.username,
          farmingScore: entry.farming_score,
          riskLevel: entry.risk_level
        }
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Error saving analysis:", error);
      
      // If database is not configured, return success but log warning
      if (error.message?.includes("DATABASE_URL")) {
        console.warn("⚠️ Analysis not saved - database not configured");
        return new Response(JSON.stringify({
          ok: true,
          message: "Analysis completed (database not configured for persistence)",
          entry: {
            username: "unknown",
            farmingScore: 0,
            riskLevel: 'low'
          }
        }), {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      
      return new Response(JSON.stringify({
        ok: false,
        error: "Failed to save analysis data"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 