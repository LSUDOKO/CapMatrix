import os
import asyncio
import argparse
from pathlib import Path
from band import Agent, AgentConfig
from band.adapters import LangGraphAdapter
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from agents.base import load_prompt, create_llm, CONFIG_PATH


async def main():
    parser = argparse.ArgumentParser(description="CapMatrix Orchestrator Agent — Workflow manager")
    parser.add_argument("--config-key", default="orchestrator", help="Key in agent_config.yaml (default: orchestrator)")
    parser.add_argument("--model", default=None, help="LLM model override")
    args = parser.parse_args()

    llm = create_llm(args.model)
    checkpointer = MemorySaver()

    prompt_text = load_prompt("orchestrator")
    adapter = LangGraphAdapter(
        llm=llm,
        checkpointer=checkpointer,
        custom_section=prompt_text,
    )

    agent = Agent.from_config(
        args.config_key,
        config_path=CONFIG_PATH,
        adapter=adapter,
    )

    print(f"[Orchestrator] Connecting to Band as '{args.config_key}'...", flush=True)
    try:
        await agent.run()
    except KeyboardInterrupt:
        print("\n[Orchestrator] Shutting down...")


if __name__ == "__main__":
    asyncio.run(main())
