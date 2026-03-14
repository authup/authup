# Policy Implementation — Release N+1 (Next Release)

This document covers the cleanup phase after the transitional period from Release N.
Use alongside `.agents/*.md` (loaded via `CLAUDE.md`) for general patterns.

## Overview

Release N introduced `PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT` (default: `true`) as a transitional option to preserve backwards-compatible behavior. In Release N+1, this option is removed. Permissions created without `policy_id` are always unrestricted — explicit policy assignment is enforced by the model.

## Prerequisite

Release N must be deployed and stable. All operators who need the backwards-compatible behavior should have had time to migrate their workflows.

## Checklist

### 1. Remove Config Option

Remove `PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT` from all config files:

| File | What to remove |
|------|----------------|
| `app/modules/config/constants.ts` | `PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT` from `ConfigEnvironmentVariableName` enum |
| `app/modules/config/types.ts` | `permissionsDefaultPolicyAssignment` from `Config` type |
| `app/modules/config/parse.ts` | `permissionsDefaultPolicyAssignment` from zod schema |
| `app/modules/config/normalize.ts` | `permissionsDefaultPolicyAssignment` default value |
| `app/modules/config/read/env.ts` | `readBool(ConfigEnvironmentVariableName.PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT)` block |

### 2. Remove Auto-Assignment from Permission Creation

**a) Permission HTTP controller** (`adapters/http/controllers/entities/permission/module.ts`):
- Remove the block that checks `config.permissionsDefaultPolicyAssignment` and auto-assigns `system.default`
- Remove `IPolicyRepository` from controller context if it was only needed for this
- New permissions created without `policy_id` → `policy_id` stays `null` (unrestricted)

**b) Permission provisioning synchronizer** (`core/provisioning/synchronizer/permission/module.ts`):
- Remove the block that auto-assigns `system.default` when `policy_id` is not set on provisioning entities
- Provisioned permissions without explicit `policy_id` are unrestricted

### 3. Remove Deprecation Warning

Remove the startup deprecation warning that was logged when the config option was active.

### 4. Update Tests

- Remove tests for the config option behavior
- Verify: new permissions without `policy_id` are always unrestricted (no auto-assignment)
- Existing permissions with `policy_id = system.default` remain unchanged

### 5. Keep Everything Else

The following remain unchanged:
- `SystemPolicyName` constants in `packages/access`
- System policy provisioning synchronizer (still creates/syncs built-in policies on startup)
- Backfill logic (still runs on startup — idempotent, only affects pre-upgrade permissions)
- `PermissionDatabaseRepository.findOne()` behavior (`null` → unrestricted)
- Built-in policy API guards
- Policy tree structure

## After-State

- Permissions are capabilities, policies restrict them
- `policy_id = null` means unrestricted (publicly executable)
- Operators must explicitly assign policies to restrict permissions
- System policies (`built_in: true`) continue to be synced on startup
- No transitional config options remain
