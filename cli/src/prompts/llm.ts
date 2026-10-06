import * as p from "@clack/prompts";
import type { LlmConfig } from "../config/schema.js";

export async function promptLlm(): Promise<LlmConfig | undefined> {
  const configureLlm = await p.confirm({
    message: "Configure an LLM provider now?",
    initialValue: false,
  });

  if (p.isCancel(configureLlm)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (!configureLlm) return undefined;

  const provider = await p.select({
    message: "LLM provider",
    options: [
      { value: "claude", label: "Claude (Anthropic)" },
      { value: "openai", label: "OpenAI" },
      { value: "custom", label: "Custom / OpenAI-Compatible (LiteLLM, Ollama, vLLM, OpenRouter)" },
    ],
  });

  if (p.isCancel(provider)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  let baseUrl: string | undefined;
  if (provider === "custom") {
    const url = await p.text({
      message: "Base URL (e.g., http://127.0.0.1:4000/v1 or https://openrouter.ai/api/v1)",
      validate: (val) => {
        if (!val?.trim()) return "Base URL is required for custom LLM provider";
        try {
          new URL(val.trim());
        } catch {
          return "Invalid URL format";
        }
      },
    });
    if (p.isCancel(url)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }
    baseUrl = url.trim();
  } else {
    const customUrl = await p.text({
      message: `Base URL (optional, press Enter for default ${provider === "claude" ? "https://api.anthropic.com" : "https://api.openai.com/v1"})`,
    });
    if (p.isCancel(customUrl)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }
    if (customUrl?.trim()) baseUrl = customUrl.trim();
  }

  let model: string | undefined;
  const modelInput = await p.text({
    message: `Default model ID (optional${provider === "custom" ? ", e.g. openai/gpt-4o or custom/my-model" : ""})`,
  });
  if (p.isCancel(modelInput)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }
  if (modelInput?.trim()) model = modelInput.trim();

  const apiKeyPrompt = await p.password({
    message: `${provider === "claude" ? "Anthropic" : provider === "openai" ? "OpenAI" : "Custom provider"} API key${provider === "custom" ? " (optional for local endpoints)" : ""}`,
    validate: (val) => {
      if (!val && provider !== "custom") return "API key is required";
    },
  });

  if (p.isCancel(apiKeyPrompt)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }
  const apiKey = apiKeyPrompt?.trim() || undefined;

  let envKey: string | undefined;
  if (provider === "custom") {
    const envKeyInput = await p.text({
      message: "API key environment variable name (optional, defaults to OPENAI_API_KEY)",
      placeholder: "OPENAI_API_KEY",
    });
    if (p.isCancel(envKeyInput)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }
    if (envKeyInput?.trim()) envKey = envKeyInput.trim();
  }

  return {
    provider,
    apiKey,
    baseUrl,
    model,
    envKey,
  };
}
