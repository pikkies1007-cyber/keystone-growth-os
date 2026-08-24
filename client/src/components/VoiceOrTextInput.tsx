import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface VoiceOrTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  /** Override the textarea's className entirely (e.g. to match a custom-themed page) instead of the shadcn default. */
  textareaClassName?: string;
  /** Override the mic/stop button's className to match custom-themed pages. */
  buttonClassName?: string;
}

/**
 * A textarea with an optional "speak your answer" mic button. Drop-in
 * replacement for a plain textarea anywhere a toolkit collects free text --
 * same value/onChange contract, voice is purely additive.
 */
export function VoiceOrTextInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  textareaClassName,
  buttonClassName,
}: VoiceOrTextInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcribe = trpc.voice.transcribe.useMutation();

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;

        setIsTranscribing(true);
        try {
          const arrayBuffer = await blob.arrayBuffer();
          let binary = "";
          const bytes = new Uint8Array(arrayBuffer);
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);

          const result = await transcribe.mutateAsync({ audioBase64: base64, mimeType: "audio/webm" });
          if (result.text) {
            onChange(value ? `${value} ${result.text}` : result.text);
          }
        } catch (err) {
          setMicError(err instanceof Error ? err.message : "Couldn't transcribe that — try typing instead.");
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setMicError("Couldn't access your microphone — check your browser's permission for this site.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={textareaClassName}
      />
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <Button type="button" variant="outline" size="sm" onClick={startRecording} disabled={isTranscribing} className={buttonClassName}>
            {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            {isTranscribing ? "Transcribing…" : "Speak your answer"}
          </Button>
        ) : (
          <Button type="button" variant="destructive" size="sm" onClick={stopRecording} className={cn("animate-pulse", buttonClassName)}>
            <Square className="h-4 w-4" /> Stop recording
          </Button>
        )}
        {micError && <span className="text-xs text-destructive">{micError}</span>}
      </div>
    </div>
  );
}
