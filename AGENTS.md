<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Band of Agents Hackathon — Python Band Agents

The `band-agents/` directory contains 4 Python agents that use the Band SDK (`band-sdk` from
`thenvoi-sdk-python/`) to collaborate through Band chat rooms for multi-agent DeFi workflows.

**Key files:**
- `band-agents/agents/base.py` — shared base class, LLM setup, CapMatrixAPIClient
- `band-agents/agents/scout_agent.py` — intelligence gatherer
- `band-agents/agents/risk_monitor_agent.py` — risk evaluator (sentinel with VETO/SHRINK/REVOKE)
- `band-agents/agents/executor_agent.py` — DeFi transaction executor
- `band-agents/agents/orchestrator_agent.py` — workflow manager
- `band-agents/tools/clove_api.py` — HTTP client that calls the Next.js backend
- `band-agents/tools/intelligence_tools.py` — check_yields, discover_whales, check_whale_trades
- `band-agents/tools/risk_tools.py` — check_risk
- `band-agents/tools/execution_tools.py` — execute_defi, execute_copy_trade, rebalance, notify_user
- `band-agents/prompts/*.md` — system prompts per agent role

**Architecture:** Python Band agents call the CLOVE Next.js backend via HTTP for all DeFi
operations. Inter-agent communication flows through Band rooms (@mentions). All agents must
be registered on the Band platform first (see `band-agents/README.md`).

**Python deps:** `band-sdk`, `langchain-openai`, `langgraph`, `httpx`, `pydantic-settings`
