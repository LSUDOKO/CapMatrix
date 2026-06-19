import os
import time
import random
from pathlib import Path
from dotenv import load_dotenv
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from band import Agent, AgentConfig
from band.adapters import LangGraphAdapter
from tools.capmatrix_api import CapMatrixAPIClient
from tools.intelligence_tools import create_intelligence_tools
from tools.risk_tools import create_risk_tools
from tools.execution_tools import create_execution_tools

HERE = Path(__file__).resolve().parent.parent
PROMPTS_DIR = HERE / "prompts"
CONFIG_PATH = HERE / "agent_config.yaml"

# Load .env from the project root
load_dotenv(HERE / ".env")


def load_prompt(name: str) -> str:
    path = PROMPTS_DIR / f"{name}.md"
    if path.exists():
        return path.read_text().strip()
    return f"You are a {name} agent."


class RateLimitedLLM(BaseChatModel):
    """Wraps a ChatOpenAI with exponential-backoff retry on 429."""
    def __init__(self, llm: BaseChatModel, max_retries: int = 8):
        super().__init__()
        self._llm = llm
        self._max_retries = max_retries

    def _invoke_with_retry(self, method, *args, **kwargs):
        last_exc = None
        for attempt in range(1, self._max_retries + 1):
            try:
                return method(*args, **kwargs)
            except Exception as e:
                last_exc = e
                if "429" in str(e) or "Rate limit" in str(e):
                    wait = min(2 ** attempt + random.uniform(0, 1), 30)
                    time.sleep(wait)
                else:
                    raise
        raise last_exc

    async def _ainvoke_with_retry(self, method, *args, **kwargs):
        import asyncio
        last_exc = None
        for attempt in range(1, self._max_retries + 1):
            try:
                return await method(*args, **kwargs)
            except Exception as e:
                last_exc = e
                if "429" in str(e) or "Rate limit" in str(e):
                    wait = min(2 ** attempt + random.uniform(0, 1), 30)
                    await asyncio.sleep(wait)
                else:
                    raise
        raise last_exc

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        return self._invoke_with_retry(
            self._llm._generate, messages, stop=stop, run_manager=run_manager, **kwargs
        )

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        return await self._ainvoke_with_retry(
            self._llm._agenerate, messages, stop=stop, run_manager=run_manager, **kwargs
        )

    def _stream(self, messages, stop=None, run_manager=None, **kwargs):
        return self._invoke_with_retry(
            self._llm._stream, messages, stop=stop, run_manager=run_manager, **kwargs
        )

    async def _astream(self, messages, stop=None, run_manager=None, **kwargs):
        gen = await self._ainvoke_with_retry(
            self._llm._astream, messages, stop=stop, run_manager=run_manager, **kwargs
        )
        async for chunk in gen:
            yield chunk

    @property
    def _llm_type(self) -> str:
        return "rate-limited-" + self._llm._llm_type

    def bind_tools(self, *args, **kwargs):
        return self._llm.bind_tools(*args, **kwargs)

    def with_structured_output(self, *args, **kwargs):
        return self._llm.with_structured_output(*args, **kwargs)

    @property
    def model_name(self):
        return getattr(self._llm, "model_name", "")


def _test_llm(llm: ChatOpenAI) -> bool:
    try:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as ex:
            fut = ex.submit(llm.invoke, [{"role": "user", "content": "hi"}])
            fut.result(timeout=10)
        return True
    except Exception as e:
        err_str = str(e).lower()
        # Only reject on auth errors — rate limits (429) and timeouts are transient.
        if "401" in err_str or "403" in err_str or "unauthorized" in err_str or "authentication" in err_str or "invalid api key" in err_str:
            return False
        # Rate-limited, timed out, etc. — still usable, RateLimitedLLM handles retries.
        return True


def create_llm(model: str | None = None) -> BaseChatModel:
    model = model or os.environ.get("BAND_LLM_MODEL", "gpt-4o")
    fallback_model = os.environ.get("FALLBACK_LLM_MODEL", model)

    venice_key = os.environ.get("VENICE_API_KEY")
    if venice_key:
        base_url = os.environ.get("VENICE_BASE_URL", "https://api.venice.ai/api/v1")
        llm = ChatOpenAI(
            model=model,
            api_key=venice_key,
            base_url=base_url,
            timeout=30,
        )
        if _test_llm(llm):
            return RateLimitedLLM(llm)

    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        base_url = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        llm = ChatOpenAI(
            model=fallback_model,
            api_key=groq_key,
            base_url=base_url,
        )
        if _test_llm(llm):
            return RateLimitedLLM(llm)

    featherless_key = os.environ.get("FEATHERLESS_API_KEY")
    if featherless_key and featherless_key != "YOUR_NEW_FEATHERLESS_KEY_HERE":
        base_url = os.environ.get("FEATHERLESS_BASE_URL", "https://api.featherless.ai/v1")
        llm = ChatOpenAI(
            model=fallback_model,
            api_key=featherless_key,
            base_url=base_url,
        )
        if _test_llm(llm):
            return RateLimitedLLM(llm)

    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        llm = ChatOpenAI(model=model, api_key=openai_key)
        if _test_llm(llm):
            return RateLimitedLLM(llm)

    raise ValueError("No LLM configured. Set VENICE_API_KEY, GROQ_API_KEY, FEATHERLESS_API_KEY, or OPENAI_API_KEY.")


def make_band_agent(
    config_key: str,
    prompt_name: str,
    adapter_tools: list | None = None,
    config: AgentConfig | None = None,
    llm: BaseChatModel | None = None,
) -> Agent:
    llm = llm or create_llm()
    checkpointer = MemorySaver()

    prompt_text = load_prompt(prompt_name)
    adapter = LangGraphAdapter(
        llm=llm,
        checkpointer=checkpointer,
        additional_tools=adapter_tools or [],
        custom_section=prompt_text,
    )

    agent = Agent.from_config(
        config_key,
        config_path=CONFIG_PATH,
        adapter=adapter,
        config=config,
    )
    return agent


async def make_agent_with_capmatrix_tools(
    config_key: str,
    prompt_name: str,
    tool_kinds: list[str],
    llm: BaseChatModel | None = None,
    config: AgentConfig | None = None,
) -> tuple[Agent, CapMatrixAPIClient]:
    api = CapMatrixAPIClient()
    all_tools = []
    if "intelligence" in tool_kinds:
        all_tools.extend(create_intelligence_tools(api))
    if "risk" in tool_kinds:
        all_tools.extend(create_risk_tools(api))
    if "execution" in tool_kinds:
        all_tools.extend(create_execution_tools(api))

    agent = make_band_agent(config_key, prompt_name, all_tools, config, llm)
    return agent, api
