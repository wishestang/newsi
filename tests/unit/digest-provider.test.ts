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

    googleGenAIMock.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        topic: "AI agents",
        generatedAt: "2026-03-24T08:00:00.000Z",
        searchQueries: ["AI agents design tools latest"],
        signals: [
          {
            headline: "OpenAI shipped a coding update",
            summary: "A new model landed today.",
            whyRelevant: "It matches the standing brief.",
            sourceTitle: "OpenAI",
            sourceUrl: "https://example.com/openai",
          },
        ],
      }),
    });
    googleGenAIMock.generateContent.mockResolvedValueOnce({
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
    expect(googleGenAIMock.generateContent).toHaveBeenCalledTimes(2);
    expect(googleGenAIMock.generateContent.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        model: "gemini-2.5-flash",
        contents: expect.stringContaining("Generate a digest about AI agents and design tools."),
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
      "Gemini did not return valid JSON evidence output.",
    );
  });

  it("builds a normalized evidence bundle before Gemini synthesizes the final digest", async () => {
    const stageOneResponse = {
      text: '```json\n{"topic":"AI coding","generatedAt":"2026-03-24T08:00:00.000Z","searchQueries":["AI coding tools last 24 hours"],"signals":[{"headline":"OpenAI shipped a new coding model","summary":"A new release landed today.","whyRelevant":"Directly relevant to the standing brief.","sourceTitle":"OpenAI","sourceUrl":"https://example.com/openai","publishedAt":"2026-03-24T06:00:00Z"}]}\n```',
    };
    const stageTwoResponse = {
      text: '```json\n{"title":"每日情报摘要","intro":"今天最值得关注的是 AI coding 的新发布。","sections":[{"title":"AI coding","summary":["第一句。","第二句。"],"keyPoints":["要点一","要点二"],"whyItMatters":"这是今天最相关的变化。"}]}\n```',
    };

    const client = {
      models: {
        generateContent: vi
          .fn()
          .mockResolvedValueOnce(stageOneResponse)
          .mockResolvedValueOnce(stageTwoResponse),
      },
    };

    const { createGeminiDigestProvider } = await import("@/lib/digest/provider");
    const provider = createGeminiDigestProvider({
      apiKey: "gemini-key",
      model: "gemini-2.5-flash",
      client,
    });

    await expect(provider.generate({ prompt: "test" })).resolves.toMatchObject({
      title: "每日情报摘要",
      intro: "今天最值得关注的是 AI coding 的新发布。",
      sections: [{ title: "AI coding" }],
    });
    expect(client.models.generateContent).toHaveBeenCalledTimes(2);
  });

  it("normalizes fenced Gemini digest JSON with introduction and extra fields during stage 2", async () => {
    const evidenceResponse = {
      text: '```json\n{"topic":"AI coding","generatedAt":"2026-03-24T08:00:00.000Z","searchQueries":["AI coding"],"signals":[{"headline":"Signal","summary":"A new release landed today.","whyRelevant":"Relevant to the brief.","sourceTitle":"Source","sourceUrl":"https://example.com/source"}]}\n```',
    };
    const digestResponse = {
      text: '```json\n{"briefingDate":"2026-03-23","title":"每日简报","introduction":"今天有两条重要变化。","sections":[{"title":"AI","summary":"第一句。第二句。","keyPoints":["c","d"],"data":null,"whyItMatters":"x"}]}\n```',
    };

    const client = {
      models: {
        generateContent: vi
          .fn()
          .mockResolvedValueOnce(evidenceResponse)
          .mockResolvedValueOnce(digestResponse),
      },
    };

    const { createGeminiDigestProvider } = await import("@/lib/digest/provider");
    const provider = createGeminiDigestProvider({
      apiKey: "gemini-key",
      model: "gemini-2.5-flash",
      client,
    });

    await expect(provider.generate({ prompt: "test" })).resolves.toMatchObject({
      title: "每日简报",
      intro: "今天有两条重要变化。",
      sections: [{ title: "AI", whyItMatters: "x", summary: ["第一句。", "第二句。"] }],
    });
  });

  it("accepts a single synthesized section when the evidence only supports one strong update", async () => {
    const evidenceResponse = {
      text: '```json\n{"topic":"AI coding","generatedAt":"2026-03-24T08:00:00.000Z","searchQueries":["AI coding"],"signals":[{"headline":"Signal","summary":"A new release landed today.","whyRelevant":"Relevant to the brief.","sourceTitle":"Source","sourceUrl":"https://example.com/source"}]}\n```',
    };
    const digestResponse = {
      text: '```json\n{"title":"单条更新简报","introduction":"过去24小时只有一条高相关更新。","sections":[{"title":"AI","summary":"第一句。第二句。","keyPoints":["c","d"],"whyItMatters":"x"}]}\n```',
    };

    const client = {
      models: {
        generateContent: vi
          .fn()
          .mockResolvedValueOnce(evidenceResponse)
          .mockResolvedValueOnce(digestResponse),
      },
    };

    const { createGeminiDigestProvider } = await import("@/lib/digest/provider");
    const provider = createGeminiDigestProvider({
      apiKey: "gemini-key",
      model: "gemini-2.5-flash",
      client,
    });

    await expect(provider.generate({ prompt: "test" })).resolves.toMatchObject({
      title: "单条更新简报",
      intro: "过去24小时只有一条高相关更新。",
      sections: [{ title: "AI", whyItMatters: "x" }],
    });
  });

  it("throws a configuration error when no API key is available", async () => {
    const { createDigestProvider } = await import("@/lib/digest/provider");
    const provider = createDigestProvider();

    await expect(provider.generate({ prompt: "test" })).rejects.toThrow(
      "LLM_API_KEY is not configured.",
    );
  });

  it("normalizes nullable whyItMatters while accepting the new upper bounds", async () => {
    const sections = Array.from({ length: 3 }, (_, index) => ({
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

    expect(result.sections).toHaveLength(3);
    expect(result.sections[0]).not.toHaveProperty("whyItMatters");
    expect(result.sections[1]?.whyItMatters).toBe("Reason 2");
  });
});
