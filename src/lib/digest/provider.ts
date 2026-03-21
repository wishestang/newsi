import type { DigestResponse } from "@/lib/digest/schema";
import { digestResponseSchema } from "@/lib/digest/schema";

export interface DigestProvider {
  generate(input: { prompt: string }): Promise<DigestResponse>;
}

export function parseDigestResult(raw: unknown): DigestResponse {
  return digestResponseSchema.parse(raw);
}

export function createDigestProvider(): DigestProvider {
  return {
    async generate() {
      throw new Error(
        "Digest provider is not wired yet. Connect the OpenAI-backed generator before enabling scheduled runs.",
      );
    },
  };
}
