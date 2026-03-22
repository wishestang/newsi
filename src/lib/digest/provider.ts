import OpenAI from "openai";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { DigestResponse } from "@/lib/digest/schema";
import { digestResponseSchema } from "@/lib/digest/schema";

export interface DigestProvider {
  name?: string;
  model?: string;
  generate(input: { prompt: string }): Promise<DigestResponse>;
}

type ProviderName = "openai" | "gemini";

interface OpenAIResponsesClient {
  responses: {
    parse(input: unknown): Promise<{
      output_parsed: z.infer<typeof openAIDigestResponseSchema> | null;
    }>;
  };
}

interface OpenAIChatCompletionsClient {
  chat: {
    completions: {
      parse(input: unknown): Promise<{
        choices: Array<{
          message?: {
            parsed?: z.infer<typeof openAIDigestResponseSchema> | null;
          };
        }>;
      }>;
    };
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

const DEFAULT_OPENAI_MODEL = "gpt-5.4";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

export function parseDigestResult(raw: unknown): DigestResponse {
  return digestResponseSchema.parse(raw);
}

function normalizeDigestSections(
  sections: z.infer<typeof openAIDigestResponseSchema>["sections"],
) {
  return sections.map((section) =>
    section.whyItMatters
      ? section
      : {
          title: section.title,
          summary: section.summary,
          keyPoints: section.keyPoints,
        },
  );
}

function finalizeDigest(raw: z.infer<typeof openAIDigestResponseSchema>): DigestResponse {
  return parseDigestResult({
    ...raw,
    sections: normalizeDigestSections(raw.sections),
  });
}

function resolveProviderName(provider = process.env.LLM_PROVIDER): ProviderName {
  return provider?.toLowerCase() === "gemini" ? "gemini" : "openai";
}

function resolveOpenAIModel(model = process.env.LLM_MODEL ?? DEFAULT_OPENAI_MODEL) {
  return model;
}

function resolveGeminiModel(model = process.env.LLM_MODEL ?? DEFAULT_GEMINI_MODEL) {
  return model;
}

export function createOpenAIDigestProvider({
  apiKey = process.env.LLM_API_KEY,
  model = resolveOpenAIModel(),
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

      return finalizeDigest(response.output_parsed);
    },
  };
}

export function createGeminiDigestProvider({
  apiKey = process.env.GEMINI_API_KEY ?? process.env.LLM_API_KEY,
  model = resolveGeminiModel(),
  client,
}: {
  apiKey?: string;
  model?: string;
  client?: OpenAIChatCompletionsClient;
} = {}): DigestProvider {
  const chatClient =
    client ?? (apiKey ? new OpenAI({ apiKey, baseURL: GEMINI_OPENAI_BASE_URL }) : null);

  return {
    name: "gemini",
    model,
    async generate({ prompt }) {
      if (!chatClient) {
        throw new Error("GEMINI_API_KEY or LLM_API_KEY is not configured.");
      }

      const completion = await chatClient.chat.completions.parse({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: zodResponseFormat(openAIDigestResponseSchema, "daily_digest"),
      });

      const parsed = completion.choices[0]?.message?.parsed;

      if (!parsed) {
        throw new Error("Gemini did not return structured digest output.");
      }

      return finalizeDigest(parsed);
    },
  };
}

export function createDigestProvider(): DigestProvider {
  return resolveProviderName() === "gemini"
    ? createGeminiDigestProvider()
    : createOpenAIDigestProvider();
}
