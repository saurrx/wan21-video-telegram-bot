import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const API_BASE_URL = "http://provider.gpufarm.xyz:30507";

export async function registerRoutes(app: Express): Promise<Server> {
  // Video generation endpoint
  app.post("/api/generate", async (req, res) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate video" 
      });
    }
  });

  // Job status endpoint
  app.get("/api/jobs/:jobId", async (req, res) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${req.params.jobId}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch job status" 
      });
    }
  });

  // Video retrieval endpoint
  app.get("/api/jobs/:jobId/video", async (req, res) => {
    try {
      // Redirect to the actual video URL instead of proxying
      res.redirect(`${API_BASE_URL}/api/jobs/${req.params.jobId}/video`);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch video" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}