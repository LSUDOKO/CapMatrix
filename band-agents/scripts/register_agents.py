#!/usr/bin/env python3
"""
Register CapMatrix Band agents on the Band platform.

Usage:
    python scripts/register_agents.py --user-key thnv_u_...

This creates 4 agents (orchestrator, scout, risk_monitor, executor) and writes
their credentials to agent_config.yaml.
"""

import os
import asyncio
import argparse
import yaml
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

HERE = Path(__file__).resolve().parent.parent
CONFIG_PATH = HERE / "agent_config.yaml"


import hashlib, time
_USER_HASH = hashlib.sha256(os.environ.get("USER", "unknown").encode()).hexdigest()[:8]
_TS = int(time.time())
_SUFFIX = f"v2-{_USER_HASH}-{_TS}"

AGENTS = [
    {"config_key": "orchestrator",  "name": f"CapMatrix Orchestrator {_SUFFIX}",  "role": "orchestrator"},
    {"config_key": "scout",         "name": f"CapMatrix Scout {_SUFFIX}",        "role": "scout"},
    {"config_key": "risk_monitor",  "name": f"CapMatrix Risk Monitor {_SUFFIX}", "role": "risk_monitor"},
    {"config_key": "executor",      "name": f"CapMatrix Executor {_SUFFIX}",     "role": "executor"},
]


async def register_agent(
    client: "AsyncRestClient",
    name: str,
    role: str,
) -> dict:
    from thenvoi_rest.types import AgentRegisterRequest

    print(f"  Registering '{name}' ({role})...")
    req = AgentRegisterRequest(
        name=name,
        description=f"CapMatrix {role.title()} Agent — Band of Agents Hackathon project",
    )
    resp = await client.human_api_agents.register_my_agent(agent=req)
    agent = resp.data.agent
    creds = resp.data.credentials
    agent_id = agent.id if agent else "unknown"
    api_key = creds.api_key if creds else "unknown"
    print(f"    ✓ Agent ID: {agent_id}")
    return {"agent_id": agent_id, "api_key": api_key}


async def main():
    parser = argparse.ArgumentParser(description="Register CapMatrix Band agents")
    parser.add_argument("--user-key", help="Band User API key (thnv_u_...)")
    parser.add_argument("--output", default=str(CONFIG_PATH), help="Output YAML path")
    args = parser.parse_args()

    user_key = args.user_key or os.environ.get("BAND_USER_KEY") or os.environ.get("THENVOI_USER_KEY")
    if not user_key:
        print("ERROR: Provide --user-key or set BAND_USER_KEY / THENVOI_USER_KEY")
        return

    from thenvoi_rest.client import AsyncRestClient

    base_url = os.environ.get("BAND_REST_URL", "https://app.band.ai")
    client = AsyncRestClient(api_key=user_key, base_url=base_url)

    config: dict[str, dict[str, str]] = {}
    print(f"Registering {len(AGENTS)} agents on {base_url}...\n")

    for agent_def in AGENTS:
        creds = await register_agent(client, agent_def["name"], agent_def["role"])
        config[agent_def["config_key"]] = {
            "agent_id": creds["agent_id"],
            "api_key": creds["api_key"],
        }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)
    print(f"\n✓ Credentials written to {output_path}")
    print("\n⚠️  IMPORTANT: Save your API keys! They are shown once.")
    print("   Add them to your .env file for persistent access.")


if __name__ == "__main__":
    asyncio.run(main())
