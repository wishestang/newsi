import { afterEach, describe, expect, it, vi } from "vitest";

const openaiMock = vi.hoisted(() => ({
  constructor: vi.fn(),
  responsesParse: vi.fn(),
  chatParse: vi.fn(),
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

describe("digest provider", () => {
  afterEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.LLM_MODEL;
    openaiMock.constructor.mockReset();
    openaiMock.responsesParse.mockReset();
    openaiMock.chatParse.mockReset();
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

  it("selects Gemini when requested and uses chat.completions.parse without web search", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.LLM_API_KEY = "legacy-key";
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.LLM_MODEL = "gemini-2.5-flash";

    openaiMock.chatParse.mockResolvedValue({
      choices: [
        {
          message: {
            parsed: {
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
          },
        },
      ],
    });

    const { createDigestProvider } = await import("@/lib/digest/provider");
    const provider = createDigestProvider();

    const result = await provider.generate({
      prompt: "Generate a digest about AI agents and design tools.",
    });

    expect(openaiMock.constructor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "gemini-key",
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      }),
    );
    expect(openaiMock.responsesParse).not.toHaveBeenCalled();
    expect(openaiMock.chatParse).toHaveBeenCalledOnce();
    expect(openaiMock.chatParse.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: "Generate a digest about AI agents and design tools.",
          },
        ],
      }),
    );
    expect(openaiMock.chatParse.mock.calls[0][0]).not.toHaveProperty("tools");
    expect(result.title).toBe("Today's Synthesis");
  });

  it("throws a configuration error when no API key is available", async () => {
    const { createDigestProvider } = await import("@/lib/digest/provider");
    const provider = createDigestProvider();

    await expect(provider.generate({ prompt: "test" })).rejects.toThrow(
      "LLM_API_KEY is not configured.",
    );
  });
});
