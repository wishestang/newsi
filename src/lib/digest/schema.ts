import { z } from "zod";

const digestEventSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  keyFacts: z.array(z.string().min(1)).min(1).max(6),
});

const digestTopicSchema = z.object({
  topic: z.string().min(1),
  events: z.array(digestEventSchema).min(1).max(5),
  insights: z.array(z.string().min(1)).min(1).max(3),
  takeaway: z.string().min(1),
});

export const digestResponseSchema = z.object({
  title: z.string().min(1),
  intro: z.string().min(1),
  readingTime: z.number().int().min(3).max(20),
  topics: z
    .array(digestTopicSchema)
    .min(1)
    .max(3),
});

export type DigestResponse = z.infer<typeof digestResponseSchema>;
