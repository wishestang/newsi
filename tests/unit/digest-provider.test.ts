import { afterEach, describe, expect, it, vi } from "vitest";

describe("createOpenAIDigestProvider", () => {
  afterEach(() => {
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
  });

  it("returns parsed digest content from the OpenAI responses client", async () => {
    const client = {
      responses: {
        parse: vi.fn().mockResolvedValue({
          output_parsed: {
            title: "Today's Synthesis",
            intro: "Two signals stood out today.",
            readingTime: 6,
            sections: [
              {
                title: "AI Agents",
                summary: ["a", "b"],
                keyPoints: ["c", "d"],
              },
              {
                title: "Design Tools",
                summary: ["a", "b"],
                keyPoints: ["c", "d"],
              },
              {
                title: "Indie Builders",
                summary: ["a", "b"],
                keyPoints: ["c", "d"],
              },
            ],
          },
        }),
      },
    };

    const { createOpenAIDigestProvider } = await import("@/lib/digest/provider");
    const provider = createOpenAIDigestProvider({
      apiKey: "test-key",
      model: "gpt-test",
      client,
    });

    const result = await provider.generate({
      prompt: "Generate a digest about AI agents and design tools.",
    });

    expect(result.title).toBe("Today's Synthesis");
    expect(client.responses.parse).toHaveBeenCalledOnce();
  });

  it("throws a configuration error when no API key is available", async () => {
    const { createDigestProvider } = await import("@/lib/digest/provider");
    const provider = createDigestProvider();

    await expect(provider.generate({ prompt: "test" })).rejects.toThrow(
      "LLM_API_KEY is not configured.",
    );
  });
});
