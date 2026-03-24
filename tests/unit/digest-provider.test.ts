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
      "### Top Events",
      "",
      `1. **Event ${index}**`,
      `   Event ${index} moved in the last 24 hours.`,
      `   Insight: Insight ${index}`,
      `   [来源：Example ${index} · 2026-03-24](https://example.com/${index})`,
      "",
      "### Summary",
      "",
      `Takeaway ${index}`,
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
        topics: [
          {
            topic: "AI agents",
            markdown: [
              "### Signals",
              "",
              "1. **OpenAI shipped a coding update**",
              "   A new model landed today.",
              "   [来源：OpenAI · 2026-03-24](https://example.com/openai)",
            ].join("\n"),
          },
        ],
      }),
    });
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
    expect(googleGenAIMock.generateContent.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        contents: expect.stringContaining('"topics"'),
      }),
    );
    expect(result.topics[0]?.topic).toBe("Topic 1");
  });

  it("throws a clear error when Gemini returns invalid evidence JSON", async () => {
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

  it("builds a normalized topic-grouped evidence bundle before Gemini synthesizes the final digest", async () => {
    const stageOneResponse = {
      text: '```json\n{"topics":[{"topic":"AI coding","markdown":"### Signals\\n\\n1. **OpenAI shipped a new coding model**\\n   A new release landed today.\\n   [来源：OpenAI · 2026-03-24](https://example.com/openai)"}]}\n```',
    };
    const stageTwoResponse = {
      text: '```json\n{"title":"每日情报摘要","intro":"今天最值得关注的是 AI coding 的新发布。","topics":[{"topic":"AI coding","markdown":"### Top Events\\n\\n1. **OpenAI shipped a new coding model**\\n   A new release landed today.\\n   Insight: AI coding 正在继续快速迭代。\\n   [来源：OpenAI · 2026-03-24](https://example.com/openai)\\n\\n### Summary\\n\\nAI coding 仍是今天最相关的主题。"}]}\n```',
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
      topics: [
        {
          topic: "AI coding",
          markdown: expect.stringContaining("### Summary"),
        },
      ],
    });
    expect(client.models.generateContent).toHaveBeenCalledTimes(2);
  });

  it("throws a clear error when Gemini returns invalid digest JSON in stage 2", async () => {
    const client = {
      models: {
        generateContent: vi
          .fn()
          .mockResolvedValueOnce({
            text: JSON.stringify({
              topics: [
                {
                  topic: "AI coding",
                  markdown: [
                    "### Signals",
                    "",
                    "1. **Signal**",
                    "   A new release landed today.",
                    "   [来源：Source · 2026-03-24](https://example.com/source)",
                  ].join("\n"),
                },
              ],
            }),
          })
          .mockResolvedValueOnce({
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
});
