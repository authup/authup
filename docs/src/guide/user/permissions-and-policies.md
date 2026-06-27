# Permissions & Policies

In Authup, permissions and policies are two central concepts for controlling access within the system.
While permissions represent the basic ability to perform an action, policies enable detailed control over the conditions under which a permission is actually granted.

## Security Model

Authup implements an **allow-by-default** authorization model:

- A **permission** represents the ability to perform an action.
- Permissions are **not restricted by default**.
- **Policies** restrict permissions. Permissions can have **multiple policies** attached (n:m), combined using a `decision_strategy`.
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
- `system.identity` — requires a valid identity (user, robot, or client)
- `system.permission-binding` — checks that the identity has the permission assigned, and enforces the grant's **realm reach** (see [Realm Scoping](#realm-scoping))

> Realm isolation is **no longer a policy**. It lives on each permission grant as the
> coarse, fail-closed `realm_scope` column and is enforced as a separate factor inside
> `system.permission-binding`. The former `system.realm-match` / `system.realm-bound` /
> `system.realm-or-global` policies have been removed. The `realm_match` policy *type*
> remains available for user-defined policies.

System policies:
- Are marked as `built_in` and cannot be modified or deleted via the API
- Are synchronized to the database on every startup

### Policy Assignment

Permissions reference policies through the `auth_permission_policies` junction table.
Multiple policies can be attached to a single permission, and the `decision_strategy` on the permission controls how they are combined:

- **UNANIMOUS** (default) — all attached policies must pass
- **AFFIRMATIVE** — at least one attached policy must pass

Typical configurations:
- **Most built-in permissions** have `system.default` attached — the standard restriction
- **Custom permissions** can have any combination of built-in and custom policies
- **No policies attached** — unrestricted (publicly executable)

The system only manages built-in policies. Users can create and assign custom policies via the API.

## Realm Scoping

Authup distinguishes between **global** and **realm-scoped** entities:

- **Global entities** (permissions, roles, scopes, policies) can have `realm_id = null` — they exist outside any realm and are reusable across all realms.
- **Realm-scoped entities** (users, clients, robots) always belong to a specific realm.

To create a global entity via the API, explicitly pass `realm_id: null`. If omitted, `realm_id` defaults to the actor's realm.

### Realm reach (`realm_scope`)

Each permission **grant** (the row that assigns a permission to a role / user / client / robot) carries a coarse, **actor-relative** realm reach in its `realm_scope` column — which realms the holder may act on *when using that permission*:

| `realm_scope` | the grant lets the holder act on… | typical use |
|---|---|---|
| **`own`** (default) | only the holder's own realm | the safe default; `realm_admin` writes |
| **`own_or_null`** | the holder's own realm **and** global (`realm_id = null`) resources | `realm_admin` reads — to use global building blocks |
| **`any`** | any realm, including global | `admin` |
| **`none`** | nothing (reserved) | — |

It is **fail-closed**: a grant with no explicit `realm_scope` defaults to `own`. The reach is matched against the realm of the resource being acted on, **independently of and in addition to** any policy on the grant.

The two built-in admin roles are expressed purely through this reach:

- **`admin`** — every permission at `any`, so it acts on all realms (and global resources) **from an identity in any realm**.
- **`realm_admin`** — direct entity create/update/delete at `own`; reads and assignments at `own_or_null`. It cannot touch another realm's resources, and cannot create or modify global entities.

There is no special "master realm" privilege.

### Cross-realm protection for assignments

Realm reach also gates **assignments** (granting a role to a user, a permission to a role, a scope to a client, …): the write is gated by the realm of the **owner** entity — the user / role / client / robot whose access you are changing. So a `realm_admin` in realm A cannot grant a role to a user in realm B, even with an otherwise-valid permission.

### Setting a custom reach

When an `admin` assigns a permission, the realm reach can be set per grant — via the API (`realm_scope` on the create/update payload of `role-permission`, `user-permission`, `client-permission`, `robot-permission`) and in the UI (the **Realm Scope** selector beside the policy selector on a permission assignment). A restricted actor's chosen reach is always **capped to its own ceiling** — it can narrow but never widen. To scope a grant to a *specific set* of realms, set `realm_scope: any` and attach a `policy_id` ATTRIBUTES policy `{ realm_id: { $in: ["…"] } }` on top.

## Permission Evaluation

When a permission is checked, the following flow applies:

1. Look up the requested permission
2. If the permission has no policies attached → **allow** (unrestricted)
3. If the permission has policies attached → evaluate all policies, combining results with the permission's `decision_strategy`
4. Enforce the realm reach of the grant that conferred the permission — the grant's [`realm_scope`](#realm-reach-realm_scope) against the target resource's realm
5. If that grant also carries a **junction policy** (`policy_id`), evaluate it as a further restriction
6. The permission's policies pass **and** the realm reach matches **and** any junction policy passes → **allow**; any required factor fails → **deny**

## Decision Strategy

When a permission has multiple policies attached, the `decision_strategy` on the permission controls how results are combined:

| Strategy | Behavior |
|---|---|
| **unanimous** (default) | All attached policies must pass |
| **affirmative** | At least one attached policy must pass |

The decision strategy is set per permission. Most built-in permissions use `unanimous` — all policies in `system.default` must pass.

## Junction Policies

Permission assignments (role-permission, user-permission, client-permission, robot-permission) carry two independent controls on the junction table:

- **`realm_scope`** — the coarse [realm reach](#realm-reach-realm_scope) of the grant (`own` / `own_or_null` / `any`). This is how the built-in `realm_admin` is confined to its own realm and `admin` reaches every realm.
- **`policy_id`** — an optional **junction policy** that adds a further restriction on top of the permission's own policies, e.g. an ATTRIBUTES policy `{ realm_id: { $in: ["…"] } }` to limit a grant to a specific set of realms.

Both are evaluated as additional, ANDed factors: the holder must satisfy the permission's own policies, the grant's `realm_scope`, **and** any junction `policy_id`. Only an unrestricted (`any`, policy-free) actor may attach an explicit `policy_id`; a restricted actor inherits its own grant's policy, so it cannot detach a restriction to widen access.

## Privilege Escalation Prevention

Authup prevents privilege escalation through two mechanisms:

### Superset Check

When assigning a role to an identity (user, client, or robot), the system verifies that the assigning actor
owns **all** permissions contained in the target role. This check is policy-aware:

- If the actor has a restricted binding (junction policy) for a permission, but the target role has an unrestricted
  binding for the same permission, the assignment is denied.
- If the actor has multiple bindings for a permission (e.g. through different roles), the least restrictive
  binding wins (affirmative merge).

This means an `admin` (unrestricted) can assign any role, but a `realm_admin` (restricted by `system.realm-bound`)
cannot assign the `admin` role — because the admin role contains unrestricted bindings that the realm_admin does not own.

### Junction Policy Propagation

When creating any permission binding (role-permission, user-permission, client-permission, robot-permission),
the system automatically propagates the actor's own junction policy to the new binding.

If a `realm_admin` assigns a permission to a role, the new role-permission entry inherits the
`system.realm-bound` junction policy. This prevents restricted actors from creating unrestricted permission bindings.
