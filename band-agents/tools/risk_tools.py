import json
from langchain_core.tools import tool
from tools.capmatrix_api import CapMatrixAPIClient


def create_risk_tools(api: CapMatrixAPIClient) -> list:

    @tool
    async def check_risk(context: str) -> str:
        """Classify market risk (LOW / MEDIUM / HIGH) using web search and analysis. Context should describe the protocol, token, or market conditions to evaluate."""
        try:
            data = await api.check_risk(context=context)
            return json.dumps({
                "riskLevel": data.get("riskLevel", "LOW"),
                "safeToExecute": data.get("safeToExecute", data.get("riskLevel", "LOW") != "HIGH"),
                "reason": data.get("reason", ""),
                "source": data.get("source", "clove-risk"),
            })
        except Exception as e:
            return json.dumps({"error": str(e), "riskLevel": "MEDIUM", "safeToExecute": False, "reason": f"Risk check failed: {e}"})

    return [check_risk]
