import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";

// In-memory job storage
interface Job {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  queuePosition?: number;
  error?: string;
  videoUrl?: string;
}

const jobs = new Map<string, Job>();
const jobQueue: string[] = [];

export async function registerRoutes(app: Express): Promise<Server> {
  // Video generation endpoint
  app.post("/api/generate", (req, res) => {
    const jobId = randomUUID();
    const job: Job = {
      id: jobId,
      status: "queued",
      queuePosition: jobQueue.length + 1
    };

    jobs.set(jobId, job);
    jobQueue.push(jobId);

    // Simulate job processing
    setTimeout(() => {
      const job = jobs.get(jobId);
      if (job) {
        job.status = "processing";
        jobs.set(jobId, job);

        // Simulate video generation completion
        setTimeout(() => {
          job.status = "completed";
          job.videoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"; // Sample video
          jobs.set(jobId, job);
        }, 5000);
      }
    }, 2000);

    res.json({ job_id: jobId });
  });

  // Job status endpoint
  app.get("/api/jobs/:jobId", (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Update queue position if job is still queued
    if (job.status === "queued") {
      job.queuePosition = jobQueue.indexOf(job.id) + 1;
    }

    res.json(job);
  });

  // Video retrieval endpoint
  app.get("/api/jobs/:jobId/video", (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job || job.status !== "completed") {
      return res.status(404).json({ message: "Video not found" });
    }

    // Redirect to the video URL
    res.redirect(job.videoUrl!);
  });

  const httpServer = createServer(app);
  return httpServer;
}