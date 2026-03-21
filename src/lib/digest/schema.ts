import { z } from "zod";

export const digestResponseSchema = z.object({
  title: z.string().min(1),
  intro: z.string().min(1),
  readingTime: z.number().int().min(3).max(12),
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        summary: z.array(z.string().min(1)).min(2).max(4),
        keyPoints: z.array(z.string().min(1)).min(2).max(5),
        whyItMatters: z.string().min(1).optional(),
      }),
    )
    .min(3)
    .max(5),
});

export type DigestResponse = z.infer<typeof digestResponseSchema>;
