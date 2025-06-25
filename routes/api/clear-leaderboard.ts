import { clearLeaderboard } from "../../utils/database.ts";

export const handler = {
  async DELETE(_req: Request): Promise<Response> {
    try {
      const deletedCount = await clearLeaderboard();
      
      return new Response(JSON.stringify({
        success: true,
        message: `Cleared ${deletedCount} entries from leaderboard`,
        deletedCount
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("❌ Failed to clear leaderboard:", error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}; 