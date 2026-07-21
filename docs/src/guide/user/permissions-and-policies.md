# Permissions & Policies

In Authup, permissions and policies are two central concepts for controlling access within the system.
While permissions represent the basic ability to perform an action, policies enable detailed control over the conditions under which a permission is actually granted.

## Security Model

Authup implements an **allow-by-default** authorization model:

- A **permission** represents the ability to perform an action.
- Permissions are **not restricted by default**.
- **Policies** restrict permissions. Permissions can have **multiple policies** attached (n:m), combined using a `decisionStrategy`.
- If no policies are attached to a permission, the permission is **publicly executable**.

This applies to authenticated users, anonymous users, and machine clients alike.
Access restrictions must always be expressed through explicit policies.

## Permissions

A permission fundamentally describes an action on a subject/object.
It exists independently of roles and users.

Examples:
- `user_read`
- `user_update`

A permission may be:
- **unrestricted** (no policies attached) — globally executable by anyone
- **restricted** (one or more policies attached via the `auth_permission_policies` junction table) — only executable when the policy conditions are satisfied

However, these permissions alone are not sufficient to enable context-dependent access controls.
This is where policies come into play.

## Policies

A Policy defines a set of rules and conditions that determine whether a permission is granted in a specific context.
Each policy is configured with a set of parameters (config) and is evaluated against input data (input) provided at runtime.

A policy does not directly grant or deny access.
Instead, it evaluates whether its conditions are satisfied based on the input.
Policies are evaluated by policy evaluators, which implement the specific logic for each policy type.

The system provides several [built-in](../../sdks/javascript/access/policies.md) policies out of the box, covering common use cases such as time-based, identity-based, and attribute-based access control.

### Composite Policies

Policies can be combined using **composite policies** with a decision strategy:

- **UNANIMOUS** — all child policies must pass
- **AFFIRMATIVE** — at least one child policy must pass

This allows building policy trees that express complex access rules from simple building blocks.

## System Policies

Authup ships with built-in **system policies** that define default security restrictions.
These are created and maintained automatically on startup:

- `system.default` — a composite policy (UNANIMOUS) that bundles the standard restrictions
- `system.identity` — requires a valid identity (user or client)
- `system.permission-binding` — checks that the identity has the permission assigned, and enforces the grant's **realm reach** (see [Realm Scoping](#realm-scoping))

> Realm isolation is **no longer a policy**. It lives on each permission grant as the
> coarse, fail-closed `realmScope` column and is enforced as a separate factor inside
> `system.permission-binding`. The former `system.realm-match` / `system.realm-bound` /
> `system.realm-or-global` policies have been removed. The `realm_match` policy *type*
> remains available for user-defined policies.

System policies:
- Are marked as `builtIn` and cannot be modified or deleted via the API
- Are synchronized to the database on every startup

### Policy Assignment

Permissions reference policies through the `auth_permission_policies` junction table.
Multiple policies can be attached to a single permission, and the `decisionStrategy` on the permission controls how they are combined:

- **UNANIMOUS** (default) — all attached policies must pass
- **AFFIRMATIVE** — at least one attached policy must pass

Typical configurations:
- **Most built-in permissions** have `system.default` attached — the standard restriction
- **Custom permissions** can have any combination of built-in and custom policies
- **No policies attached** — unrestricted (publicly executable)

The system only manages built-in policies. Users can create and assign custom policies via the API.

## Realm Scoping

Authup distinguishes between **global** and **realm-scoped** entities:

- **Global entities** (permissions, roles, scopes, policies) can have `realmId = null` — they exist outside any realm and are reusable across all realms.
- **Realm-scoped entities** (users, clients) always belong to a specific realm.

To create a global entity via the API, explicitly pass `realmId: null`. If omitted, `realmId` defaults to the actor's realm.

### Realm reach (`realmScope`)

Each permission **grant** (the row that assigns a permission to a role / user / client) carries a coarse, **actor-relative** realm reach in its `realmScope` column — which realms the holder may act on *when using that permission*:

| `realmScope` | the grant lets the holder act on… | typical use |
|---|---|---|
| **`own`** (default) | only the holder's own realm | the safe default; `realm_admin` writes |
| **`ownOrNull`** | the holder's own realm **and** global (`realmId = null`) resources | `realm_admin` reads — to use global building blocks |
| **`any`** | any realm, including global | `admin` |
| **`none`** | nothing (reserved) | — |

It is **fail-closed**: a grant with no explicit `realmScope` defaults to `own`. The reach is matched against the realm of the resource being acted on, **independently of and in addition to** any policy on the grant.

The two built-in admin roles are expressed purely through this reach:

- **`admin`** — every permission at `any`, so it acts on all realms (and global resources) **from an identity in any realm**.
- **`realm_admin`** — direct entity create/update/delete at `own`; reads and assignments at `ownOrNull`. It cannot touch another realm's resources, and cannot create or modify global entities.

There is no special "master realm" privilege.

### Cross-realm protection for assignments

Realm reach also gates **assignments** (granting a role to a user, a permission to a role, a scope to a client, …): the write is gated by the realm of the **owner** entity — the user / role / client whose access you are changing. So a `realm_admin` in realm A cannot grant a role to a user in realm B, even with an otherwise-valid permission.

### Setting a custom reach

When an `admin` assigns a permission, the realm reach can be set per grant — via the API (`realmScope` on the create/update payload of `role-permission`, `user-permission`, `client-permission`) and in the UI (the **Realm Scope** selector beside the policy selector on a permission assignment). A restricted actor's chosen reach is always **capped to its own ceiling** — it can narrow but never widen. To scope a grant to a *specific set* of realms, set `realmScope: any` and attach a `policyId` ATTRIBUTES policy `{ realmId: { $in: ["…"] } }` on top.

## Permission Evaluation

When a permission is checked, the following flow applies:

1. Look up the requested permission
2. If the permission has no policies attached → **allow** (unrestricted)
3. If the permission has policies attached → evaluate all policies, combining results with the permission's `decisionStrategy`
4. Enforce the realm reach of the grant that conferred the permission — the grant's [`realmScope`](#realm-reach-realmscope) against the target resource's realm
5. If that grant also carries a **junction policy** (`policyId`), evaluate it as a further restriction
6. The permission's policies pass **and** the realm reach matches **and** any junction policy passes → **allow**; any required factor fails → **deny**

### Pre-checks and data availability

Many operations check a permission **twice**: a cheap pre-check before doing any work
(is this actor allowed to attempt the operation at all?) and a full check once the
concrete data — the loaded record, the validated payload — is available.

Policy evaluation is aware of this: a policy whose input data is not known yet (for
example an attribute condition before the record is loaded) is treated as **pending**
rather than failed. Pending policies pass the pre-check and are decided in the full
check. Only a policy that already fails with the information available — e.g. an
identity-type restriction — denies at the pre-check. This holds for arbitrarily nested
and inverted policy trees, so an inverted (`invert: true`) policy never causes a
spurious early denial.

## Decision Strategy

When a permission has multiple policies attached, the `decisionStrategy` on the permission controls how results are combined:

| Strategy | Behavior |
|---|---|
| **unanimous** (default) | All attached policies must pass |
| **affirmative** | At least one attached policy must pass |

The decision strategy is set per permission. Most built-in permissions use `unanimous` — all policies in `system.default` must pass.

## Junction Policies

Permission assignments (role-permission, user-permission, client-permission) carry two independent controls on the junction table:

- **`realmScope`** — the coarse [realm reach](#realm-reach-realmscope) of the grant (`own` / `ownOrNull` / `any`). This is how the built-in `realm_admin` is confined to its own realm and `admin` reaches every realm.
- **`policyId`** — an optional **junction policy** that adds a further restriction on top of the permission's own policies, e.g. an ATTRIBUTES policy `{ realmId: { $in: ["…"] } }` to limit a grant to a specific set of realms.

Both are evaluated as additional, ANDed factors: the holder must satisfy the permission's own policies, the grant's `realmScope`, **and** any junction `policyId`. Only an unrestricted (`any`, policy-free) actor may attach an explicit `policyId`; a restricted actor inherits its own grant's policy, so it cannot detach a restriction to widen access.

## Privilege Escalation Prevention

Authup prevents privilege escalation through two mechanisms:

### Superset Check

When assigning a role to an identity (user or client), the system verifies that the assigning actor
owns **at least** what the target role confers. The check is grant-by-grant and policy-aware:
for every grant the target role contains, some grant of the actor must **cover** it —

- the actor grant's [realm reach](#realm-reach-realmscope) must be at least as wide
  (`own` cannot confer `any`), and
- an unrestricted actor grant covers anything; a policy-restricted actor grant covers a
  target grant only when both carry the **same** policy configuration. Two *different*
  restrictions are never assumed to overlap — the check fails closed.

This means an `admin` (every permission at `any`, policy-free) can assign any role, while a
`realm_admin` (confined to `own`/`ownOrNull` reach) cannot assign the `admin` role — the
admin role confers wider reach than the realm_admin owns.

### Junction Policy Propagation

When creating any permission binding (role-permission, user-permission, client-permission),
the system caps the new grant by the actor's own grant for that permission:

- the new binding's `realmScope` is limited to the reach the actor itself holds
  (narrowing is allowed, widening is not), and
- if the actor's own grant is policy-restricted, that **actor's** policy is propagated
  onto the new binding.

Only an unrestricted actor (reach `any`, no junction policy) may attach an explicit
`policyId` of its own choosing. This prevents restricted actors from creating permission
bindings that are broader than their own access.
