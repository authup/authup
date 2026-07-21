# Policy Engine

The policy engine lives in `packages/access` and is consumed by `apps/server-core`
(request authorization), `packages/client-web-kit` (UI permission checks) and any
downstream application. This page explains its evaluation model and how to extend it —
read it before touching `packages/access/src/policy/**` or the server-core evaluator in
`apps/server-core/src/core/security/policy/`.

## Two-layer evaluation

A permission check evaluates two layers, both of which must pass:

1. **Permission-level policies** — the policies attached to the permission itself via the
   `auth_permission_policies` junction (for built-in permissions, usually the
   `system.default` composite: `system.identity` + `system.permission-binding`).
2. **Per-grant factors** — enforced inside `system.permission-binding` (the server-core
   `PermissionBindingPolicyEvaluator`): each grant's coarse realm reach (`realmScope`)
   and its optional junction policy (`policyId`). An actor's multiple grants for one
   permission form a **disjunction** — access is granted iff some grant passes both of
   its own factors.

## Tri-state evaluation

The engine is tri-state: a policy settles **true**, settles **false**, or stays
**pending** when the data it needs is not in the evaluation bag yet
(`PolicyEvaluationResult.pending`, riding on `success: false` so any consumer that
ignores the flag fails closed).

- Every evaluator declares its data needs via `requires?(value)` — the `PolicyData` keys
  it needs before it can settle (e.g. `identity`, `attributes`). The engine checks the
  declaration **before** invoking the evaluator; a missing key yields a pending
  `DATA_MISSING` result instead of an evaluation against missing data.
- The composite algebra treats pending children as *unknown*: they are never counted and
  never masked to a settled value, and the composite settles despite them only when no
  resolution could change the outcome. `invert` is **never applied to a pending result**
  — unknown stays unknown under negation.
- `preEvaluate` (the pre-flight gate) is *derived* from data availability: it passes
  `pendingPolicies: 'permit'`, so a pending tree passes the gate and only a tree that
  settles false with the current bag denies. The full `evaluate()` with the enriched bag
  remains the authority (pending ⇒ deny there).

There is **no hand-maintained exclusion list** anymore — a new policy type places itself
by shipping `requires()`, with zero engine edits.

## Condition lowering (WHERE pushdown)

An evaluator may additionally implement `toCondition?(value, ctx)` — express the policy
as a rapiq `ICondition` over row attributes, partial-evaluated against the knowns bag
(e.g. the actor's realm baked into a realm-match condition). The contract is
**exactness**: a row satisfies the condition iff the policy settles true with that row's
attributes. Return `null` (or throw) when a configuration is not expressible — it then
stays a per-row post-check, which is always sound.

Lowering rides the same evaluation walk, opt-in via the evaluation-context flag
`withConditions` (default off, so `evaluate`/`preEvaluate` hot paths never pay it): the
engine attaches `result.condition` when a leaf pends, and the composite composes
residuals structurally — settled children drop out as identity elements, `AND`/`OR`
residuals compose **all-or-nothing per node** (pushing a single `OR` disjunct would
wrongly exclude rows), and `invert` wraps the residual symbolically via rapiq's `not()`
(null-inclusive complement, so pushdown and in-memory post-checks agree on null-bearing
rows).

## Adding a policy type

1. Create `packages/access/src/policy/built-in/<name>/` with `types.ts` (config type),
   `validator.ts`, `evaluator.ts` (+ barrel `index.ts`), mirroring an existing sibling.
2. The evaluator implements `IPolicyEvaluator`:
   - `evaluate(value, ctx)` — settle against the bag; use `maybeInvertPolicyOutcome`
     only on genuine outcomes (never on non-evaluations or pendings).
   - `requires(value)` — the data keys the config needs; may be config-dependent (see
     the realm-match evaluator's scope vs. attribute mode).
   - `toCondition(value, ctx)` — optional, only when the policy is expressible over row
     attributes.
3. Register the type in `BuiltInPolicyType`, `BuiltInPolicyTypeMap`
   (`built-in/types.ts` — without this `definePolicyWithType` cannot author it) and
   `PolicyDefaultEvaluators` (`policy/constants.ts`).
4. Server-side persistence: add the config's attribute validators in
   `@authup/core-kit`'s policy validator so the API can persist it, and extend the kit's
   policy form components for the UI.
5. Tests live in `packages/access/test/unit/policy/` — pin settled/pending/inverted
   behavior, and when `toCondition` exists, pin **semantic parity**: compile the
   condition with `@rapiq/memory` and assert the predicate equals full evaluation row by
   row (see `to-condition.spec.ts`).

## Where things live

| Concern | Location |
|---|---|
| Engine, tri-state gate | `packages/access/src/policy/engine/module.ts` |
| Built-in evaluators | `packages/access/src/policy/built-in/*/evaluator.ts` |
| Composite algebra | `packages/access/src/policy/built-in/composite/evaluator.ts` |
| Permission evaluator (`evaluate`/`preEvaluate`) | `packages/access/src/permission/evaluator/module.ts` |
| Grant aggregation & dominance | `packages/access/src/permission/helpers/` |
| Realm reach (`realmScope`) | `packages/access/src/permission/realm-scope/` |
| Server-core binding evaluator (Layer 2) | `apps/server-core/src/core/security/policy/evaluator.ts` |

The authoritative, always-current deep-dive is the repository's agent documentation:
[`.agents/architecture.md`](https://github.com/authup/authup/blob/master/.agents/architecture.md)
(sections *Policy-Permission Model* and *preEvaluate is derived from data availability*).
