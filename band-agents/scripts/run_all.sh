#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON="${PROJECT_DIR}/../.venv/bin/python"

cd "$PROJECT_DIR"

[ -f agent_config.yaml ] || { echo "ERROR: agent_config.yaml not found. Run: python scripts/register_agents.py"; exit 1; }

echo "Starting all 4 CapMatrix Band Agents in background..."
echo "Logs: orchestrator.log, scout.log, risk_monitor.log, executor.log"
echo ""

for agent in orchestrator scout risk_monitor executor; do
    log="${agent}.log"
    $PYTHON -m "agents.${agent}_agent" --config-key "$agent" > "$log" 2>&1 &
    pid=$!
    echo "  [$agent] PID $pid → $log"
done

echo ""
echo "Done. To stop: kill $(jobs -p | tr '\n' ' ')"
echo "To watch: tail -f *.log"
