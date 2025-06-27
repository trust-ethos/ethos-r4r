import { FreshContext } from "$fresh/server.ts";

interface EthosUser {
  userkey: string;
  username: string;
  name: string;
  avatar: string;
  score: number;
}

interface JobScheduleRequest {
  batchSize?: number;
  maxUsers?: number;
  onlyHighActivity?: boolean;
}

// Fetch active users from Ethos network
async function fetchActiveUsers(limit: number = 100): Promise<EthosUser[]> {
  try {
    // Get recent activities to find active users
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
    const activities = data.values || [];

    // Extract unique users from activities
    const userMap = new Map<string, EthosUser>();
    
    for (const activity of activities) {
      // Add review authors
      if (activity.author && !userMap.has(activity.author.userkey)) {
        userMap.set(activity.author.userkey, {
          userkey: activity.author.userkey,
          username: activity.author.username,
          name: activity.author.name,
          avatar: activity.author.avatar,
          score: activity.author.score
        });
      }
      
      // Add review subjects
      if (activity.subject && !userMap.has(activity.subject.userkey)) {
        userMap.set(activity.subject.userkey, {
          userkey: activity.subject.userkey,
          username: activity.subject.username,
          name: activity.subject.name,
          avatar: activity.subject.avatar,
          score: activity.subject.score
        });
      }
    }

    const users = Array.from(userMap.values()).slice(0, limit);
    console.log(`📋 Found ${users.length} active users from recent activities`);
    return users;

  } catch (error) {
    console.error("Error fetching active users:", error);
    return [];
  }
}

// Process users in batches
async function processUserBatch(userkeys: string[]): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
}> {
  try {
    const response = await fetch(`${new URL(Deno.env.get("DENO_DEPLOYMENT_ID") ? "https://ethos-r4r-analyzer.deno.dev" : "http://localhost:8000")}/api/calculate-r4r-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userkeys: userkeys,
        limit: userkeys.length
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        processed: 0,
        errors: [`Batch request failed: ${response.status}`]
      };
    }

    const result = await response.json();
    return {
      success: result.ok,
      processed: result.data?.processed || 0,
      errors: result.data?.errors || []
    };

  } catch (error) {
    return {
      success: false,
      processed: 0,
      errors: [`Batch processing error: ${error.message}`]
    };
  }
}

export async function POST(req: Request, _ctx: FreshContext): Promise<Response> {
  try {
    const body: JobScheduleRequest = await req.json().catch(() => ({}));
    const { 
      batchSize = 20, 
      maxUsers = 200, 
      onlyHighActivity = true 
    } = body;

    console.log(`🚀 Starting R4R job scheduler...`);
    console.log(`📊 Config: batchSize=${batchSize}, maxUsers=${maxUsers}, onlyHighActivity=${onlyHighActivity}`);

    // Fetch active users
    const users = await fetchActiveUsers(maxUsers);
    
    if (users.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: "No active users found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Filter high activity users if requested
    let targetUsers = users;
    if (onlyHighActivity) {
      // Filter users with score > 50 (indicating more activity)
      targetUsers = users.filter(user => user.score > 50);
      console.log(`🎯 Filtered to ${targetUsers.length} high-activity users (score > 50)`);
    }

    // Process users in batches
    const userkeys = targetUsers.map(user => user.userkey);
    const totalBatches = Math.ceil(userkeys.length / batchSize);
    
    console.log(`📦 Processing ${userkeys.length} users in ${totalBatches} batches of ${batchSize}`);

    const results = {
      totalUsers: userkeys.length,
      totalBatches,
      batchSize,
      processedUsers: 0,
      successfulBatches: 0,
      failedBatches: 0,
      errors: [] as string[],
      batchResults: [] as Array<{
        batchNumber: number;
        userkeys: string[];
        processed: number;
        success: boolean;
        errors: string[];
      }>
    };

    // Process batches sequentially to avoid overwhelming the system
    for (let i = 0; i < totalBatches; i++) {
      const startIdx = i * batchSize;
      const endIdx = Math.min(startIdx + batchSize, userkeys.length);
      const batchUserkeys = userkeys.slice(startIdx, endIdx);
      
      console.log(`🔄 Processing batch ${i + 1}/${totalBatches} (${batchUserkeys.length} users)...`);
      
      const batchResult = await processUserBatch(batchUserkeys);
      
      results.batchResults.push({
        batchNumber: i + 1,
        userkeys: batchUserkeys,
        processed: batchResult.processed,
        success: batchResult.success,
        errors: batchResult.errors
      });

      if (batchResult.success) {
        results.successfulBatches++;
        results.processedUsers += batchResult.processed;
        console.log(`✅ Batch ${i + 1} completed: ${batchResult.processed} users processed`);
      } else {
        results.failedBatches++;
        results.errors.push(...batchResult.errors);
        console.log(`❌ Batch ${i + 1} failed: ${batchResult.errors.join(", ")}`);
      }

      // Add delay between batches to be respectful
      if (i < totalBatches - 1) {
        console.log(`⏳ Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`🎉 Job scheduler completed!`);
    console.log(`📊 Results: ${results.processedUsers}/${results.totalUsers} users processed`);
    console.log(`📊 Batches: ${results.successfulBatches}/${results.totalBatches} successful`);

    return new Response(JSON.stringify({
      ok: true,
      data: results
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in job scheduler:", error);
    return new Response(JSON.stringify({
      ok: false,
      error: "Job scheduler failed",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// GET endpoint for manual triggering
export async function GET(_req: Request, _ctx: FreshContext): Promise<Response> {
  return new Response(JSON.stringify({
    ok: true,
    message: "R4R Job Scheduler",
    usage: {
      method: "POST",
      body: {
        batchSize: "number (default: 20) - Users per batch",
        maxUsers: "number (default: 200) - Maximum users to process", 
        onlyHighActivity: "boolean (default: true) - Filter to users with score > 50"
      },
      example: {
        batchSize: 10,
        maxUsers: 100,
        onlyHighActivity: true
      }
    }
  }), {
    headers: { "Content-Type": "application/json" }
  });
} 