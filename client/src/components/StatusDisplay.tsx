import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  jobId: string;
  onComplete: () => void;
  onVideoReady: (url: string) => void;
}

type JobStatus = "queued" | "processing" | "completed" | "failed";

export default function StatusDisplay({ jobId, onComplete, onVideoReady }: Props) {
  const [status, setStatus] = useState<JobStatus>("queued");
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>("6-10 minutes");

  // Calculate progress percentage based on status and time elapsed
  const getProgress = () => {
    switch (status) {
      case "queued":
        return 10;
      case "processing":
        if (!startTime) return 25;
        const elapsed = (Date.now() - startTime.getTime()) / 1000 / 60; // minutes
        return Math.min(90, 25 + (elapsed / 10) * 65); // Max 90% until complete
      case "completed":
        return 100;
      case "failed":
        return 0;
      default:
        return 0;
    }
  };

  // Update estimated time based on queue position and status
  useEffect(() => {
    if (status === "queued" && queuePosition !== null) {
      setEstimatedTime(`${queuePosition * 2}-${queuePosition * 3} minutes`);
    } else if (status === "processing" && !startTime) {
      setStartTime(new Date());
      setEstimatedTime("6-10 minutes");
    }
  }, [status, queuePosition]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();

        setStatus(data.status);
        if (data.queue_position !== undefined) {
          setQueuePosition(data.queue_position);
        }

        if (data.status === "completed") {
          onComplete();
          onVideoReady(`/api/jobs/${jobId}/video`);
        } else if (data.status !== "failed") {
          setTimeout(checkStatus, 10000);
        }
      } catch (error) {
        console.error("Error checking status:", error);
      }
    };

    checkStatus();
  }, [jobId]);

  const getStatusIcon = () => {
    switch (status) {
      case "queued":
      case "processing":
        return <Loader2 className="h-6 w-6 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-6 w-6 text-red-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "queued":
        return (
          <>
            Waiting in queue
            {queuePosition !== null && (
              <span className="font-semibold">
                {" "}
                (Position: {queuePosition})
              </span>
            )}
            <div className="text-sm text-muted-foreground mt-1">
              Estimated wait: {estimatedTime}
            </div>
          </>
        );
      case "processing":
        return (
          <>
            Generating your video
            <div className="text-sm text-muted-foreground mt-1">
              Estimated time remaining: {estimatedTime}
            </div>
          </>
        );
      case "completed":
        return "Video generation completed!";
      case "failed":
        return "Generation failed. Please try again.";
    }
  };

  return (
    <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
      animate-in slide-in-from-bottom duration-500">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <h3 className="text-xl font-bold">Generation Status</h3>
        </div>

        <div className="space-y-2">
          <Progress 
            value={getProgress()} 
            className="h-2 border-2 border-black"
          />
          <div className="text-right text-sm text-muted-foreground">
            {getProgress().toFixed(0)}%
          </div>
        </div>

        <div className="text-lg">{getStatusMessage()}</div>
      </div>
    </Card>
  );
}