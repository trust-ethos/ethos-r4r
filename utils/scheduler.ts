// Simple job scheduler for R4R calculations
export class JobScheduler {
  private jobs: Map<string, {
    id: string;
    name: string;
    intervalMs: number;
    lastRun: Date | null;
    nextRun: Date;
    isRunning: boolean;
    handler: () => Promise<void>;
  }> = new Map();

  private timers: Map<string, number> = new Map();

  constructor() {
    console.log("🕐 JobScheduler initialized");
  }

  // Schedule a job to run periodically
  scheduleJob(
    id: string,
    name: string,
    intervalMs: number,
    handler: () => Promise<void>
  ): void {
    // Clear existing job if it exists
    this.clearJob(id);

    const job = {
      id,
      name,
      intervalMs,
      lastRun: null,
      nextRun: new Date(Date.now() + intervalMs),
      isRunning: false,
      handler
    };

    this.jobs.set(id, job);

    // Schedule the job
    const timer = setInterval(async () => {
      await this.runJob(id);
    }, intervalMs);

    this.timers.set(id, timer);

    console.log(`📅 Scheduled job "${name}" (${id}) to run every ${intervalMs / 1000}s`);
  }

  // Schedule a job to run at specific intervals (cron-like)
  scheduleHourlyJob(id: string, name: string, handler: () => Promise<void>): void {
    this.scheduleJob(id, name, 60 * 60 * 1000, handler); // 1 hour
  }

  scheduleDailyJob(id: string, name: string, handler: () => Promise<void>): void {
    this.scheduleJob(id, name, 24 * 60 * 60 * 1000, handler); // 24 hours
  }

  // Run a job immediately
  async runJob(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job) {
      console.error(`❌ Job ${id} not found`);
      return false;
    }

    if (job.isRunning) {
      console.log(`⏳ Job "${job.name}" is already running, skipping...`);
      return false;
    }

    job.isRunning = true;
    job.lastRun = new Date();
    job.nextRun = new Date(Date.now() + job.intervalMs);

    console.log(`🚀 Starting job "${job.name}" (${id})`);

    try {
      await job.handler();
      console.log(`✅ Job "${job.name}" completed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Job "${job.name}" failed:`, error);
      return false;
    } finally {
      job.isRunning = false;
    }
  }

  // Clear a scheduled job
  clearJob(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
    this.jobs.delete(id);
    console.log(`🗑️ Cleared job ${id}`);
  }

  // Get job status
  getJobStatus(id: string): {
    exists: boolean;
    name?: string;
    lastRun?: Date | null;
    nextRun?: Date;
    isRunning?: boolean;
    intervalMs?: number;
  } {
    const job = this.jobs.get(id);
    if (!job) {
      return { exists: false };
    }

    return {
      exists: true,
      name: job.name,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      isRunning: job.isRunning,
      intervalMs: job.intervalMs
    };
  }

  // Get all jobs status
  getAllJobsStatus(): Array<{
    id: string;
    name: string;
    lastRun: Date | null;
    nextRun: Date;
    isRunning: boolean;
    intervalMs: number;
  }> {
    return Array.from(this.jobs.values());
  }

  // Clear all jobs
  clearAllJobs(): void {
    for (const id of this.jobs.keys()) {
      this.clearJob(id);
    }
    console.log("🧹 Cleared all jobs");
  }
}

// Global scheduler instance
export const globalScheduler = new JobScheduler();

// R4R job handlers
export async function runR4rBatchJob(): Promise<void> {
  console.log("🔄 Starting R4R batch job...");
  
  try {
    // Fetch active users and process them
    const response = await fetch(`${getBaseUrl()}/api/schedule-r4r-jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        batchSize: 15,
        maxUsers: 150,
        onlyHighActivity: true
      }),
    });

    if (!response.ok) {
      throw new Error(`Job request failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.ok) {
      const data = result.data;
      console.log(`✅ R4R batch job completed: ${data.processedUsers}/${data.totalUsers} users processed`);
      console.log(`📊 Successful batches: ${data.successfulBatches}/${data.totalBatches}`);
      
      if (data.errors.length > 0) {
        console.warn(`⚠️ Job had ${data.errors.length} errors`);
      }
    } else {
      throw new Error(`Job failed: ${result.error}`);
    }

  } catch (error) {
    console.error("❌ R4R batch job failed:", error);
    throw error;
  }
}

// Utility to get base URL
function getBaseUrl(): string {
  // Check if we're in Deno Deploy
  if (Deno.env.get("DENO_DEPLOYMENT_ID")) {
    return "https://ethos-r4r-analyzer.deno.dev";
  }
  return "http://localhost:8000";
}

// Initialize default jobs
export function initializeDefaultJobs(): void {
  console.log("🎯 Initializing default R4R jobs...");

  // Schedule R4R batch job to run every 6 hours
  globalScheduler.scheduleJob(
    "r4r-batch-6h",
    "R4R Batch Analysis (6h)",
    6 * 60 * 60 * 1000, // 6 hours
    runR4rBatchJob
  );

  // Schedule a smaller job to run every hour for high-priority users
  globalScheduler.scheduleJob(
    "r4r-priority-1h", 
    "R4R Priority Analysis (1h)",
    60 * 60 * 1000, // 1 hour
    async () => {
      console.log("🔥 Starting priority R4R job...");
      
      try {
        const response = await fetch(`${getBaseUrl()}/api/schedule-r4r-jobs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            batchSize: 10,
            maxUsers: 50,
            onlyHighActivity: true
          }),
        });

        if (!response.ok) {
          throw new Error(`Priority job request failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.ok) {
          console.log(`✅ Priority R4R job completed: ${result.data.processedUsers} users processed`);
        } else {
          throw new Error(`Priority job failed: ${result.error}`);
        }

      } catch (error) {
        console.error("❌ Priority R4R job failed:", error);
        throw error;
      }
    }
  );

  console.log("✅ Default jobs initialized");
}

// Start the scheduler (call this in main.ts)
export function startScheduler(): void {
  console.log("🚀 Starting job scheduler...");
  initializeDefaultJobs();
  
  // Log scheduler status
  setInterval(() => {
    const jobs = globalScheduler.getAllJobsStatus();
    console.log(`📊 Scheduler status: ${jobs.length} jobs running`);
    
    for (const job of jobs) {
      const nextRunIn = job.nextRun.getTime() - Date.now();
      const nextRunMinutes = Math.round(nextRunIn / (1000 * 60));
      console.log(`  - ${job.name}: next run in ${nextRunMinutes}m ${job.isRunning ? '(RUNNING)' : ''}`);
    }
  }, 30 * 60 * 1000); // Log every 30 minutes
} 