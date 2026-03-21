import { buildDigestPrompt } from "@/lib/digest/prompt";
import {
  createDigestProvider,
  type DigestProvider,
  parseDigestResult,
} from "@/lib/digest/provider";

export async function generateDigest({
  provider = createDigestProvider(),
  dateLabel,
  interestText,
}: {
  provider?: DigestProvider;
  dateLabel: string;
  interestText: string;
}) {
  const prompt = buildDigestPrompt({ dateLabel, interestText });
  const raw = await provider.generate({ prompt });
  return parseDigestResult(raw);
}
