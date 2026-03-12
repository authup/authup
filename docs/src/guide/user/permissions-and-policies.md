# Permissions & Polices

In Authup, permissions and policies are two central concepts for controlling access within the system.
While permissions represent the basic ability to perform an action, policies enable detailed control over the conditions under which a permission is actually granted.

## Permissions

A permission fundamentally describes an action on a subject/object.
It exists independently of roles and users.

Examples: 
- `user_read`
- `user_update`

However, these permissions alone are not sufficient to enable context-dependent access controls.
This is where policies come into play.

## Policies

A Policy defines a set of rules and conditions that determine whether a permission is granted in a specific context.
Each policy is configured with a set of parameters (config) and is evaluated against input data (input) provided at runtime.

A policy does not directly grant or deny access. 
Instead, it evaluates whether its conditions are satisfied based on the input. 
Policies are evaluated by policy evaluators, which implement the specific logic for each policy type.

The system provides several [built-in](../../sdks/javascript/access/policies.md) policies out of the box, covering common use cases such as time-based, identity-based, and attribute-based access control.
