<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-test-kit</h1>

<p align="center">
    <b>In-memory fakes for testing services built on @authup/server-kit, without a database or HTTP.</b><br>
    A fake repository, a recording permission evaluator and ready-made actors.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-test-kit"><img src="https://img.shields.io/npm/v/@authup/server-test-kit" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

[`server-core`](https://github.com/authup/authup/tree/master/apps/server-core)'s service-level tests construct its entity services with these fakes: the service runs its real permission gates, validation and realm defaulting against an array instead of a database. Install it as a development dependency when you test a service of your own that takes an `IEntityRepository` and an `ActorContext` from [`@authup/server-kit`](https://github.com/authup/authup/tree/master/packages/server-kit). The fakes import no test runner, so they work with vitest, jest or `node:test`.

## Installation

```shell
npm install --save-dev @authup/server-test-kit
```

The package is ESM only and needs Node.js `^22.13.0 || ^23.5.0 || >=24.0.0`.

## Usage

### Fake a repository and an actor

```typescript
import type { Role } from '@authup/core-kit';
import { FakeEntityRepository, createAllowAllActor, createDenyAllActor } from '@authup/server-test-kit';
import { expect, it } from 'vitest';
import { RoleService } from '../src/role/service';

it('reads a role through the permission gate', async () => {
    const repository = new FakeEntityRepository<Role>({ defaults: { realmId: null } });
    const role = repository.seed({ name: 'editor' });

    const actor = createAllowAllActor();
    const service = new RoleService({ repository });

    await expect(service.getOne(role.id, actor)).resolves.toEqual(role);
    expect(actor.permissionEvaluator.evaluateCalls).toHaveLength(1);
});

it('refuses without permission', async () => {
    const repository = new FakeEntityRepository<Role>();
    const role = repository.seed({ name: 'editor' });

    await expect(new RoleService({ repository }).getOne(role.id, createDenyAllActor())).rejects.toThrow();
});
```

- **`seed` adds rows directly**, one or an array, giving each a random `id` and the `defaults` you passed to the constructor. Use `defaults` for nullable columns (`realmId: null`) that a database row would always carry.
- **`findMany` ignores the query** and returns every row with `meta: { total, offset: 0, limit: 50 }`. Filtering, sorting and paging are the real adapter's job; test them against a database.
- **`findOneBy` and `findManyBy` match by strict equality** on every key of the `where` object. `findOneByIdOrName` treats a UUID as an id and anything else as a name, optionally within a realm.
- **`checkUniqueness` is a no-op** and `validateJoinColumns` calls the handler you set with `onValidateJoinColumns`, if any. Subclass the repository to add the extra methods of your entity's port.

### Shape the permission evaluator

```typescript
import { PermissionError } from '@authup/access';
import { createNonMasterRealmActor } from '@authup/server-test-kit';

const actor = createNonMasterRealmActor();

actor.permissionEvaluator.deny('evaluate', PermissionError.denied('role_read'));
actor.permissionEvaluator.setCompileResult({ verdict: 'allow' });
actor.permissionEvaluator.setBehavior(({ method, ctx }) => {
    if (method === 'preEvaluate' && ctx.name === 'role_delete') {
        throw PermissionError.denied(ctx.name);
    }
});
```

`FakePermissionEvaluator` records every call in `evaluateCalls`, `evaluateOneOfCalls`, `preEvaluateCalls`, `preEvaluateOneOfCalls` and `compileCalls`, and passes each call to its behavior function, which permits by not throwing. `deny(method)` wraps the current behavior so that one method throws; `denyAll()` replaces it. `compile` answers `{ verdict: 'post' }` until `setCompileResult` says otherwise, so a service under test takes its per-row evaluation path by default.

## API

| Export | Kind | Purpose |
|---|---|---|
| `FakeEntityRepository<T>` | class | In-memory `IEntityRepository`, plus `seed`, `getAll`, `clear`, `onValidateJoinColumns`, `checkUniqueness` |
| `FakePermissionEvaluator` | class | Recording `IPermissionEvaluator` with `setBehavior`, `deny`, `denyAll`, `setCompileResult` |
| `createAllowAllActor` | function | Actor without identity, every evaluation permitted |
| `createDenyAllActor` | function | Actor without identity, every evaluation refused |
| `createMasterRealmActor(realmId?)` | function | User actor in a realm named `master`, for realm-defaulting tests |
| `createNonMasterRealmActor(realmId?)` | function | User actor in a realm named `test-realm` |
| `FakeActorContext`, `FakeEntityRepositoryOptions`, `EvaluatorBehavior`, `EvaluatorCall`, `EvaluatorMethodName` | type | Shapes of the above |

The realm actors generate a random realm id unless you pass one, and carry no `grants` resolver, so a service delegating the actor's grants sees none.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
