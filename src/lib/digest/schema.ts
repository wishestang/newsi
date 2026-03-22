import { z } from "zod";

export const digestResponseSchema = z.object({
  title: z.string().min(1),
  intro: z.string().min(1),
  readingTime: z.number().int().min(3).max(20),
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        summary: z.array(z.string().min(1)).min(2).max(6),
        keyPoints: z.array(z.string().min(1)).min(2).max(8),
        whyItMatters: z.string().min(1).optional(),
      }),
    )
    .min(3)
    .max(8),
});

export type DigestResponse = z.infer<typeof digestResponseSchema>;
