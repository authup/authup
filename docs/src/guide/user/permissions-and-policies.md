# Permissions & Policies

In Authup, permissions and policies are two central concepts for controlling access within the system.
While permissions represent the basic ability to perform an action, policies enable detailed control over the conditions under which a permission is actually granted.

## Security Model

Authup implements an **allow-by-default** authorization model:

- A **permission** represents the ability to perform an action.
- Permissions are **not restricted by default**.
- **Policies** restrict permissions.
- If no policy is assigned to a permission (`policy_id = null`), the permission is **publicly executable**.

This applies to authenticated users, anonymous users, and machine clients alike.
Access restrictions must always be expressed through explicit policies.

## Permissions

A permission fundamentally describes an action on a subject/object.
It exists independently of roles and users.

Examples:
- `user_read`
- `user_update`

A permission may be:
- **unrestricted** (`policy_id = null`) — globally executable by anyone
- **restricted** (`policy_id` references a policy) — only executable when the policy conditions are satisfied

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

System policies:
- Are marked as `built_in` and cannot be modified or deleted via the API
- Are synchronized to the database on every startup

### Per-Permission Policy Assignment

Permissions may reference:
- `system.default` — the standard restriction (most built-in permissions)
- A **custom policy** — for permissions needing different restrictions
- `null` — unrestricted (publicly executable)

The system only manages built-in policies. Users can create and assign custom policies via the API.

## Permission Evaluation

When a permission is checked, the following flow applies:

1. Look up the requested permission
2. If the permission has no policy (`policy_id = null`) → **allow** (unrestricted)
3. If the permission has a policy → evaluate the policy tree against the request context
4. Policy passes → **allow**, policy fails → **deny**
