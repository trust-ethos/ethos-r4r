import { FreshContext } from "$fresh/server.ts";
import { globalScheduler } from "../../utils/scheduler.ts";

export async function GET(_req: Request, _ctx: FreshContext): Promise<Response> {
  try {
    const jobs = globalScheduler.getAllJobsStatus();
    
    const jobsWithTimeInfo = jobs.map(job => {
      const now = Date.now();
      const nextRunIn = Math.max(0, job.nextRun.getTime() - now);
      const lastRunAgo = job.lastRun ? now - job.lastRun.getTime() : null;
      
      return {
        id: job.id,
        name: job.name,
        isRunning: job.isRunning,
        intervalMs: job.intervalMs,
        intervalHuman: formatInterval(job.intervalMs),
        lastRun: job.lastRun,
        lastRunAgo: lastRunAgo ? formatDuration(lastRunAgo) : null,
        nextRun: job.nextRun,
        nextRunIn: formatDuration(nextRunIn),
        nextRunInMs: nextRunIn
      };
    });

    return new Response(JSON.stringify({
      ok: true,
      data: {
        totalJobs: jobs.length,
        runningJobs: jobs.filter(j => j.isRunning).length,
        jobs: jobsWithTimeInfo,
        serverTime: new Date().toISOString()
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error getting job status:", error);
    return new Response(JSON.stringify({
      ok: false,
      error: "Failed to get job status",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: Request, _ctx: FreshContext): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, jobId } = body;

    if (action === "run" && jobId) {
      // Run a specific job immediately
      const success = await globalScheduler.runJob(jobId);
      
      return new Response(JSON.stringify({
        ok: success,
        message: success ? `Job ${jobId} started successfully` : `Failed to start job ${jobId}`,
        jobId
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === "status" && jobId) {
      // Get status of a specific job
      const status = globalScheduler.getJobStatus(jobId);
      
      return new Response(JSON.stringify({
        ok: status.exists,
        data: status.exists ? status : null,
        message: status.exists ? "Job found" : "Job not found"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      ok: false,
      error: "Invalid action or missing jobId",
      validActions: ["run", "status"]
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in job action:", error);
    return new Response(JSON.stringify({
      ok: false,
      error: "Job action failed",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Helper functions
function formatInterval(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  }
  return `${minutes}m`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return "now";
  }
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
} 