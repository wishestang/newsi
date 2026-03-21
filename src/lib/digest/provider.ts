import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { DigestResponse } from "@/lib/digest/schema";
import { digestResponseSchema } from "@/lib/digest/schema";

export interface DigestProvider {
  name?: string;
  model?: string;
  generate(input: { prompt: string }): Promise<DigestResponse>;
}

interface OpenAIResponsesClient {
  responses: {
    parse(input: unknown): Promise<{
      output_parsed: z.infer<typeof openAIDigestResponseSchema> | null;
    }>;
  };
}

const openAIDigestResponseSchema = z.object({
  title: z.string().min(1),
  intro: z.string().min(1),
  readingTime: z.number().int().min(3).max(12),
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        summary: z.array(z.string().min(1)).min(2).max(4),
        keyPoints: z.array(z.string().min(1)).min(2).max(5),
        whyItMatters: z.string().min(1).nullable(),
      }),
    )
    .min(3)
    .max(5),
});

export function parseDigestResult(raw: unknown): DigestResponse {
  return digestResponseSchema.parse(raw);
}

export function createOpenAIDigestProvider({
  apiKey = process.env.LLM_API_KEY,
  model = process.env.LLM_MODEL ?? "gpt-5.4",
  client,
}: {
  apiKey?: string;
  model?: string;
  client?: OpenAIResponsesClient;
} = {}): DigestProvider {
  const responsesClient = client ?? (apiKey ? new OpenAI({ apiKey }) : null);

  return {
    name: "openai",
    model,
    async generate({ prompt }) {
      if (!responsesClient) {
        throw new Error("LLM_API_KEY is not configured.");
      }

      const response = await responsesClient.responses.parse({
        model,
        input: prompt,
        tools: [
          {
            type: "web_search_preview",
            search_context_size: "medium",
          },
        ],
        text: {
          format: zodTextFormat(openAIDigestResponseSchema, "daily_digest"),
        },
      });

      if (!response.output_parsed) {
        throw new Error("OpenAI did not return structured digest output.");
      }

      return parseDigestResult({
        ...response.output_parsed,
        sections: response.output_parsed.sections.map((section) =>
          section.whyItMatters
            ? section
            : {
                title: section.title,
                summary: section.summary,
                keyPoints: section.keyPoints,
              },
        ),
      });
    },
  };
}

export function createDigestProvider(): DigestProvider {
  return createOpenAIDigestProvider();
}
