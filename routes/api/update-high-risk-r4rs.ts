import { FreshContext } from "$fresh/server.ts";
import { getClient, getLeaderboard } from "../../utils/database.ts";

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
          // For demo purposes, set a mock value based on farming score
          // In production, this would recalculate from actual review data
          const mockHighRiskR4Rs = Math.max(0, Math.floor(entry.farming_score / 3.5));
          
          await client.queryObject`
            UPDATE leaderboard_entries 
            SET high_risk_r4rs = ${mockHighRiskR4Rs}
            WHERE userkey = ${entry.userkey}
          `;
          
          updatedCount++;
          console.log(`✅ Updated ${entry.username}: ${mockHighRiskR4Rs} high risk R4Rs`);
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