import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  onJobCreated: (jobId: string) => void;
  disabled?: boolean;
}

export default function VideoGenerationForm({ onJobCreated, disabled }: Props) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      prompt: formData.get("prompt"),
      size: formData.get("size"),
      sample_steps: Number(formData.get("sample_steps")),
      sample_shift: Number(formData.get("sample_shift")),
      guide_scale: Number(formData.get("guide_scale")),
      seed: Number(formData.get("seed")),
      use_prompt_extend: formData.get("use_prompt_extend") === "on",
      prompt_extend_target_lang: formData.get("prompt_extend_target_lang"),
    };

    try {
      const response = await apiRequest("POST", "/api/generate", data);
      const result = await response.json();
      onJobCreated(result.job_id);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit job",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] 
      transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="prompt">Text Prompt</Label>
          <Textarea
            id="prompt"
            name="prompt"
            defaultValue="Two anthropomorphic cats in comfy boxing gear and bright gloves fight intensely on a spotlighted stage"
            className="border-2 border-black focus:ring-4 ring-primary/50"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="size">Video Size</Label>
            <Select name="size" defaultValue="832*480">
              <SelectTrigger className="border-2 border-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="832*480">832x480</SelectItem>
                <SelectItem value="480*832">480x832</SelectItem>
                <SelectItem value="624*624">624x624</SelectItem>
                <SelectItem value="704*544">704x544</SelectItem>
                <SelectItem value="544*704">544x704</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample_steps">Sample Steps</Label>
            <Input
              type="number"
              id="sample_steps"
              name="sample_steps"
              defaultValue={50}
              min={1}
              max={100}
              className="border-2 border-black"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample_shift">Sample Shift</Label>
            <Input
              type="number"
              id="sample_shift"
              name="sample_shift"
              defaultValue={5.0}
              min={0}
              max={10}
              step={0.1}
              className="border-2 border-black"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guide_scale">Guidance Scale</Label>
            <Input
              type="number"
              id="guide_scale"
              name="guide_scale"
              defaultValue={6.0}
              min={1}
              max={20}
              step={0.5}
              className="border-2 border-black"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seed">Seed</Label>
            <Input
              type="number"
              id="seed"
              name="seed"
              defaultValue={-1}
              className="border-2 border-black"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt_extend_target_lang">Target Language</Label>
            <Select name="prompt_extend_target_lang" defaultValue="zh">
              <SelectTrigger className="border-2 border-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">Chinese (ZH)</SelectItem>
                <SelectItem value="en">English (EN)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="use_prompt_extend" name="use_prompt_extend" defaultChecked />
          <Label htmlFor="use_prompt_extend">Use Prompt Extension</Label>
        </div>

        <Button
          type="submit"
          disabled={disabled || isSubmitting}
          className="w-full bg-primary border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
            hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]
            transition-all font-bold text-lg"
        >
          {isSubmitting ? "Submitting..." : "Generate Video"}
        </Button>
      </form>
    </Card>
  );
}