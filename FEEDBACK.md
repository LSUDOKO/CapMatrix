# Developer Feedback — MetaMask Smart Accounts Kit, 1Shot Public Relayer & Venice AI

This is honest, from-the-trenches feedback from building **CLOVE** — an autonomous DeFi agent that
delegates a capped USDC budget through real ERC-7715/ERC-7710 chains, redeemed via the 1Shot
Public Relayer on Base mainnet, with Venice AI as the agents' brain. Everything below was hit
*in practice* while wiring up [`src/lib/web3/`](src/lib/web3/),
[`src/lib/oneshot/`](src/lib/oneshot/), and [`src/lib/venice/`](src/lib/venice/) — not theoretical.

We're submitting this for the dev-experience / tech-feedback bounty. Nothing here is a
complaint about the products — all three made something genuinely novel possible (on-chain,
EVM-enforced agent budgets with zero ETH anywhere). This is the friction we'd remove for the
next team.

---

## MetaMask Smart Accounts Kit (`@metamask/smart-accounts-kit`)

### What worked great
- `requestExecutionPermissions` (ERC-7715 "Advanced Permissions") gives a genuinely rich,
  human-readable consent screen for `erc20-token-periodic` grants — way better UX than a raw
  `eth_signTypedData` dialog.
- `createDelegation` + `signDelegation` + `encodeDelegations` / `decodeDelegations` is a clean
  primitive set once you know the conventions. Building a 3-hop `user → session → worker →
  relayer` chain ([`subDelegation.ts`](src/lib/web3/subDelegation.ts)) was very doable with it.
- `DelegationManager.disableDelegation` gives real, one-click, on-chain revocation — exactly
  the "non-custodial, reversible" story we wanted.

### Friction points / suggestions

1. **Caveat `terms` packing is a footgun with no error-message guidance.**
   `AllowedTargetsEnforcer` and `ERC20TransferAmountEnforcer` expect **packed** bytes
   (20-byte addresses concatenated, or `20-byte token ‖ 32-byte uint256`), *not* the
   ABI-encoded output of `viem`'s `encodePacked(["address[]"], ...)` (which pads each
   element to 32 bytes). Getting this wrong throws
   `AllowedTargetsEnforcer:invalid-terms-length` with zero hint about *what* the expected
   layout is. We had to read the enforcer source on Basescan to figure it out.
   → **Suggestion:** export typed helper builders (`buildAllowedTargetsTerms(addresses)`,
   `buildErc20CapTerms(token, amount)`) from the kit so nobody hand-packs bytes, or at least
   document the exact byte layout per enforcer next to `createCaveat`.

2. **`InvalidEOASignature()` when the delegator isn't a *real* EOA.**
   If you sign a delegation with a raw private key but the `from`/`delegator` address is a
   *counterfactual smart-account address* (not the EOA that controls it), redemption reverts
   with `InvalidEOASignature()`. This is correct behavior, but it's not obvious from the types
   — `createDelegation({ from, to, ... })` happily accepts a smart-account address as `from`
   even when you're about to sign with a plain EOA key.
   → **Suggestion:** a runtime warning (or a `signerType: "eoa" | "smart-account"` param) when
   `from` doesn't match the recovered signer's address would have saved us a day of debugging.

3. **Modern MetaMask blocks raw `signDelegation` for its own accounts** with
   `"External signature requests cannot sign delegations for internal accounts."` — discovered
   only by triggering it. The *fix* (use `requestExecutionPermissions` / Advanced Permissions
   instead of manual EIP-712 signing for the user→delegate hop) is reasonable, but this
   constraint isn't called out anywhere we could find in the docs for `signDelegation`.
   → **Suggestion:** document this explicitly on `signDelegation` itself — "do not use this for
   delegations *from* a user's own MetaMask account; use `requestExecutionPermissions`."

4. **`disableDelegation` ABI isn't exported as a ready-to-use ABI fragment.**
   We had to dig into `dist/index-DXdlz7t4.d.ts` to confirm `disableDelegation` takes the
   *full `Delegation` struct*, not a `bytes32` hash. We ended up hand-writing the ABI
   ([`permissions.ts:497-522`](src/lib/web3/permissions.ts)).
   → **Suggestion:** export `DelegationManagerAbi` (or at least `disableDelegation`'s
   fragment) from the package so consumers don't hand-roll ABIs that can silently drift.

5. **Cross-MetaMask-version behavior for `erc20-token-periodic` is inconsistent and
   undocumented in a discoverable place.** Production MetaMask returns either a valid
   `permissionsContext` or a near-empty one depending on version; Flask is reliable. We ended
   up version-sniffing (`web3_clientVersion`, threshold `v13.23.0`) — see
   [`permissions.ts:53-87`](src/lib/web3/permissions.ts).
   → **Suggestion:** a "Supported Advanced Permissions by MetaMask version" compatibility table
   (even just a markdown file in the kit repo) would remove a lot of guesswork.

6. **Finding the EIP-7702 implementation address (`EIP7702StatelessDeleGatorImpl`) inside
   `environment.implementations`** required reading the SDK's runtime object rather than the
   docs — see [`upgrade7702.ts:46`](src/lib/web3/upgrade7702.ts). A typed accessor
   (`environment.implementations.eip7702Stateless`) would be friendlier than a string-keyed
   lookup into `Record<string, string>`.

---

## 1Shot Public Relayer (`relayer.1shotapi.com`)

### What worked great
- **Genuinely permissionless** — no API key, no business account, no credits. `relayer_send7710Transaction`
  + `relayer_getStatus` is a tiny surface area and it *works*.
- **Gas-in-USDC** is the killer feature for an agent product: users never need ETH, ever. This
  is the whole reason CLOVE can say "fully non-custodial, zero ETH anywhere."
- `relayer_getFeeData` returning a live USDC quote (`minFee`, `gasPrice`, `rate`, `context`) is
  exactly the right shape — easy to build a fee-floor + buffer on top of
  ([`publicRelayer.ts:216-222`](src/lib/oneshot/publicRelayer.ts)).
- EIP-7702 `authorizationList` support on `relayer_send7710Transaction` is fantastic — upgrading
  a plain EOA to a smart account *in the same transaction* that redeems the delegation is a
  great piece of design.

### Friction points / suggestions

1. **Conflicting guidance between the "dev platform" docs and the public relayer.**
   We initially built against the authenticated dev-platform endpoints
   (`/methods/{id}/executeAsDelegator`, `/wallets/{id}/delegations/redelegate`) using
   kebab-case URLs from older examples (`execute-as-delegator`,
   `redelegate-with-delegation-data`) — both 404'd because the real endpoints are camelCase.
   Support (thanks, Charlie 🙏) clarified that **if you're using the public relayer, don't use
   the dev platform at all** — build every delegation hop yourself with the smart-accounts-kit
   and point the final hop at the relayer's `targetAddress`.
   → **Suggestion:** the public-relayer docs should say up front, in bold: *"This is a
   self-contained, standalone path. Do not combine it with the dev-platform
   execute-as-delegator/redelegate endpoints."* We burned real time building (and then ripping
   out) a whole authenticated-redemption code path.

2. **`relayer_getStatus` doesn't populate `result.hash` — the real tx hash is at
   `result.receipt.transactionHash`.** Not documented anywhere we found; discovered by logging
   the raw response. See [`publicRelayer.ts:119-138`](src/lib/oneshot/publicRelayer.ts).
   → **Suggestion:** either populate `result.hash` consistently, or document the
   `receipt.transactionHash` field as the canonical source.

3. **`relayer_send7710Transaction` intermittently 404s on submit** under repeated testing, with
   no documented retry/backoff guidance. We ended up building fixture-replay for our `/proof`
   demo routes specifically because live submission isn't reliable enough to demo on stage.
   → **Suggestion:** either fix the intermittent 404 or document expected error rates / retry
   strategy so integrators know it's not their fault.

4. **`destinationUrl` (webhook) validation rejects the *entire transaction*, not just the
   webhook registration, if the URL isn't a valid absolute `http(s)://` URL.** We pass this
   optionally (only when `PUBLIC_BASE_URL` is set and well-formed) precisely to avoid
   `"destinationUrl is not a valid URL"` killing an otherwise-valid redemption — see
   [`publicRelayer.ts:264-279`](src/lib/oneshot/publicRelayer.ts).
   → **Suggestion:** treat a malformed optional `destinationUrl` as "ignore the webhook, proceed
   with polling" rather than rejecting the whole submission.

5. **No documented guidance on multi-hop (>2) delegation chains.** Our redemption chain is
   `worker → relayer` *plus* `session → worker` *plus* the user's root grant — three hops
   total, assembled leaf-to-root via `encodeDelegations`
   ([`subDelegation.ts:298-306`](src/lib/web3/subDelegation.ts)). Whether the relayer accepts
   arbitrary-depth chains (vs. just a single user→relayer hop) wasn't documented; we had to
   verify it live on Base mainnet ourselves (it works! see the `// ⚠️ LIVE-TEST CHECKPOINT`
   comment we left in the code, now resolved).
   → **Suggestion:** document the maximum/expected delegation-chain depth `relayer_send7710Transaction`
   will decode and redeem.

6. **EIP-7702 `authorizationList` on `relayer_send7710Transaction` is undocumented as a
   top-level param.** We found this via a community spike script, not official docs — see
   [`upgrade7702.ts`](src/lib/web3/upgrade7702.ts). Given how powerful "redeem + upgrade EOA to
   smart account in one tx" is, this deserves a first-class docs section and a worked example.

---

## Venice AI (`api.venice.ai`, OpenAI-compatible)

Venice is the brain of every CLOVE agent — strategy compilation, planning, live risk research,
reflection, plus TTS voice notes and strategy images. Wired up in
[`src/lib/venice/`](src/lib/venice/) and called throughout
[`src/lib/agent/`](src/lib/agent/).

### What worked great
- **Drop-in OpenAI compatibility.** `new OpenAI({ baseURL: "https://api.venice.ai/api/v1" })` and
  the entire OpenAI SDK just works — chat, tools, streaming. Zero new client to learn.
- **Built-in web search** (`venice_parameters: { enable_web_search: "on" }`) is a genuinely great
  feature for a DeFi agent — our `checkRisk` tool gets *real-time* exploit/depeg/pause signals
  without us standing up a separate search pipeline.
- **One key, many modalities** — reasoning, embeddings (our RAG playbook), `tts-kokoro` voice
  reports, and image generation all behind the same key. That breadth let one agent "speak" its
  report and render a strategy card with no extra vendors.
- **Privacy / uncensored** posture is a real fit for an autonomous finance agent — no refusals on
  legitimate trading prompts, and no data retention to reason about.

### Friction points / suggestions

1. **`response_format: { type: "json_object" }` is honored by only *some* models, with no
   documented matrix.** In our testing only `qwen3`-class models reliably returned strict JSON;
   others ignored the directive and wrapped JSON in prose. We had to hard-pin our "compiler" role
   to a specific model (`VENICE_MODELS.compiler`) to get parseable output.
   → **Suggestion:** publish a per-model capability table (JSON mode / tool calling / web search /
   context window), or surface a `supports_response_format` flag in `GET /models`.

2. **Tool-calling format is inconsistent across models.** Larger models (`llama-3.3-70b`) emit
   proper structured `tool_calls`; smaller/other models sometimes emit the call as *text* in
   `content` (e.g. `<function=executeDefi,{…}>`) instead. We had to write a fallback parser that
   detects the text form and executes it anyway (see our run loop in
   [`src/app/api/agent/run-stream/route.ts`](src/app/api/agent/run-stream/route.ts)).
   → **Suggestion:** normalize tool-call output to the OpenAI `tool_calls` shape across all
   tool-capable models, or document which models support native tool calling.

3. **Smaller models 500 with `"Inference processing failed"` on multi-tool prompts.** When we
   handed a small/fast model several tool definitions at once it would intermittently 500 rather
   than degrade gracefully. We pinned multi-tool reasoning to `llama-3.3-70b` and added retry +
   backoff.
   → **Suggestion:** clearer error semantics (a 4xx "too many tools for this model" beats a 500),
   and a documented per-model tool-count ceiling.

4. **`enable_web_search` takes the *string* `"on"`/`"off"`, not a boolean.** Passing `true`
   silently did nothing for a while.
   → **Suggestion:** accept booleans too, or validate and reject the wrong type loudly.

5. **`venice_parameters: { include_venice_system_prompt: false }` is essential but easy to miss.**
   Without it, Venice's default persona leaks into structured/agent outputs. We set it on *every*
   call.
   → **Suggestion:** default it to `false` when the caller supplies their own system prompt, or
   call it out prominently in the quickstart.

6. **Rate limits (429) aren't documented per tier**, so we built defensive exponential backoff and
   a deterministic fallback for every Venice call rather than guessing the ceiling.
   → **Suggestion:** document per-tier RPM/TPM limits and return `Retry-After` consistently.

---

## TL;DR for all three teams

The primitives are real and they *work* — CLOVE has a live, on-chain, EVM-enforced agent budget
on Base mainnet with **zero ETH** anywhere in the flow, including a worker that tried to
overspend and got reverted by `ERC20TransferAmountEnforcer` (see the README's "proof" section).
Almost every friction point above is a **docs gap** or a **missing typed helper**, not a broken
primitive. Closing those gaps would take an integration that currently takes days down to hours.

— The CLOVE team
