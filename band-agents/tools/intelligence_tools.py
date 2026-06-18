import json
from typing import Any
from langchain_core.tools import tool
from tools.capmatrix_api import CapMatrixAPIClient


def create_intelligence_tools(api: CapMatrixAPIClient) -> list:

    @tool
    async def check_yields() -> str:
        """Fetch live DeFi yields + news. Call first when scouting."""
        try:
            data = await api.check_yields()
            return json.dumps({
                "bestApy": data.get("bestApy", 0),
                "recommended": data.get("recommended", "unknown"),
                "reason": data.get("reason", ""),
                "yieldCount": len(data.get("yields", {})),
                "marketNews": (data.get("marketIntel") or {}).get("tavilyAnswer", ""),
                "source": "capmatrix-intelligence",
            })
        except Exception as e:
            return json.dumps({"error": str(e)})

    @tool
    async def discover_whales(limit: int = 5, hours: int = 24) -> str:
        """Find smart-money wallets via recent DEX flow. Returns ranked wallets + trades."""
        try:
            data = await api.discover_whales(limit=limit, hours=hours)
            wallets = data.get("discovered", [])
            convergence = data.get("convergence", [])
            top_target = None
            if convergence:
                sorted_c = sorted(convergence, key=lambda c: c.get("walletCount", 0), reverse=True)
                top_target = sorted_c[0].get("target") if sorted_c else None
            return json.dumps({
                "discoveredCount": len(wallets),
                "wallets": wallets,
                "tradeCount": len(data.get("trades", [])),
                "convergenceCount": len(convergence),
                "strongestConvergence": top_target,
                "convergence": convergence[:5],
                "source": "capmatrix-whale-discovery",
            })
        except Exception as e:
            return json.dumps({"error": str(e), "wallets": [], "convergence": []})

    @tool
    async def check_whale_trades(wallets: list[str] | None = None, hours: int = 24) -> str:
        """Read recent on-chain swaps of tracked wallets. Returns trades + convergence."""
        try:
            data = await api.check_whale_trades(wallets=wallets, hours=hours)
            return json.dumps({
                "tradeCount": len(data.get("trades", [])),
                "trades": data.get("trades", [])[:15],
                "convergence": data.get("convergence", []),
                "source": "capmatrix-whale-activity",
            })
        except Exception as e:
            return json.dumps({"error": str(e), "trades": []})

    return [check_yields, discover_whales, check_whale_trades]
