import OpenAI from "openai";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

/**
 * Transcribes a short audio recording (base64-encoded) to text via OpenAI's
 * Whisper API. The audio itself is never persisted to storage -- it only
 * needs to exist transiently to produce the transcript, which is what
 * actually gets saved (as free text in a toolkit answer).
 */
export async function transcribeAudio(params: {
  audioBase64: string;
  mimeType: string;
}): Promise<{ text: string }> {
  if (!ENV.openaiApiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Voice input isn't configured yet — an OPENAI_API_KEY is missing.",
    });
  }

  const buffer = Buffer.from(params.audioBase64, "base64");
  // A couple of minutes of webm/opus audio comfortably fits well under this;
  // this is really a guard against something going wrong client-side (e.g.
  // a recording that never stopped) rather than a normal-use limit.
  const MAX_BYTES = 16 * 1024 * 1024;
  if (buffer.byteLength > MAX_BYTES) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: "That recording is too long — keep it under a couple of minutes.",
    });
  }

  const ext = params.mimeType.includes("webm") ? "webm" : params.mimeType.includes("mp4") ? "mp4" : "mp3";
  const openai = new OpenAI({ apiKey: ENV.openaiApiKey });

  try {
    const file = await OpenAI.toFile(buffer, `voice-note.${ext}`, { type: params.mimeType });
    const result = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    });
    return { text: result.text.trim() };
  } catch (error) {
    console.error("[Voice] Transcription failed:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Couldn't transcribe that recording. Try again, or just type your answer.",
    });
  }
}
