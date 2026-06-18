# CapMatrix × Band — Multi-Agent DeFi System

**Band of Agents Hackathon 2026 — Track 1: Internal Enterprise Workflows**

A multi-agent DeFi yield management system where 4 autonomous agents collaborate
through Band chat rooms to research, evaluate risk, and execute DeFi transactions.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              Band Platform                   │
│  ┌──────────────────────────────────────┐   │
│  │         Workflow Room                 │   │
│  │                                      │   │
│  │  🎯 Orchestrator (workflow manager)  │   │
│  │  🔍 Scout (intelligence gatherer)    │   │
│  │  🛡️ Risk Monitor (sentinel)          │   │
│  │  ⚡ Executor (transaction executor)   │   │
│  └──────────┬───────────────────────────┘   │
└─────────────┼───────────────────────────────┘
              │
     ┌────────▼────────┐
     │  CapMatrix Backend  │
     │  (Next.js API)  │
     │  DeFi Execution │
     └─────────────────┘
```

### Agent Roles

| Agent | Role | Tools | Handoff |
|---|---|---|---|
| **Orchestrator** | Workflow manager | `band_lookup_peers`, `band_add_participant`, `band_send_message` | Kicks off tasks, tracks progress, reports to human |
| **Scout** | Intelligence gatherer | `check_yields`, `discover_whales`, `check_whale_trades` | Fetches data → hands to @RiskMonitor |
| **Risk Monitor** | Sentinel/guard | `check_risk` | Evaluates → approves/denies → hands to @Executor |
| **Executor** | Transaction executor | `execute_defi`, `execute_copy_trade`, `rebalance`, `notify_user` | Executes → reports to @Orchestrator |

### Collaboration Flow

```
@Orchestrator → "Scout, fetch Base yields"
    ↓
Scout calls check_yields() → CapMatrix API
    ↓
@Scout → "Best APY: 12.5% on Morpho. @RiskMonitor evaluate"
    ↓
Risk Monitor calls check_risk() → web search
    ↓
@RiskMonitor → "APPROVED. @Executor deposit 5 USDC into Morpho"
    ↓
Executor calls execute_defi() → CapMatrix API → on-chain tx
    ↓
@Executor → "Done. Tx: 0x... @Orchestrator"
    ↓
@Orchestrator → "Workflow complete. Summary: ..."
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- A CapMatrix Next.js backend running (or the deployed version)
- A Band account at https://app.band.ai
- An OpenAI API key (or Anthropic)

### Setup

```bash
# 1. Install dependencies
pip install -e .

# 2. Configure environment
cp .env.example .env
# Edit .env: add CapMatrix_BASE_URL, OPENAI_API_KEY

# 3. Register agents on Band platform
# Get your Band User API key from https://app.band.ai/settings
python scripts/register_agents.py --user-key band_u_1781699765_iz7Eslo0oIhmxBiqThbEZ5fFstAMhzy_

# 4. Launch a workflow
python scripts/launch_workflow.py --scenario yield-farm --user-key band_u_1781699765_iz7Eslo0oIhmxBiqThbEZ5fFstAMhzy_
```

### Running Agents

**Option A: Launch all agents (tmux)**
```bash
./scripts/run_local.sh
```

**Option B: Individual terminals**
```bash
# Terminal 1
python -m agents.orchestrator_agent

# Terminal 2
python -m agents.scout_agent

# Terminal 3
python -m agents.risk_monitor_agent

# Terminal 4
python -m agents.executor_agent
```

**Option C: Launch workflow + agents**
```bash
python scripts/launch_workflow.py --scenario yield-farm --launch-agents
```

### Scenarios

| Scenario | Description |
|---|---|
| `yield-farm` | Scout yields → Risk eval → Execute best deposit |
| `copy-trade` | Discover whales → Check convergence → Copy trade |
| `rebalance` | Monitor positions → Find better yields → Rebalance |
| `liquid-stake` | Check staking conditions → Stake USDC → wstETH |

---

## 🔧 CapMatrix Backend API

The Band agents call the CapMatrix Next.js backend for all DeFi operations.
Make sure your CapMatrix instance is running and `CapMatrix_BASE_URL` is set in `.env`.

### Required CapMatrix API Endpoints

| Endpoint | Used By | Purpose |
|---|---|---|
| `GET /api/intelligence` | Scout | Fetch live yield data |
| `GET /api/whale/discover` | Scout | Discover smart-money wallets |
| `GET /api/whale/activity` | Scout | Check whale trades |
| `GET /api/yields/live` | Scout | Real-time yields from DeFiLlama |
| `POST /api/execute/defi` | Executor | Execute DeFi transactions |
| `POST /api/notify/telegram` | Executor | Send Telegram notifications |
| `GET /api/positions/:wallet` | Executor | Monitor current positions |

---

## 🏆 Hackathon Submission

### How This Meets Judging Criteria

**Application of Technology (Band)**
Band is the **core collaboration layer** — not a thin wrapper. All inter-agent
communication flows through Band rooms via structured messages and @mentions.
The Band SDK handles real-time WebSocket connections, room presence, message
delivery, and participant management. Agents discover each other through
`band_lookup_peers` and coordinate entirely within Band.

**Presentation**
Each agent's behavior is defined by clear system prompts. The Band room serves
as a visible audit trail — anyone (including the human user) can join the room
and watch agents collaborate in real-time. Every decision, every handoff, and
every transaction is visible.

**Business Value**
Automated DeFi yield management with risk guardrails addresses a real enterprise
need: managing digital asset portfolios with proper separation of duties
(research → risk → execution). The sentinel powers (VETO, SHRINK, REVOKE)
provide enterprise-grade risk controls.

**Originality**
4 specialized agents with distinct roles, communicating through a shared
collaboration space. The sentinel with real on-chain revocation power
(Risk Monitor's REVOKE capability) goes beyond simple chat — it can
physically disable an agent's spending authority on-chain.

### Submission Assets

1. **GitHub Repository** — Contains all agent code, prompts, and scripts
2. **Demo Video** — Screen recording of agents collaborating in a Band room
3. **Slide Deck** — Architecture overview, flow diagrams, business case
4. **Live Demo** — Screenshots of completed workflow rooms with tx hashes

### Prize Tracks

| Track | Fit |
|---|---|
| Main: 1st/2nd/3rd | Strong multi-agent collaboration with real execution |
| Partner: AI/ML API | Can swap OpenAI for AI/ML API models |
| Partner: Featherless AI | Can swap LLM for open-source models via Featherless |

---

## 📁 Project Structure

```
band-agents/
├── pyproject.toml              # Python project config
├── .env.example                # Environment template
├── agent_config.yaml.example   # Band credentials template
├── README.md                   # This file
├── agents/
│   ├── __init__.py
│   ├── base.py                 # Shared base (LLM, CapMatrixAPIClient, tool setup)
│   ├── orchestrator_agent.py   # Workflow manager agent
│   ├── scout_agent.py          # Intelligence gatherer agent
│   ├── risk_monitor_agent.py   # Risk evaluation agent
│   └── executor_agent.py       # DeFi execution agent
├── tools/
│   ├── __init__.py
│   ├── CapMatrix_api.py            # HTTP client for CapMatrix backend
│   ├── intelligence_tools.py   # check_yields, discover_whales, etc.
│   ├── risk_tools.py           # check_risk
│   └── execution_tools.py      # execute_defi, notify_user, etc.
├── prompts/
│   ├── orchestrator.md         # Orchestrator system prompt
│   ├── scout.md                # Scout system prompt
│   ├── risk_monitor.md         # Risk Monitor system prompt
│   └── executor.md             # Executor system prompt
└── scripts/
    ├── register_agents.py      # Register agents on Band platform
    ├── launch_workflow.py      # Create room + start workflow
    └── run_local.sh            # One-command local launch (tmux)
```
