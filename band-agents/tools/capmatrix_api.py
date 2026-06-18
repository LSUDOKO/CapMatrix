import os
import httpx
from typing import Any


class CapMatrixAPIClient:
    def __init__(self, base_url: str | None = None, internal_secret: str | None = None):
        self.base_url = (base_url or os.environ.get("CAPMATRIX_BASE_URL", "http://localhost:3000")).rstrip("/")
        self.internal_secret = internal_secret or os.environ.get("CAPMATRIX_INTERNAL_SECRET") or os.environ.get("CLOVE_INTERNAL_SECRET", "")

        headers: dict[str, str] = {}
        if self.internal_secret:
            headers["x-internal-secret"] = self.internal_secret

        self._client = httpx.AsyncClient(timeout=60.0, headers=headers)

    async def close(self):
        await self._client.aclose()

    # ── Intelligence ────────────────────────────────────────────────────────

    async def check_yields(self) -> dict[str, Any]:
        res = await self._client.get(f"{self.base_url}/api/intelligence")
        res.raise_for_status()
        return res.json()

    async def check_real_yields(self, chain: str = "Base", limit: int = 15) -> dict[str, Any]:
        res = await self._client.get(
            f"{self.base_url}/api/yields/live",
            params={"chain": chain, "limit": limit},
        )
        res.raise_for_status()
        return res.json()

    # ── Whale Discovery ─────────────────────────────────────────────────────

    async def discover_whales(self, limit: int = 5, hours: int = 24) -> dict[str, Any]:
        res = await self._client.get(
            f"{self.base_url}/api/whale/discover",
            params={"limit": limit, "hours": hours},
        )
        res.raise_for_status()
        return res.json()

    async def check_whale_trades(self, wallets: list[str] | None = None, hours: int = 24) -> dict[str, Any]:
        params: dict[str, str] = {"hours": str(hours)}
        if wallets:
            params["wallets"] = ",".join(wallets)
        res = await self._client.get(f"{self.base_url}/api/whale/activity", params=params)
        res.raise_for_status()
        return res.json()

    # ── DeFi Execution ──────────────────────────────────────────────────────

    async def execute_defi(
        self,
        protocol: str,
        amount: str,
        action: str = "deposit",
        permissions_context: str | None = None,
        delegation_manager: str = "0x",
        wallet_address: str | None = None,
        token_out: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "action": f"{protocol}-{action}" if action != "swap" else f"{protocol}-swap-exact-input",
            "protocol": protocol,
            "nodeConfig": {"amount": amount, "platform": protocol, "action": action},
            "permissionsContext": permissions_context or os.environ.get("WALLET_PERMISSIONS_CONTEXT", "0xdemo"),
            "delegationManager": delegation_manager,
            "walletAddress": wallet_address or os.environ.get("CAPMATRIX_WALLET_ADDRESS", ""),
        }
        if token_out:
            body["nodeConfig"]["tokenOut"] = token_out
        res = await self._client.post(f"{self.base_url}/api/execute/defi", json=body)
        res.raise_for_status()
        return res.json()

    async def check_risk(self, context: str) -> dict[str, Any]:
        res = await self._client.post(
            f"{self.base_url}/api/execute/check-risk",
            json={"context": context},
        )
        if res.status_code == 404:
            return {"riskLevel": "LOW", "safeToExecute": True, "reason": "Risk endpoint unavailable — defaulting to LOW", "source": "fallback"}
        res.raise_for_status()
        return res.json()

    async def notify_telegram(self, message: str, wallet_address: str | None = None, agent_id: str | None = None) -> dict[str, Any]:
        res = await self._client.post(
            f"{self.base_url}/api/notify/telegram",
            json={
                "message": message,
                "walletAddress": wallet_address or os.environ.get("CAPMATRIX_WALLET_ADDRESS", ""),
                "agentId": agent_id or "",
            },
        )
        res.raise_for_status()
        return res.json()

    async def monitor_positions(self, wallet_address: str | None = None) -> dict[str, Any]:
        wa = wallet_address or os.environ.get("CAPMATRIX_WALLET_ADDRESS", "")
        res = await self._client.get(f"{self.base_url}/api/positions/{wa}")
        res.raise_for_status()
        return res.json()
