import "server-only";

/**
 * Featherless AI client — OpenAI-compatible LLM for generating professional
 * Band room messages during agent orchestration.
 *
 * Auth modes (tried in order):
 *   1. FEATHERLESS_API_KEY — primary (user-provided key)
 *   2. GROK_API_KEY — fallback (xAI)
 *   3. VENICE_API_KEY — final fallback (already configured in the project)
 */

type Provider = "featherless" | "grok" | "venice";

interface ProviderConfig {
  name: Provider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

function getProviders(): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  if (process.env.FEATHERLESS_API_KEY) {
    configs.push({
      name: "featherless",
      baseUrl: process.env.FEATHERLESS_BASE_URL ?? "https://api.featherless.ai/v1",
      apiKey: process.env.FEATHERLESS_API_KEY,
      model: process.env.FEATHERLESS_MODEL ?? "qwen3-5-9b",
    });
  }

  if (process.env.GROK_API_KEY) {
    configs.push({
      name: "grok",
      baseUrl: process.env.GROK_BASE_URL ?? "https://api.x.ai/v1",
      apiKey: process.env.GROK_API_KEY,
      model: "grok-2-1212",
    });
  }

  // Venice as final fallback (always configured)
  configs.push({
    name: "venice",
    baseUrl: "https://api.venice.ai/api/v1",
    apiKey: process.env.VENICE_API_KEY ?? "",
    model: "llama-3.3-70b",
  });

  return configs;
}

/**
 * Generate text using Featherless AI (primary), with Grok → Venice fallback.
 * Returns the generated text or null if all providers fail.
 */
export async function generateText(
  systemPrompt: string,
  userMessage: string,
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string | null> {
  const providers = getProviders();
  const lastError: string[] = [];

  for (const provider of providers) {
    if (!provider.apiKey) {
      lastError.push(`${provider.name}: no API key`);
      continue;
    }

    try {
      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: opts.temperature ?? 0.5,
          max_tokens: opts.maxTokens ?? 1024,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        lastError.push(`${provider.name} ${res.status}: ${errText.slice(0, 120)}`);
        console.warn(`[featherless] ${provider.name} returned ${res.status}, trying next provider`);
        continue;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        console.log(`[featherless] Generated via ${provider.name} (${provider.model})`);
        return content;
      }

      lastError.push(`${provider.name}: empty response`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError.push(`${provider.name}: ${msg}`);
      console.warn(`[featherless] ${provider.name} error, trying next provider:`, msg);
    }
  }

  console.error("[featherless] All providers failed:", lastError.join("; "));
  return null;
}

/**
 * Generate a detailed professional message for a Band room.
 * Used during orchestration phases to keep the Band room updated.
 */
export async function generateBandMessage(
  phase: "scout-result" | "risk-result" | "execution-result" | "workflow-start" | "workflow-complete",
  data: Record<string, unknown>,
): Promise<string> {
  const systemPrompt = `You are a professional DeFi operations reporter for CapMatrix, an autonomous AI agent platform on Base mainnet.
Your role: write clear, professional, well-structured messages that get posted to a Band AI chat room where users watch their agents work.

RULES:
- Write in clear, professional English
- Use markdown formatting (**bold** for emphasis, \`code\` for addresses/amounts)
- Structure messages with clear sections
- Include specific numbers, addresses, and links
- Be concise but thorough — 3-6 paragraphs
- Never mention that you are an AI or that you're generating a message
- Sign off with the agent's role (e.g. "— Scout", "— Risk Monitor", "— Executor")
- Include Basescan links for any transaction hashes

For execution messages, ALWAYS include:
- ✅ Success/failure status
- Protocol and amount
- Transaction hash with Basescan link
- Contract address (if applicable)
- What happens next`;

  let userMessage: string;
  const prompt = (data.prompt as string) ?? "";

  switch (phase) {
    case "workflow-start":
      userMessage = `Generate a workflow initialization message for Band room.

Workflow goal: ${prompt}
Budget: ${(data.budget as string) ?? "10"} USDC
Network: Base Mainnet
Agents: ${(data.agents as string[])?.join(", ") ?? "Scout, Risk Monitor, Executor"}

Write a professional message announcing the start of this workflow.`;
      break;

    case "scout-result":
      userMessage = `Generate a scout/intelligence result message.

Workflow goal: ${prompt}
Best APY found: ${(data.bestApy as string) ?? "0"}%
Recommended protocol: ${(data.recommended as string) ?? "unknown"}
Reason: ${(data.reason as string) ?? ""}
Scout name: ${(data.agentName as string) ?? "Scout"}

Write a professional message reporting the scout's findings. Include the specific APY and recommendation.`;
      break;

    case "risk-result":
      userMessage = `Generate a risk assessment result message.

Protocol: ${(data.protocol as string) ?? "unknown"}
Amount: ${(data.amount as string) ?? "0"}
Risk level: ${(data.riskLevel as string) ?? "LOW"}
Approved: ${String(data.approved ?? false)}
Confidence: ${(data.confidence as string) ?? "0"}
Action: ${(data.action as string) ?? "hold"}
Reasoning: ${(data.reasoning as string) ?? ""}
Risk Monitor: ${(data.agentName as string) ?? "Risk Monitor"}

Write a professional message reporting the risk assessment. If approved, state what action was greenlit. If not approved, explain why clearly.`;
      break;

    case "execution-result":
      const txHash = data.txHash as string | undefined;
      userMessage = `Generate an execution result message.

Protocol: ${(data.protocol as string) ?? "unknown"}
Amount: ${(data.amount as string) ?? "0"}
Success: ${String(data.success ?? false)}
Transaction hash: ${txHash ?? "none"}
Basescan URL: ${txHash ? `https://basescan.org/tx/${txHash}` : "none"}
Contract address: ${(data.contractAddress as string) ?? "none"}
Executor: ${(data.agentName as string) ?? "Executor"}
${data.error ? `Error: ${data.error}` : ""}

Write a professional message reporting the execution result. 
- If successful, include the Basescan link prominently
- Include the exact amount and protocol used
- Include the contract address if available
- State what was accomplished clearly
- If the execution was a swap/copy-trade, mention what token was bought`;
      break;

    case "workflow-complete":
      userMessage = `Generate a workflow completion summary.

Workflow goal: ${prompt}
Execution status: ${(data.status as string) ?? "complete"}
${data.txHash ? `Transaction: https://basescan.org/tx/${data.txHash}` : ""}
APY achieved: ${(data.apy as string) ?? "0"}%

Write a professional message summarizing what was accomplished. Include the key results and a clear call-to-action for what the user can do next.`;
      break;

    default:
      userMessage = `Generate a professional status update for the Band room about the current workflow state.`;
  }

  const result = await generateText(systemPrompt, userMessage, {
    temperature: 0.4,
    maxTokens: 1024,
  });

  return result ?? `**${phase.toUpperCase()}**\n\nStatus update for workflow: ${prompt.slice(0, 120)}`;
}
