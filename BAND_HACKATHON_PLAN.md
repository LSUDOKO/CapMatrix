# Band of Agents Hackathon — CLOVE Integration Plan

## 🎯 Overview

Transform CLOVE's existing DeFi agent system into a **Band-powered multi-agent collaboration platform** where autonomous agents discover each other, share context, delegate work, and coordinate through Band chat rooms.

**Track:** Track 1 — Internal Enterprise Workflows (DeFi yield management as an enterprise financial operations workflow)

---

## 🔍 Current Architecture vs. Target

| Aspect | Current CLOVE | Target (Band-Powered) |
|---|---|---|
| Agent orchestration | Monolithic orchestrator API route runs agents sequentially | Agents communicate through Band rooms via @mentions |
| Agent coupling | Tightly coupled in a single Next.js process | Loosely coupled — each agent is a standalone Band process |
| Context sharing | MongoDB handoff packets + shared memory | Band room messages + structured context in chat |
| Agent discovery | Hardcoded agent IDs in workflow | Agents discover/recruit via `band_lookup_peers` |
| Framework | Venice AI ReAct loop within Next.js | `band-sdk` + LangGraphAdapter (or AnthropicAdapter) |
| DeFi execution | Next.js API endpoints | Reuse same endpoints via HTTP from Python agents |
| Human oversight | Telegram notifications | Human-in-the-loop via Band room (human can join) |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Band Platform                            │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   Workflow Room   │  │   Workflow Room   │   ...          │
│  │  (yield-work-1)  │  │  (copy-work-2)   │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                      │                           │
│    ┌──────┼──────┐       ┌──────┼──────┐                    │
│    │      │      │       │      │      │                    │
│  ┌─▼──┐ ┌─▼──┐ ┌▼──┐ ┌─▼──┐ ┌─▼──┐ ┌▼──┐                  │
│  │SCOUT│ │RISK│ │EXE│ │SCOUT│ │RISK│ │EXE│                  │
│  │     │ │MON │ │C  │ │     │ │MON │ │C  │                  │
│  └──┬──┘ └──┬─┘ └┬──┘ └──┬──┘ └──┬─┘ └┬──┘                 │
│     │       │    │       │       │    │                      │
└─────┼───────┼────┼───────┼───────┼────┼──────────────────────┘
      │       │    │       │       │    │
      └───────┼────┼───────┼───────┼────┘
              │    │       │       │
         ┌────▼────▼───────▼───────▼────┐
         │    CLOVE Next.js Backend      │
         │  (DeFi execution, yields,     │
         │   whales, risk, notifications)│
         └───────────────────────────────┘
```

---

## 🤖 Agent Roles (Minimum 3, We Build 4)

### 1. Scout Agent (Intelligence)
- **Framework:** `LangGraphAdapter` with OpenAI/Anthropic
- **Tools:** `checkYields`, `checkWhaleTrades`, `discoverWhales` (call CLOVE API)
- **Responsibility:** Fetches live DeFi intelligence, reports findings
- **Communication:** Announces findings in room, @mentions Risk Monitor

### 2. Risk Monitor Agent (Sentinel)
- **Framework:** `LangGraphAdapter` with OpenAI/Anthropic
- **Tools:** `checkRisk`, `webSearch` (call CLOVE API)
- **Responsibility:** Evaluates risk, makes approve/hold/revoke decisions
- **Communication:** Receives intelligence from Scout, sends decision to Executor
- **Powers:** VETO (block transaction), SHRINK (halve position), REVOKE (kill delegation)

### 3. Executor Agent (Action)
- **Framework:** `LangGraphAdapter` with OpenAI/Anthropic
- **Tools:** `executeDefi`, `executeCopyTrade`, `rebalance`, `notifyUser` (call CLOVE API)
- **Responsibility:** Executes approved DeFi transactions
- **Communication:** Receives orders from Risk Monitor, reports results

### 4. Orchestrator Agent (Workflow Manager)
- **Framework:** `LangGraphAdapter` with OpenAI/Anthropic
- **Tools:** `band_create_chatroom`, `band_lookup_peers`, `band_add_participant`
- **Responsibility:** Creates workflow rooms, recruits agents, starts workflows
- **Communication:** Initiates tasks, monitors progress, reports to human

---

## 🔄 Agent Collaboration Flow (via Band)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Band Chat Room                                │
│                                                                  │
│  [Orchestrator] @Scout Fetch live Base DeFi yields now          │
│       ↓                                                          │
│  [Scout] Calling checkYields... (tool call)                      │
│       ↓                                                          │
│  [Scout] @RiskMonitor Intelligence gathered:                     │
│          Best APY: 12.5% on Morpho USDC Vault                   │
│          TVL: $45M, Risk: LOW                                    │
│       ↓                                                          │
│  [Risk Monitor] Calling checkRisk... (tool call + web search)    │
│       ↓                                                          │
│  [Risk Monitor] @Executor Decision: APPROVED                     │
│                  Action: deposit 5 USDC into Morpho              │
│                  Risk Level: LOW                                  │
│                  Reasoning: Strong yields, healthy TVL,           │
│                  no recent exploits                               │
│       ↓                                                          │
│  [Executor] Calling executeDefi... (tool call → CLOVE API)       │
│       ↓                                                          │
│  [Executor] @Orchestrator Execution complete!                    │
│              Tx: 0xabc...123                                      │
│              Protocol: Morpho USDC Vault                         │
│              Amount: 5 USDC                                       │
│              Basescan: https://basescan.org/tx/0xabc...123        │
│                                                                  │
│  ...and the human owner can join the room and observe live       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 New Files to Create

```
CLOVE-main/
├── band-agents/                          # NEW — Band agent implementations
│   ├── pyproject.toml                    # Python project config
│   ├── .env.example                      # Env vars template
│   ├── agents.yaml.example               # Band agent credentials template
│   ├── README.md                         # Hackathon submission docs
│   │
│   ├── agents/                           # Agent implementations
│   │   ├── __init__.py
│   │   ├── base.py                       # Shared agent base (tool setup, CLOVE API client)
│   │   ├── scout_agent.py                # Intelligence/scout
│   │   ├── risk_monitor_agent.py         # Risk evaluation
│   │   ├── executor_agent.py             # DeFi execution
│   │   └── orchestrator_agent.py         # Workflow orchestrator
│   │
│   ├── tools/                            # Custom tools for each agent
│   │   ├── __init__.py
│   │   ├── clove_api.py                  # CLOVE Next.js API client
│   │   ├── intelligence_tools.py         # checkYields, checkWhaleTrades, discoverWhales
│   │   ├── risk_tools.py                 # checkRisk (web search + analysis)
│   │   └── execution_tools.py            # executeDefi, executeCopyTrade, rebalance, notifyUser
│   │
│   ├── prompts/                          # System prompts per agent role
│   │   ├── scout.md
│   │   ├── risk_monitor.md
│   │   ├── executor.md
│   │   └── orchestrator.md
│   │
│   └── scripts/                          # Utility scripts
│       ├── register_agents.py            # Register agents on Band platform
│       ├── launch_workflow.py            # Create room + start a workflow run
│       └── run_local.sh                  # Quick-start all agents locally
│
└── BAND_HACKATHON_PLAN.md                # This document
```

---

## 🛠️ Implementation Steps

### Phase 1: Agent Infrastructure (band-agents package)

#### 1.1 `pyproject.toml`
- Dependencies: `band-sdk`, `langchain-openai` / `anthropic`, `httpx`, `python-dotenv`
- Python 3.11+
- Entry points for each agent script

#### 1.2 `agents/base.py`
- `CloveAPIClient` class — HTTP client wrapping all CLOVE Next.js API endpoints:
  - `/api/intelligence` → checkYields
  - `/api/whale/discover` → discoverWhales
  - `/api/whale/activity` → checkWhaleTrades
  - `/api/execute/defi` → executeDefi
  - `/api/yields/live` → checkRealYields
  - `/api/notify/telegram` → notifyUser
- Shared Band adapter setup utility
- Environment variable loading

#### 1.3 `tools/clove_api.py`
- Async HTTP client class with retry, timeout handling
- Maps Band tool names to CLOVE API endpoints

#### 1.4 `tools/intelligence_tools.py`
- `check_yields()` → calls CLOVE `/api/intelligence`
- `check_whale_trades(wallets, hours)` → calls CLOVE `/api/whale/activity`
- `discover_whales(limit, hours)` → calls CLOVE `/api/whale/discover`
- Return results as structured JSON strings

#### 1.5 `tools/risk_tools.py`
- `check_risk(context)` → calls CLOVE `/api/execute` (Venice web search analysis)
- Fallback heuristic risk assessment

#### 1.6 `tools/execution_tools.py`
- `execute_defi(protocol, amount, action)` → calls CLOVE `/api/execute/defi`
- `execute_copy_trade(protocol, token, amount)` → calls CLOVE `/api/execute/defi`
- `rebalance(from_protocol, to_protocol, amount)` → two-step withdraw + deposit
- `notify_user(message)` → calls CLOVE `/api/notify/telegram`

---

### Phase 2: Agent Implementations

#### 2.1 Scout Agent (`agents/scout_agent.py`)
- **Adapter:** `LangGraphAdapter` with `ChatOpenAI` or `ChatAnthropic`
- **Tools:** `check_yields`, `check_whale_trades`, `discover_whales`
- **System prompt:** Instructions to fetch intelligence, never execute, report clearly
- **Behavior:**
  1. Receive task from orchestrator via Band message
  2. Call intelligence tools
  3. Post structured findings to room
  4. @mention Risk Monitor with summary
  5. Wait for next task

#### 2.2 Risk Monitor Agent (`agents/risk_monitor_agent.py`)
- **Adapter:** `LangGraphAdapter`
- **Tools:** `check_risk`
- **System prompt:** Sentinel instructions (VETO, SHRINK, REVOKE powers)
- **Behavior:**
  1. Receive intelligence from Scout via Band message
  2. Call checkRisk (web search + analysis)
  3. Make decision (approve/hold/revoke with shrink if MEDIUM risk)
  4. Post decision to room
  5. @mention Executor with execution parameters

#### 2.3 Executor Agent (`agents/executor_agent.py`)
- **Adapter:** `LangGraphAdapter`
- **Tools:** `execute_defi`, `execute_copy_trade`, `rebalance`, `notify_user`
- **System prompt:** Execute exactly as specified, don't re-evaluate risk
- **Behavior:**
  1. Receive approved decision from Risk Monitor via Band message
  2. Call appropriate execution tool
  3. Post transaction result to room
  4. @mention Orchestrator with completion report

#### 2.4 Orchestrator Agent (`agents/orchestrator_agent.py`)
- **Adapter:** `LangGraphAdapter`
- **Tools:** Uses Band's built-in `band_create_chatroom`, `band_lookup_peers`, `band_add_participant`
- **System prompt:** Workflow manager — creates rooms, recruits agents, manages lifecycle
- **Behavior:**
  1. On startup: create workflow room
  2. Discover/recruit Scout, Risk Monitor, Executor
  3. Send initial task to room (@Scout)
  4. Monitor progress
  5. Report completion to human

---

### Phase 3: Scripts & Configuration

#### 3.1 `scripts/register_agents.py`
- Uses Band REST API (`AsyncRestClient`) to register each agent
- Creates `agent_config.yaml` with credentials

#### 3.2 `scripts/launch_workflow.py`
- Loads agent configs
- Starts all 4 agents as asyncio tasks in a single process (or as subprocesses)
- Creates the initial workflow chat room
- Sends the kickoff message

#### 3.3 `scripts/run_local.sh`
- One-command local launch
- Sets env vars, installs deps, starts agents

---

### Phase 4: Integration with CLOVE Frontend (Optional Enhancement)

#### 4.1 Add Band agent status to CLOVE dashboard
- New API route: `/api/band/rooms` — list active Band workflow rooms
- Dashboard widget showing live agent activity

#### 4.2 Webhook receiver for Band agent events
- Use Band's event system to push agent status to CLOVE
- Update MongoDB with Band room state

---

## 🎯 How This Meets Hackathon Criteria

| Criterion | How We Satisfy It |
|---|---|
| **Minimum 3 agents** | 4 agents: Scout, Risk Monitor, Executor, Orchestrator |
| **Meaningful Band usage** | All inter-agent communication goes through Band rooms via @mentions. Band is the collaboration layer — not a thin wrapper |
| **Task handoffs** | Scout → Risk Monitor → Executor chain uses Band messages for structured handoff |
| **Shared context** | Scout's intelligence, Risk Monitor's decision, Executor's result all posted to the shared Band room |
| **Real enterprise workflow** | DeFi yield management = financial operations workflow with multiple reviewers and approvals |
| **Track fit** | Track 1 (Internal Enterprise Workflows) — financial operations with compliance/review gates |
| **Originality** | Multi-agent system where agents don't just respond to prompts but coordinate through a shared collaboration space with real decision-making powers (VETO, SHRINK, REVOKE) |
| **Business value** | Automated DeFi yield management with risk guardrails — real $$$ at stake, real enterprise need |

---

## 🚀 Getting Started (Post-Implementation)

```bash
# 1. Install band-agents dependencies
cd band-agents
pip install -e .

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your CLOVE_BASE_URL, OPENAI_API_KEY, etc.

# 3. Register agents on Band platform
python scripts/register_agents.py

# 4. Start a workflow
python scripts/launch_workflow.py --scenario yield-farm

# 5. Watch agents collaborate in real-time on app.band.ai
```

---

## 📦 Submission Assets

For the hackathon submission, we will include:
1. **Public GitHub repo** with all code
2. **Demo video** showing agents collaborating through Band rooms
3. **Slide deck** explaining the architecture
4. **Live demo** of a running workflow (or screenshots)
5. **MIT License** compliance
