import { z } from "zod";

export const topicEvidenceSchema = z.object({
  topic: z.string().min(1),
  markdown: z.string().min(1),
});

export const evidenceBundleSchema = z.object({
  topics: z.array(topicEvidenceSchema).min(1).max(3),
});

export type EvidenceBundle = z.infer<typeof evidenceBundleSchema>;
