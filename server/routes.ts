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

  // Video retrieval endpoint - now proxying the video stream
  app.get("/api/jobs/:jobId/video", async (req, res) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${req.params.jobId}/video`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Set appropriate headers
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'inline');

      // Pipe the video stream through our server
      response.body?.pipe(res);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch video" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}