import os
import asyncio
import argparse
from band import AgentConfig
from agents.base import make_agent_with_capmatrix_tools


async def main():
    parser = argparse.ArgumentParser(description="CapMatrix Scout Agent — DeFi intelligence gatherer")
    parser.add_argument("--config-key", default="scout", help="Key in agent_config.yaml (default: scout)")
    parser.add_argument("--model", default=None, help="LLM model override")
    args = parser.parse_args()

    agent, api = await make_agent_with_capmatrix_tools(
        config_key=args.config_key,
        prompt_name="scout",
        tool_kinds=["intelligence"],
        llm=create_llm(args.model) if args.model else None,
    )

    print(f"[ScoutAgent] Connecting to Band as '{args.config_key}'...", flush=True)
    try:
        await agent.run()
    except KeyboardInterrupt:
        print("\n[ScoutAgent] Shutting down...")
    finally:
        await api.close()


def create_llm(model: str | None = None):
    from agents.base import create_llm as _cl
    return _cl(model)


if __name__ == "__main__":
    asyncio.run(main())
