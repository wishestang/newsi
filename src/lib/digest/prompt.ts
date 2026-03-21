export function buildDigestPrompt({
  dateLabel,
  interestText,
}: {
  dateLabel: string;
  interestText: string;
}) {
  return `
You are generating a personal daily synthesis for a knowledge worker.

Date: ${dateLabel}
Standing brief: ${interestText}

Requirements:
- Focus on what changed today or very recently
- Produce 3 to 5 thematic sections
- Keep the tone calm and editorial
- Avoid generic filler
- Return structured JSON only
`;
}
