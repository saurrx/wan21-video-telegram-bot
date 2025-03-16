import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface Props {
  jobId: string;
  onComplete: () => void;
  onVideoReady: (url: string) => void;
}

export default function StatusDisplay({ jobId, onComplete, onVideoReady }: Props) {
  const [status, setStatus] = useState<string>("queued");
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  
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

  return (
    <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
      animate-in slide-in-from-bottom duration-500">
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <h3 className="text-xl font-bold">Generation Status</h3>
        </div>

        <Progress value={status === "processing" ? 50 : 25} className="h-2 border-2 border-black" />

        <p className="text-lg">
          {status === "queued" && (
            <>
              Job is in queue
              {queuePosition !== null && ` (Position: ${queuePosition})`}
            </>
          )}
          {status === "processing" && "Video is being generated (this will take 6-10 minutes)..."}
          {status === "failed" && "Generation failed. Please try again."}
        </p>
      </div>
    </Card>
  );
}
