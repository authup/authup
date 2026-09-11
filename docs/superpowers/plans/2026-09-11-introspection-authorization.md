# Introspection authorization implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the independent shared evaluator and server projection tasks. Each task uses RED/GREEN checks.

**Goal:** Implement #3581: authenticated introspection transports definition policies and paired scope/policy grants for resource-server evaluation and exact query compilation.

**Architecture:** Add `authorization.version: 1` alongside legacy name-only `permissions`. Preserve definition namespaces, the effective definition policy tree and each grant's reach/policy term. Move the server binding evaluator into access and use it from both server and a validated snapshot consumer. Keep generic PermissionMemoryProvider behavior intact.

**Tech Stack:** Existing TypeScript, Zod, Vitest, rapiq; no new dependencies.

**Spec:** GitHub authup/authup#3581 and the contract below.

## Global constraints and contract

- Work only in `.claude/worktrees/issue-3581`, branch `fix/3581-introspection-authorization`.
- No version/changelog edits. Apps remain AGPL; packages Apache-2.0.
- Snapshot: `{version:1, identity:{id,type,realm_id,realm_name,client_id}, permissions:[{name,realm_id,client_id,policy,grants:[{realm_scope,policy}]}]}`. Nullable fields are required. Policy trees retain their existing policy-language property names and decision strategies; envelope fields use snake_case.
- Snapshot includes held permission definitions; absent definitions deny. Explicit null policy means no policy. Missing policy is malformed. Namespaces match exact `(name, realm_id, client_id)` tuples.
- Consumer accepts an active introspection response, validates the snapshot and every supported policy before returning an evaluator, and never falls back to legacy names. Unknown policy types reject the snapshot. Resource evaluation requires explicit realm data; compilation leaves row data unknown and returns allow/deny/conditional/post. Snapshot identity cannot be overridden.
- A binding node anywhere in a definition tree resolves the grants for that definition. Keep all nesting/inversion/decision strategies. Definition policies control whether binding checks apply, matching server semantics.
- Inactive responses contain neither permissions nor authorization. Existing authenticated introspection gates stay in effect.

## Tasks

- [x] Share server binding evaluation through `packages/access/src/policy/built-in/permission-binding/identity-evaluator.ts`; retain server alias. Pin inversion and realm-less compilation parity.
- [x] Add public `createAuthorizationEvaluator` in access with strict envelope validation, supported policy validation, exact namespaces and authoritative identity. Test scope matrix, mixed grants, definition policies, namespaces, malformed/legacy snapshots and exact collection filtering/totals.
- [x] Define wire types in specs and export snapshots from the shared introspection subject resolver; inject definition provider into token/session routes. Test transport plus consumer decisions, inactive reports and missing definitions.
- [x] Document consumer usage and upgrade order; update relevant agent architecture conventions.
- [x] Build affected workspaces, check source+test types, run focused and existing regression suites, lint changed TS, and obtain independent code review.

## Validation

- Access: 192 tests passed; specs: 15 tests passed.
- Server-core: 2,487 tests passed, 16 dialect-dependent skips, on the full sqlite suite.
- Access/specs/server-core builds and source+test type checks passed; docs built successfully.
- Independent review findings (credential kinds/scopes, actor client selection, null realm handling, malformed queries and compile context) fixed with regression checks.
