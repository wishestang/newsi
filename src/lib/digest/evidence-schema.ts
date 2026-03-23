import { z } from "zod";

export const topicEvidenceEventSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceUrl: z.string().url(),
  publishedAt: z.string().min(1).optional(),
});

export const topicEvidenceSchema = z.object({
  topic: z.string().min(1),
  searchQueries: z.array(z.string().min(1)).min(1),
  events: z.array(topicEvidenceEventSchema).min(1).max(8),
});

export const evidenceBundleSchema = z.object({
  generatedAt: z.string().min(1),
  topics: z.array(topicEvidenceSchema).min(1).max(3),
});

export type EvidenceBundle = z.infer<typeof evidenceBundleSchema>;
