import { z } from "zod";

export const evidenceSignalSchema = z.object({
  headline: z.string().min(1),
  summary: z.string().min(1),
  whyRelevant: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceUrl: z.string().url(),
  publishedAt: z.string().min(1).optional(),
});

export const evidenceBundleSchema = z.object({
  topic: z.string().min(1),
  generatedAt: z.string().min(1),
  searchQueries: z.array(z.string().min(1)).min(1),
  signals: z.array(evidenceSignalSchema).min(1).max(8),
});

export type EvidenceBundle = z.infer<typeof evidenceBundleSchema>;
