import { Handlers } from "$fresh/server.ts";
import { getLeaderboard, getLeaderboardStats } from "../../utils/database.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      
      const [entries, stats] = await Promise.all([
        getLeaderboard(limit, offset),
        getLeaderboardStats()
      ]);

      return new Response(JSON.stringify({
        ok: true,
        entries,
        stats,
        pagination: {
          limit,
          offset,
          total: stats.totalEntries
        }
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      console.error("Error details:", error.name, error.message);
      
      // If database is not configured, return empty leaderboard
      if (error.message?.includes("DATABASE_URL")) {
        return new Response(JSON.stringify({
          ok: true,
          entries: [],
          stats: {
            totalEntries: 0,
            highRisk: 0,
            moderateRisk: 0,
            lowRisk: 0,
            lastUpdated: null
          },
          pagination: {
            limit,
            offset,
            total: 0
          },
          message: "Database not configured. Set DATABASE_URL to enable leaderboard persistence."
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
        error: "Failed to fetch leaderboard data"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 