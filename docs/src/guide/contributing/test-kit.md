# Test Kit

`@authup/server-test-kit` ships shared test fakes for server-side packages and apps that build on `@authup/server-kit`. The fakes are framework-agnostic (vitest-friendly, no test-runner globals) and implement the same ports your production code uses.

## Installation

Add the package as a dev dependency.

```sh
npm install @authup/server-test-kit --save-dev
```

Peer requirements: `@authup/access`, `@authup/core-kit`, `@authup/kit`, `@authup/server-kit`.

## `FakeEntityRepository`

In-memory implementation of `IEntityRepository<T>` backed by a plain array. Useful for service-level tests where you want to exercise business logic without spinning up a database.

**Type**
```ts
import type { ObjectLiteral } from '@authup/kit';
import type { IEntityRepository } from '@authup/server-kit';

export class FakeEntityRepository<T extends ObjectLiteral> implements IEntityRepository<T> {
    seed(entity: Partial<T>): T;
    seed(entities: Partial<T>[]): T[];
    getAll(): T[];
    clear(): void;
    onValidateJoinColumns(handler: (data: Partial<T>) => void | Promise<void>): void;
}
```

**Example**
```ts
import { FakeEntityRepository } from '@authup/server-test-kit';

const repo = new FakeEntityRepository<{ id: string; name: string }>();
repo.seed({ id: 'a', name: 'foo' });
const found = await repo.findOneById('a');
```

Extend `FakeEntityRepository` to satisfy per-entity ports:

```ts
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { IRoleRepository } from './role/types';
import type { Role } from '@authup/core-kit';

export class FakeRoleRepository extends FakeEntityRepository<Role> implements IRoleRepository {
    async checkUniqueness(): Promise<void> { /* no-op */ }
}
```

## `FakePermissionEvaluator`

In-memory `IPermissionEvaluator` that records every call and lets you script behavior.

**Type**
```ts
import type { IPermissionEvaluator, PermissionEvaluationContext } from '@authup/access';

export type EvaluatorMethodName = 'evaluate' | 'evaluateOneOf' | 'preEvaluate' | 'preEvaluateOneOf';
export type EvaluatorCall = { method: EvaluatorMethodName; ctx: PermissionEvaluationContext };
export type EvaluatorBehavior = (call: EvaluatorCall) => void | Promise<void>;

export class FakePermissionEvaluator implements IPermissionEvaluator {
    evaluateCalls: PermissionEvaluationContext[];
    evaluateOneOfCalls: PermissionEvaluationContext[];
    preEvaluateCalls: PermissionEvaluationContext[];
    preEvaluateOneOfCalls: PermissionEvaluationContext[];

    constructor(behavior?: EvaluatorBehavior);
    setBehavior(behavior: EvaluatorBehavior): void;
    denyAll(error?: Error): void;
    deny(method: EvaluatorMethodName, error?: Error): void;
}
```

**Example**
```ts
import { FakePermissionEvaluator } from '@authup/server-test-kit';

const evaluator = new FakePermissionEvaluator();
await service.create(data, { permissionEvaluator: evaluator });

expect(evaluator.preEvaluateCalls).toEqual([{ name: 'role.create' }]);
```

Scope a denial to a single evaluator method:

```ts
const evaluator = new FakePermissionEvaluator();
evaluator.deny('evaluate'); // preEvaluate still passes
```

## Actor factories

Pre-built `FakeActorContext` instances for the common test scenarios.

**Type**
```ts
import type { ActorContext } from '@authup/server-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';

export type FakeActorContext = ActorContext & {
    permissionEvaluator: FakePermissionEvaluator;
};

declare function createAllowAllActor(): FakeActorContext;
declare function createDenyAllActor(): FakeActorContext;
declare function createMasterRealmActor(realmId?: string): FakeActorContext;
declare function createNonMasterRealmActor(realmId?: string): FakeActorContext;
```

| Factory | Permission behavior | Identity |
|---|---|---|
| `createAllowAllActor()` | Every call resolves | None |
| `createDenyAllActor()` | Every call throws `PermissionError.denied('test')` | None |
| `createMasterRealmActor(realmId?)` | Every call resolves | User in the master realm |
| `createNonMasterRealmActor(realmId?)` | Every call resolves | User in a `test-realm` |

**Example**
```ts
import {
    createAllowAllActor,
    createMasterRealmActor,
} from '@authup/server-test-kit';

await service.create(data, createAllowAllActor());
await service.create(data, createMasterRealmActor());
```
