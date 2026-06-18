#!/usr/bin/env python3
"""
Launch a CapMatrix multi-agent workflow on Band.

Usage:
    python scripts/launch_workflow.py --scenario yield-farm
    python scripts/launch_workflow.py --scenario copy-trade --user-key thnv_u_...

This script:
1. Creates a Band chat room for the workflow
2. Adds all 4 agents (orchestrator, scout, risk_monitor, executor)
3. Sends the initial task message to @Orchestrator
4. Optionally starts agent processes

Scenarios:
    yield-farm     — Scout yields → Risk eval → Execute deposit
    copy-trade     — Discover whales → Risk eval → Copy trade
    rebalance      — Monitor positions → Check yields → Rebalance
    liquid-stake   — Check staking conditions → Stake wstETH
"""

import os
import asyncio
import argparse
import subprocess
import sys
import signal
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

HERE = Path(__file__).resolve().parent.parent

SCENARIOS = {
    "yield-farm": {
        "name": "CapMatrix Yield Farm",
        "task": "@Orchestrator Start a yield farming workflow. Scout yields across Base protocols, evaluate risk, then execute the best one.",
    },
    "copy-trade": {
        "name": "CapMatrix Copy Trade",
        "task": "@Orchestrator Start a copy trading workflow. Discover smart-money wallets, check convergence, evaluate risk, and execute the strongest copy trade.",
    },
    "rebalance": {
        "name": "CapMatrix Portfolio Rebalance",
        "task": "@Orchestrator Start a rebalance workflow. Check our current positions, find better yields, and rebalance if beneficial.",
    },
    "liquid-stake": {
        "name": "CapMatrix Liquid Staking",
        "task": "@Orchestrator Start a liquid staking workflow. Check if staking conditions are healthy, then stake idle USDC into wstETH.",
    },
}


async def create_workflow_room(
    client: "AsyncRestClient",
    name: str,
    agent_ids: list[str],
    task: str,
    agent_api_key: str,
) -> str:
    from thenvoi_rest.types import ChatRoomRequest, ParticipantRequest, ChatMessageRequest, ChatMessageRequestMentionsItem

    print(f"  Creating room '{name}'...")
    req = ChatRoomRequest(task_id=None)
    resp = await client.agent_api_chats.create_agent_chat(chat=req)
    room_id = resp.data.id
    print(f"  ✓ Room ID: {room_id}")

    # Add each agent as a participant (skip orchestrator — they created the room so they're already in)
    orchestrator_id = agent_ids[0]
    for aid in agent_ids:
        if aid == orchestrator_id:
            print(f"  ✓ Skipped orchestrator (already in room)")
            continue
        await client.agent_api_participants.add_agent_chat_participant(
            chat_id=room_id,
            participant=ParticipantRequest(participant_id=aid, role="member"),
        )
        print(f"  ✓ Added participant {aid[:8]}...")

    # Mention all agents except the orchestrator (can't mention self)
    mention_ids = [aid for aid in agent_ids if aid != orchestrator_id]
    msg_req = ChatMessageRequest(
        content=task,
        mentions=[ChatMessageRequestMentionsItem(id=aid) for aid in mention_ids],
    )
    await client.agent_api_messages.create_agent_chat_message(chat_id=room_id, message=msg_req)
    print(f"  ✓ Initial task sent to room")

    return room_id


async def main():
    parser = argparse.ArgumentParser(description="Launch CapMatrix Band workflow")
    parser.add_argument("--scenario", choices=list(SCENARIOS.keys()), default="yield-farm",
                       help="Workflow scenario to run")
    parser.add_argument("--launch-agents", action="store_true",
                       help="Also launch agent processes in subprocesses")
    parser.add_argument("--config", default=str(HERE / "agent_config.yaml"),
                       help="Path to agent_config.yaml")
    args = parser.parse_args()

    # Load agent config
    import yaml
    config_path = Path(args.config)
    if not config_path.exists():
        print(f"ERROR: Config not found at {config_path}")
        print("Run `python scripts/register_agents.py` first.")
        sys.exit(1)

    with open(config_path) as f:
        config = yaml.safe_load(f)

    required_keys = ["orchestrator", "scout", "risk_monitor", "executor"]
    for key in required_keys:
        if key not in config:
            print(f"ERROR: Missing '{key}' in {config_path}")
            sys.exit(1)

    scenario = SCENARIOS[args.scenario]
    agent_ids = [config[k]["agent_id"] for k in required_keys]
    # Use orchestrator's agent key for room creation
    agent_api_key = config["orchestrator"]["api_key"]

    print(f"\n🚀 Launching '{scenario['name']}' scenario")
    print(f"   Agents: {', '.join(required_keys)}\n")

    # Create room via Agent REST API (no Enterprise plan needed)
    from thenvoi_rest.client import AsyncRestClient
    base_url = os.environ.get("BAND_REST_URL", "https://app.band.ai")
    client = AsyncRestClient(api_key=agent_api_key, base_url=base_url)

    room_id = await create_workflow_room(client, scenario["name"], agent_ids, scenario["task"], agent_api_key)
    print(f"\n📋 Room created! Watch agents collaborate at:")
    print(f"   https://app.band.ai/rooms/{room_id}\n")

    # Optionally launch agents
    if args.launch_agents:
        print("🔄 Launching agent processes...")
        processes = []
        for key in required_keys:
            proc = subprocess.Popen(
                [sys.executable, "-m", f"agents.{key}_agent", "--config-key", key],
                cwd=HERE,
            )
            processes.append((key, proc))
            print(f"   Started {key} (PID {proc.pid})")

        print("\n⏳ Agents are running. Press Ctrl+C to stop all.\n")

        def shutdown(sig, frame):
            print("\n🛑 Shutting down agents...")
            for name, proc in processes:
                proc.terminate()
            sys.exit(0)

        signal.signal(signal.SIGINT, shutdown)
        signal.signal(signal.SIGTERM, shutdown)

        # Wait for any process to exit
        for name, proc in processes:
            proc.wait()
            print(f"   {name} exited (code {proc.returncode})")
    else:
        print("💡 Start agents manually in separate terminals:")
        for key in required_keys:
            print(f"   python -m agents.{key}_agent --config-key {key}")


if __name__ == "__main__":
    asyncio.run(main())
