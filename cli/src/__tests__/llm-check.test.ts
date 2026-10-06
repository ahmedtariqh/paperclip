import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { llmCheck } from "../checks/llm-check.js";
import type { PaperclipConfig } from "../config/schema.js";

describe("llmCheck", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("passes when no LLM provider is configured", async () => {
    const config = {} as PaperclipConfig;
    const result = await llmCheck(config);
    expect(result).toEqual({
      name: "LLM provider",
      status: "pass",
      message: "No LLM provider configured (optional)",
    });
  });

  it("passes when skipValidation is true", async () => {
    const config = {
      llm: {
        provider: "custom",
        skipValidation: true,
      },
    } as unknown as PaperclipConfig;
    const result = await llmCheck(config);
    expect(result).toEqual({
      name: "LLM provider",
      status: "pass",
      message: "Validation skipped by config",
    });
  });

  it("validates custom provider with custom baseUrl and model", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    globalThis.fetch = mockFetch;

    const config = {
      llm: {
        provider: "custom",
        baseUrl: "https://my-gateway.local/v1",
        apiKey: "sk-custom-123",
        model: "my-custom-model",
      },
    } as unknown as PaperclipConfig;

    const result = await llmCheck(config);
    expect(result.status).toBe("pass");
    expect(result.message).toContain("Custom LLM API key is valid");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://my-gateway.local/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk-custom-123",
        }),
      }),
    );
  });

  it("warns rather than blocks when custom provider endpoint returns 404 for /models", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("Not found", { status: 404 }));
    globalThis.fetch = mockFetch;

    const config = {
      llm: {
        provider: "custom",
        baseUrl: "http://127.0.0.1:11434/v1",
      },
    } as unknown as PaperclipConfig;

    const result = await llmCheck(config);
    expect(result.status).toBe("warn");
    expect(result.message).toContain("(/models not exposed); continuing anyway");
  });

  it("warns rather than blocks when custom provider endpoint returns 405 for /models", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("Method not allowed", { status: 405 }));
    globalThis.fetch = mockFetch;

    const config = {
      llm: {
        provider: "custom",
        baseUrl: "http://127.0.0.1:8000/v1",
      },
    } as unknown as PaperclipConfig;

    const result = await llmCheck(config);
    expect(result.status).toBe("warn");
    expect(result.message).toContain("405");
    expect(result.message).toContain("continuing anyway");
  });

  it("fails when custom provider returns 401 unauthorized", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    globalThis.fetch = mockFetch;

    const config = {
      llm: {
        provider: "custom",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "bad-key",
      },
    } as unknown as PaperclipConfig;

    const result = await llmCheck(config);
    expect(result.status).toBe("fail");
    expect(result.message).toContain("Custom LLM API key is invalid (401)");
  });

  it("validates claude provider with custom baseUrl and model", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = mockFetch;

    const config = {
      llm: {
        provider: "claude",
        baseUrl: "https://custom-claude-proxy.com",
        apiKey: "sk-ant-test",
        model: "claude-3-7-sonnet",
      },
    } as unknown as PaperclipConfig;

    const result = await llmCheck(config);
    expect(result.status).toBe("pass");
    expect(result.message).toBe("Claude API key is valid");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://custom-claude-proxy.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "sk-ant-test",
        }),
        body: JSON.stringify({
          model: "claude-3-7-sonnet",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      }),
    );
  });
});
