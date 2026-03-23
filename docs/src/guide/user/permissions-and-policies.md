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
- `system.permission-binding` — checks that the identity has the permission assigned
- `system.realm-match` — ensures realm-level isolation
- `system.realm-bound` — restricts operations to realm-scoped entities only (entities with `realm_id` not null)

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

Authup distinguishes between **global** and **realm-scoped** entities.
Global entities (e.g. permissions, policies) have `realm_id = null` and exist outside any realm.
Realm-scoped entities (e.g. users, clients, robots) belong to a specific realm.

Two built-in admin roles control the scope of access:

- **`admin`** — full access to all entities, including global ones
- **`realm_admin`** — access restricted to realm-scoped entities only. This role has the `system.realm-bound` policy attached as a junction policy on its permission assignments, preventing operations on global entities.

There is no special "master realm" privilege. Access control is entirely policy-driven:
the `system.realm-bound` policy evaluates whether an entity has a `realm_id`, and denies the operation if it does not.

## Permission Evaluation

When a permission is checked, the following flow applies:

1. Look up the requested permission
2. If the permission has no policies attached → **allow** (unrestricted)
3. If the permission has policies attached → evaluate all policies, combining results with the permission's `decision_strategy`
4. If the permission was obtained through a role or user assignment that carries a **junction policy**, evaluate that policy as an additional restriction
5. All applicable policies pass → **allow**, any required policy fails → **deny**

## Decision Strategy

When a permission has multiple policies attached, the `decision_strategy` on the permission controls how results are combined:

| Strategy | Behavior |
|---|---|
| **unanimous** (default) | All attached policies must pass |
| **affirmative** | At least one attached policy must pass |

The decision strategy is set per permission. Most built-in permissions use `unanimous` — all policies in `system.default` must pass.

## Junction Policies

Permission assignments (role-permission, user-permission) can carry their own policy via the junction table.
This **junction policy** adds an additional restriction on top of the permission's own policies.

For example, the `realm_admin` role assigns all permissions with the `system.realm-bound` junction policy.
Even though the underlying permissions use `system.default` as their policy, the junction policy further restricts
the `realm_admin` to only operate on entities that have a `realm_id`.

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
