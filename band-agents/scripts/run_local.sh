#!/usr/bin/env bash
set -euo pipefail

# ─── CapMatrix Band Agents — Local Quick Start ───────────────────────
# Starts all 4 Band agents in a single tmux session for local dev.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check prerequisites
command -v tmux &>/dev/null || { echo "ERROR: tmux is required. Install it first."; exit 1; }
[ -f agent_config.yaml ] || { echo "ERROR: agent_config.yaml not found. Run: python scripts/register_agents.py"; exit 1; }
[ -f .env ] || { echo "WARNING: .env not found. Copy from .env.example"; }

SESSION="capmatrix-band-agents"

# Kill existing session if running
tmux kill-session -t "$SESSION" 2>/dev/null || true

echo "🚀 Starting CapMatrix Band Agents in tmux session '$SESSION'..."

tmux new-session -d -s "$SESSION" -n orchestrator
PYTHON="${PROJECT_DIR}/../.venv/bin/python"

tmux send-keys -t "$SESSION:orchestrator" "cd $PROJECT_DIR && $PYTHON -m agents.orchestrator_agent --config-key orchestrator" Enter

tmux new-window -t "$SESSION" -n scout
tmux send-keys -t "$SESSION:scout" "cd $PROJECT_DIR && $PYTHON -m agents.scout_agent --config-key scout" Enter

tmux new-window -t "$SESSION" -n risk-monitor
tmux send-keys -t "$SESSION:risk-monitor" "cd $PROJECT_DIR && $PYTHON -m agents.risk_monitor_agent --config-key risk_monitor" Enter

tmux new-window -t "$SESSION" -n executor
tmux send-keys -t "$SESSION:executor" "cd $PROJECT_DIR && $PYTHON -m agents.executor_agent --config-key executor" Enter

echo "✓ All agents started in tmux session '$SESSION'"
echo "  Attach: tmux attach -t $SESSION"
echo "  Detach: Ctrl+B, D"
echo "  Stop:   tmux kill-session -t $SESSION"

tmux select-window -t "$SESSION:orchestrator"
tmux attach -t "$SESSION"
