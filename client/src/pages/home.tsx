import VideoGenerationForm from "@/components/VideoGenerationForm";
import StatusDisplay from "@/components/StatusDisplay";
import VideoDisplay from "@/components/VideoDisplay";
import { useState } from "react";

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(
    "https://embed.api.video/vod/vi2qm7oxLDZYOnuOwkHKk3Fe"
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-4xl md:text-6xl font-bold text-center mb-12 animate-in slide-in-from-top duration-700">
        Wan2.1 Video Generation
      </h1>

      {/* Demo Video */}
      {videoUrl && (
        <VideoDisplay 
          videoUrl={videoUrl}
          onReset={() => {
            setJobId(null);
            setIsCompleted(false);
            setVideoUrl(null);
          }}
        />
      )}

      <VideoGenerationForm 
        onJobCreated={setJobId}
        disabled={!!jobId && !isCompleted}
      />

      {jobId && !isCompleted && (
        <StatusDisplay 
          jobId={jobId} 
          onComplete={() => setIsCompleted(true)}
          onVideoReady={setVideoUrl}
        />
      )}
    </div>
  );
}