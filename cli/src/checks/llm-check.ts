import type { PaperclipConfig } from "../config/schema.js";
import type { CheckResult } from "./index.js";

export async function llmCheck(config: PaperclipConfig): Promise<CheckResult> {
  if (!config.llm) {
    return {
      name: "LLM provider",
      status: "pass",
      message: "No LLM provider configured (optional)",
    };
  }

  if (config.llm.skipValidation) {
    return {
      name: "LLM provider",
      status: "pass",
      message: "Validation skipped by config",
    };
  }

  if (!config.llm.apiKey && config.llm.provider !== "custom") {
    return {
      name: "LLM provider",
      status: "pass",
      message: `${config.llm.provider} configured but no API key set (optional)`,
    };
  }

  try {
    if (config.llm.provider === "claude") {
      const baseUrl = (config.llm.baseUrl ?? "https://api.anthropic.com").replace(/\/+$/, "");
      const model = config.llm.model ?? "claude-sonnet-4-5-20250929";
      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          ...(config.llm.apiKey ? { "x-api-key": config.llm.apiKey } : {}),
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          ...(config.llm.headers ?? {}),
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (res.ok || res.status === 400) {
        return { name: "LLM provider", status: "pass", message: "Claude API key is valid" };
      }
      if (res.status === 401) {
        return {
          name: "LLM provider",
          status: "fail",
          message: "Claude API key is invalid (401)",
          canRepair: false,
          repairHint: "Run `paperclipai configure --section llm`",
        };
      }
      return {
        name: "LLM provider",
        status: "warn",
        message: `Claude API returned status ${res.status}`,
      };
    } else {
      const baseUrl = (config.llm.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
      const headers: Record<string, string> = {
        ...(config.llm.apiKey ? { Authorization: `Bearer ${config.llm.apiKey}` } : {}),
        ...(config.llm.headers ?? {}),
      };
      const res = await fetch(`${baseUrl}/models`, {
        headers,
      });
      if (res.ok) {
        return {
          name: "LLM provider",
          status: "pass",
          message: `${config.llm.provider === "custom" ? "Custom LLM" : "OpenAI"} API key is valid`,
        };
      }
      if (config.llm.provider === "custom" && (res.status === 404 || res.status === 405)) {
        return {
          name: "LLM provider",
          status: "warn",
          message: `Custom endpoint returned status ${res.status} (/models not exposed); continuing anyway`,
        };
      }
      if (res.status === 401) {
        return {
          name: "LLM provider",
          status: "fail",
          message: `${config.llm.provider === "custom" ? "Custom LLM" : "OpenAI"} API key is invalid (401)`,
          canRepair: false,
          repairHint: "Run `paperclipai configure --section llm`",
        };
      }
      return {
        name: "LLM provider",
        status: "warn",
        message: `${config.llm.provider === "custom" ? "Custom LLM" : "OpenAI"} API returned status ${res.status}`,
      };
    }
  } catch {
    return {
      name: "LLM provider",
      status: "warn",
      message: "Could not reach API to validate key",
    };
  }
}
