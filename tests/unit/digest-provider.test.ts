import { afterEach, describe, expect, it, vi } from "vitest";

const openaiMock = vi.hoisted(() => ({
  constructor: vi.fn(),
  responsesParse: vi.fn(),
  chatParse: vi.fn(),
}));

const googleGenAIMock = vi.hoisted(() => ({
  constructor: vi.fn(),
  generateContent: vi.fn(),
}));

vi.mock("openai", () => ({
  default: vi.fn(function (this: unknown, options) {
    openaiMock.constructor(options);

    return {
      responses: {
        parse: openaiMock.responsesParse,
      },
      chat: {
        completions: {
          parse: openaiMock.chatParse,
        },
      },
    };
  }),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function (this: unknown, options) {
    googleGenAIMock.constructor(options);

    return {
      models: {
        generateContent: googleGenAIMock.generateContent,
      },
    };
  }),
}));

describe("digest provider", () => {
  afterEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.LLM_MODEL;
    openaiMock.constructor.mockReset();
    openaiMock.responsesParse.mockReset();
    openaiMock.chatParse.mockReset();
    googleGenAIMock.constructor.mockReset();
    googleGenAIMock.generateContent.mockReset();
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
    expect(client.responses.parse.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        model: "gpt-test",
        input: "Generate a digest about AI agents and design tools.",
        tools: [
          {
            type: "web_search_preview",
            search_context_size: "medium",
          },
        ],
      }),
    );
  });

  it("selects Gemini when requested and uses Google Search grounding", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.LLM_API_KEY = "legacy-key";
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.LLM_MODEL = "gemini-2.5-flash";

    googleGenAIMock.generateContent.mockResolvedValue({
      text: JSON.stringify({
        title: "Today's Synthesis",
        intro: "Two signals stood out today.",
        readingTime: 6,
        sections: [
          {
            title: "AI Agents",
            summary: ["a", "b"],
            keyPoints: ["c", "d"],
            whyItMatters: null,
          },
          {
            title: "Design Tools",
            summary: ["a", "b"],
            keyPoints: ["c", "d"],
            whyItMatters: null,
          },
          {
            title: "Indie Builders",
            summary: ["a", "b"],
            keyPoints: ["c", "d"],
            whyItMatters: null,
          },
        ],
      }),
    });

    const { createDigestProvider } = await import("@/lib/digest/provider");
    const provider = createDigestProvider();

    const result = await provider.generate({
      prompt: "Generate a digest about AI agents and design tools.",
    });

    expect(googleGenAIMock.constructor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "gemini-key",
      }),
    );
    expect(openaiMock.responsesParse).not.toHaveBeenCalled();
    expect(openaiMock.chatParse).not.toHaveBeenCalled();
    expect(googleGenAIMock.generateContent).toHaveBeenCalledOnce();
    expect(googleGenAIMock.generateContent.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        model: "gemini-2.5-flash",
        contents: "Generate a digest about AI agents and design tools.",
        config: expect.objectContaining({
          tools: [{ googleSearch: {} }],
        }),
      }),
    );
    expect(result.title).toBe("Today's Synthesis");
  });

  it("throws a clear error when Gemini returns invalid JSON", async () => {
    const client = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: "not-json",
        }),
      },
    };

    const { createGeminiDigestProvider } = await import("@/lib/digest/provider");
    const provider = createGeminiDigestProvider({
      apiKey: "gemini-key",
      model: "gemini-2.5-flash",
      client,
    });

    await expect(provider.generate({ prompt: "test" })).rejects.toThrow(
      "Gemini did not return valid JSON digest output.",
    );
  });

  it("throws a configuration error when no API key is available", async () => {
    const { createDigestProvider } = await import("@/lib/digest/provider");
    const provider = createDigestProvider();

    await expect(provider.generate({ prompt: "test" })).rejects.toThrow(
      "LLM_API_KEY is not configured.",
    );
  });

  it("normalizes nullable whyItMatters while accepting the new upper bounds", async () => {
    const sections = Array.from({ length: 8 }, (_, index) => ({
      title: `Section ${index + 1}`,
      summary: ["a", "b", "c", "d", "e", "f"],
      keyPoints: ["1", "2", "3", "4", "5", "6", "7", "8"],
      whyItMatters: index === 0 ? null : `Reason ${index + 1}`,
    }));

    const client = {
      responses: {
        parse: vi.fn().mockResolvedValue({
          output_parsed: {
            title: "Today's Synthesis",
            intro: "Two signals stood out today.",
            readingTime: 20,
            sections,
          },
        }),
      },
    };

    const { createOpenAIDigestProvider } = await import("@/lib/digest/provider");
    const provider = createOpenAIDigestProvider({ apiKey: "test-key", client });

    const result = await provider.generate({ prompt: "test" });

    expect(result.sections).toHaveLength(8);
    expect(result.sections[0]).not.toHaveProperty("whyItMatters");
    expect(result.sections[1]?.whyItMatters).toBe("Reason 2");
  });
});
