import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  evidenceBundleSchema,
  type EvidenceBundle,
} from "@/lib/digest/evidence-schema";
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

interface GeminiGenerateContentClient {
  models: {
    generateContent(input: unknown): Promise<{
      text?: string | null;
      candidates?: Array<{
        finishReason?: string;
        content?: {
          parts?: Array<{
            text?: string | null;
            thought?: boolean;
          }>;
        };
      }>;
    }>;
  };
}

const openAIDigestResponseSchema = z.object({
  title: z.string().min(1),
  intro: z.string().min(1),
  readingTime: z.number().int().min(3).max(20),
  topics: z
    .array(
      z.object({
        topic: z.string().min(1),
        markdown: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
});

const DEFAULT_OPENAI_MODEL = "gpt-5.4";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function parseDigestResult(raw: unknown): DigestResponse {
  return digestResponseSchema.parse(raw);
}

function finalizeDigest(raw: DigestResponse): DigestResponse {
  return parseDigestResult(raw);
}

function extractGeminiJsonCandidate(responseText: string) {
  const fencedBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidateSource = fencedBlockMatch?.[1]?.trim() || responseText.trim();
  const firstBraceIndex = candidateSource.indexOf("{");

  if (firstBraceIndex < 0) {
    return candidateSource;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = firstBraceIndex; index < candidateSource.length; index += 1) {
    const char = candidateSource[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return candidateSource.slice(firstBraceIndex, index + 1);
      }
    }
  }

  return candidateSource;
}

function estimateReadingTimeFromDigest(input: {
  intro?: string;
  topics: Array<{
    topic: string;
    markdown: string;
  }>;
}) {
  const text = [
    input.intro ?? "",
    ...input.topics.flatMap((topic) => [
      topic.topic,
      topic.markdown,
    ]),
  ].join(" ");

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(20, Math.max(3, Math.round(words / 180) || 3));
}

function buildEvidencePrompt(prompt: string) {
  return `${prompt}

Return exactly one JSON object for an evidence bundle.

Requirements:
- Use Google Search grounding to find the most relevant recent signals.
- Output only valid JSON. Do not wrap in markdown fences.
- Required top-level field: topics.
- topics must be an array of 1 to 3 items.
- each topic must contain: topic and markdown.
- each markdown block must contain a "### Signals" heading.
- each markdown block must list up to 7 numbered events.
- each event should include a factual description and one clickable markdown source link.
- Do not output the final digest yet.`;
}

function buildDigestSynthesisPrompt({
  originalPrompt,
  evidence,
}: {
  originalPrompt: string;
  evidence: EvidenceBundle;
}) {
  return `${originalPrompt}

Use the following evidence bundle as the only source material for this digest.
Do not use web search in this step. Do not add sources outside the evidence.

Evidence bundle:
${JSON.stringify(evidence, null, 2)}

Return exactly one JSON object for the final digest.
Required fields: title, intro, readingTime, topics.
- intro is optional.
- topics must be an array with fields: topic, markdown.
- Keep topics between 1 and 3.
- markdown must contain:
  - a "### Top Events" heading
  - up to 7 numbered events
  - each event must include a factual description, an "Insight:" line, and one clickable markdown source link
  - a "### Summary" heading followed by a short summary paragraph
- do not use extra sections outside "Top Events" and "Summary".`;
}

function normalizeGeminiDigest(raw: unknown): DigestResponse {
  const record = z.record(z.string(), z.unknown()).parse(raw);
  const title = z.string().min(1).parse(record.title);
  const intro = record.intro ?? record.introduction;
  const rawTopics = z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(3)
    .parse(record.topics);

  const topics = rawTopics.map((topic) => ({
    topic: z.string().min(1).parse(topic.topic),
    markdown: z.string().min(1).parse(topic.markdown),
  }));

  const readingTime =
    typeof record.readingTime === "number"
      ? z.number().int().min(3).max(20).parse(record.readingTime)
      : estimateReadingTimeFromDigest({
          intro: typeof intro === "string" && intro.length > 0 ? intro : undefined,
          topics,
        });

  return {
    title,
    intro:
      typeof intro === "string" && intro.length > 0
        ? z.string().min(1).parse(intro)
        : undefined,
    readingTime,
    topics,
  };
}

function normalizeGeminiEvidenceBundle(raw: unknown): EvidenceBundle {
  return evidenceBundleSchema.parse(raw);
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
  client?: GeminiGenerateContentClient;
} = {}): DigestProvider {
  const geminiClient = client ?? (apiKey ? new GoogleGenAI({ apiKey }) : null);

  return {
    name: "gemini",
    model,
    async generate({ prompt }) {
      if (!geminiClient) {
        throw new Error("GEMINI_API_KEY or LLM_API_KEY is not configured.");
      }

      const evidenceResponse = await geminiClient.models.generateContent({
        model,
        contents: buildEvidencePrompt(prompt),
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const evidenceText = evidenceResponse.text?.trim();

      if (!evidenceText) {
        throw new Error("Gemini did not return any evidence output.");
      }

      let evidence: EvidenceBundle;

      try {
        evidence = normalizeGeminiEvidenceBundle(
          JSON.parse(extractGeminiJsonCandidate(evidenceText)),
        );
      } catch {
        throw new Error("Gemini did not return valid JSON evidence output.");
      }

      const digestResponse = await geminiClient.models.generateContent({
        model,
        contents: buildDigestSynthesisPrompt({
          originalPrompt: prompt,
          evidence,
        }),
      });

      const digestText = digestResponse.text?.trim();

      if (!digestText) {
        throw new Error("Gemini did not return any digest output.");
      }

      let parsed: DigestResponse;

      try {
        parsed = normalizeGeminiDigest(
          JSON.parse(extractGeminiJsonCandidate(digestText)),
        );
      } catch {
        throw new Error("Gemini did not return valid JSON digest output.");
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
