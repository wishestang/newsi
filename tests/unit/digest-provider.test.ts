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

function buildTopic(index: number) {
  return {
    topic: `Topic ${index}`,
    markdown: [
      `1. **Event ${index}，关键数据上涨 ${index}0%**`,
      `   Event ${index} moved in the last 24 hours, reflecting broader trends in the space.`,
      `   （[来源 ${index}](https://example.com/${index})）`,
      "",
      `> Takeaway ${index}`,
    ].join("\n"),
  };
}

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
            intro: "Three tracked spaces moved today.",
            readingTime: 6,
            topics: [buildTopic(1), buildTopic(2), buildTopic(3)],
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
    expect(result.topics).toHaveLength(3);
    expect(client.responses.parse).toHaveBeenCalledOnce();
    expect(client.responses.parse.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        model: "gpt-test",
        input: expect.stringContaining("Generate a digest about AI agents and design tools."),
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
        title: "Today's Synthesis",
        intro: "Two signals stood out today.",
        readingTime: 6,
        topics: [buildTopic(1)],
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
    expect(googleGenAIMock.generateContent).toHaveBeenCalledTimes(1);
    expect(googleGenAIMock.generateContent.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        model: "gemini-2.5-flash",
        contents: expect.stringContaining("Generate a digest about AI agents and design tools."),
        config: expect.objectContaining({
          tools: [{ googleSearch: {} }],
        }),
      }),
    );
    expect(googleGenAIMock.generateContent.mock.calls[0][0]?.config).not.toHaveProperty(
      "responseMimeType",
    );
    expect(googleGenAIMock.generateContent.mock.calls[0][0]?.config).not.toHaveProperty(
      "responseJsonSchema",
    );
    expect(googleGenAIMock.generateContent.mock.calls[0][0]?.contents).toContain(
      "#### Event Title",
    );
    expect(googleGenAIMock.generateContent.mock.calls[0][0]?.contents).toContain(
      "Today's takeaway:",
    );
    expect(googleGenAIMock.generateContent.mock.calls[0][0]?.contents).not.toContain(
      "### Signals",
    );
    expect(result.topics[0]?.topic).toBe("Topic 1");
  });

  it("throws a clear error when Gemini returns invalid digest JSON", async () => {
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

  it("builds a normalized digest from a single Gemini markdown response", async () => {
    const response = {
      text: '```json\n{"title":"每日情报摘要","intro":"今天最值得关注的是 AI coding 的新发布。","topics":[{"topic":"AI coding","markdown":"1. **OpenAI 发布了新的编程模型**\\n   新版本今天正式上线，迭代速度加快。（[OpenAI · 2026-03-24](https://example.com/openai)）\\n\\n> AI coding 仍是今天最相关的主题。"}]}\n```',
    };

    const client = {
      models: {
        generateContent: vi.fn().mockResolvedValueOnce(response),
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
      topics: [
        {
          topic: "AI coding",
          markdown: expect.stringContaining("> "),
        },
      ],
    });
    expect(client.models.generateContent).toHaveBeenCalledTimes(1);
  });

  it("Gemini prompt uses the final markdown format instructions in a single pass", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-key";

    googleGenAIMock.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        title: "Daily Digest",
        topics: [
          {
            topic: "AI coding",
            markdown:
              "1. **Signal**\n   A new release landed today.\n   （[Source](https://example.com/source)）\n\n> AI coding keeps iterating.",
          },
        ],
      }),
    });

    const { createDigestProvider } = await import("@/lib/digest/provider");
    const provider = createDigestProvider();
    await provider.generate({ prompt: "test" });

    const prompt = googleGenAIMock.generateContent.mock.calls[0][0]?.contents;
    expect(prompt).toContain("#### Event Title");
    expect(prompt).toContain("Today's takeaway:");
    expect(prompt).toContain("Why it matters:");
    expect(prompt).not.toContain("### Signals");
  });

  it("throws a configuration error when no API key is available", async () => {
    const { createDigestProvider } = await import("@/lib/digest/provider");
    const provider = createDigestProvider();

    await expect(provider.generate({ prompt: "test" })).rejects.toThrow(
      "LLM_API_KEY is not configured.",
    );
  });
});
