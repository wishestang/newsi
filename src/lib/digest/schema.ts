import { z } from "zod";

const digestTopicSchema = z.object({
  topic: z.string().min(1),
  markdown: z.string().min(1),
});

export const digestResponseSchema = z.object({
  title: z.string().min(1),
  intro: z.string().min(1).optional(),
  readingTime: z.number().int().min(3).max(20),
  topics: z
    .array(digestTopicSchema)
    .min(1)
    .max(3),
});

export type DigestResponse = z.infer<typeof digestResponseSchema>;
