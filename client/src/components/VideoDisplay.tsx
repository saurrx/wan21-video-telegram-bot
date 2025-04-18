import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { useState } from "react";

interface Props {
  videoUrl: string;
  onReset: () => void;
}

export default function VideoDisplay({ videoUrl, onReset }: Props) {
  const [error, setError] = useState(false);

  return (
    <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
      animate-in slide-in-from-bottom duration-500">
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Generated Video</h3>

        <div className="rounded-lg overflow-hidden border-2 border-black">
          <video 
            controls 
            className="w-full"
            onError={(e) => {
              console.error('Video error:', e);
              setError(true);
            }}
            playsInline
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {error && (
            <div className="p-4 text-center bg-red-50">
              <p>Unable to play video directly. Please try refreshing or use the download button below.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            asChild
            className="flex-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
              hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]
              transition-all"
          >
            <a href={videoUrl} download="generated_video.mp4" target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Download Video
            </a>
          </Button>

          <Button
            onClick={onReset}
            variant="outline"
            className="flex-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
              hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]
              transition-all"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate Another
          </Button>
        </div>
      </div>
    </Card>
  );
}