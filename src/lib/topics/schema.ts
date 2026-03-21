import { z } from "zod";

export const interestProfileSchema = z.object({
  interestText: z.string().trim().min(2).max(1000),
  browserTimezone: z.string().trim().optional(),
});
