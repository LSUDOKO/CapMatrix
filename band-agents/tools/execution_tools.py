import json
from langchain_core.tools import tool
from tools.capmatrix_api import CapMatrixAPIClient


def create_execution_tools(api: CapMatrixAPIClient) -> list:

    @tool
    async def execute_defi(protocol: str, amount: str, action: str = "deposit") -> str:
        """Deposit/swap/stake on a DeFi protocol via ERC-7715 delegation. protocol: morpho|uniswap|aerodrome|lido|aave. action: deposit|swap|stake|supply|lp."""
        try:
            data = await api.execute_defi(protocol=protocol, amount=amount, action=action)
            return json.dumps({
                "submitted": data.get("submitted", False),
                "prepared": data.get("prepared", False),
                "txHash": data.get("txHash"),
                "via": data.get("via", "1shot"),
                "contractAddress": data.get("contractAddress"),
                "receiptToken": data.get("receiptToken"),
                "receivedAmount": data.get("receivedAmount"),
            })
        except Exception as e:
            return json.dumps({"error": str(e), "submitted": False})

    @tool
    async def execute_copy_trade(protocol: str, token_symbol: str, amount: str, reasoning: str = "") -> str:
        """Mirror a whale trade: swap USDC into the token they bought. protocol: uniswap|aerodrome."""
        try:
            data = await api.execute_defi(
                protocol=protocol,
                amount=amount,
                action="swap",
                token_out=token_symbol,
            )
            return json.dumps({
                "submitted": data.get("submitted", False),
                "prepared": data.get("prepared", False),
                "txHash": data.get("txHash"),
                "via": data.get("via", "1shot"),
                "tokenSymbol": token_symbol,
                "amount": amount,
            })
        except Exception as e:
            return json.dumps({"error": str(e), "submitted": False})

    @tool
    async def rebalance(from_protocol: str, to_protocol: str, amount: str) -> str:
        """Withdraw from one protocol and deposit into another."""
        result = {"from": from_protocol, "to": to_protocol, "amount": amount}
        try:
            withdraw = await api.execute_defi(protocol=from_protocol, amount=amount, action="withdraw")
            result["withdraw"] = {"prepared": withdraw.get("prepared"), "txHash": withdraw.get("txHash")}
            if withdraw.get("error") or (not withdraw.get("prepared") and not withdraw.get("submitted")):
                result["error"] = f"Withdraw from {from_protocol} failed — deposit skipped"
                return json.dumps(result)
            deposit = await api.execute_defi(protocol=to_protocol, amount=amount, action="deposit")
            result["deposit"] = {"prepared": deposit.get("prepared"), "txHash": deposit.get("txHash")}
            return json.dumps(result)
        except Exception as e:
            result["error"] = str(e)
            return json.dumps(result)

    @tool
    async def notify_user(message: str) -> str:
        """Send Telegram update to user. Call last to report results."""
        try:
            data = await api.notify_telegram(message=message)
            return json.dumps({"sent": data.get("sent", False)})
        except Exception as e:
            return json.dumps({"sent": False, "error": str(e)})

    @tool
    async def monitor_positions() -> str:
        """Read current on-chain DeFi positions + live APY. Use before rebalancing."""
        try:
            data = await api.monitor_positions()
            positions = data.get("positions", data.get("data", []))
            return json.dumps({
                "positionCount": len(positions) if isinstance(positions, list) else 0,
                "positions": positions[:20] if isinstance(positions, list) else [],
                "source": "capmatrix-positions",
            })
        except Exception as e:
            return json.dumps({"error": str(e), "positions": []})

    return [execute_defi, execute_copy_trade, rebalance, notify_user, monitor_positions]
