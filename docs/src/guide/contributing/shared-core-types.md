# Core Types

`@authup/server-kit` exports a small set of shared server-side primitives under its top-level entry. These are the contracts every server-side app built on Authup implements (repositories) or consumes (services). They live in `packages/server-kit/src/core/`.

## `IEntityRepository`

The port interface every entity repository adapter must implement. Per-entity contracts (e.g. `IRoleRepository`, `IUserRepository`) extend it with their own additions.

**Type**
```ts
import type { ObjectLiteral } from '@authup/kit';
import type { PaginationParseOutput } from 'rapiq';

export type EntityRepositoryFindManyResult<T> = {
    data: T[],
    meta: PaginationParseOutput & {
        total: number
    }
};

export interface IEntityRepository<T extends ObjectLiteral = ObjectLiteral> {
    findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<T>>;
    findOneById(id: string): Promise<T | null>;
    findOneByName(name: string, realm?: string): Promise<T | null>;
    findOneByIdOrName(idOrName: string, realm?: string): Promise<T | null>;
    findManyBy(where: Record<string, any>): Promise<T[]>;
    findOneBy(where: Record<string, any>): Promise<T | null>;
    create(data: Partial<T>): T;
    merge(entity: T, data: Partial<T>): T;
    save(entity: T): Promise<T>;
    remove(entity: T): Promise<void>;
    validateJoinColumns(data: Partial<T>): Promise<void>;
}
```

**Example**
```ts
import type { IEntityRepository } from '@authup/server-kit';
import type { Role } from '@authup/core-kit';

export interface IRoleRepository extends IEntityRepository<Role> {
    checkUniqueness(data: Partial<Role>, existing?: Role): Promise<void>;
}
```

## `ActorContext`

The actor context an entity service receives instead of a raw HTTP request. It carries the caller's permission evaluator and (optional) identity, decoupling business logic from transport.

**Type**
```ts
import type { IPermissionEvaluator } from '@authup/access';
import type { Identity } from '@authup/core-kit';

export type ActorContext = {
    permissionEvaluator: IPermissionEvaluator;
    identity?: Identity;
};
```

- `permissionEvaluator` — evaluates permissions (`evaluate`, `preEvaluate`, `evaluateOneOf`, `preEvaluateOneOf`).
- `identity` — the actor's identity (`user`, `client`, `robot`), present on authenticated requests.

**Example**
```ts
import type { ActorContext } from '@authup/server-kit';

async function getOne(idOrName: string, actor: ActorContext) {
    await actor.permissionEvaluator.preEvaluate({ name: 'role.read' });
    // ...
}
```

## `AbstractEntityService`

Base class for entity services. Provides two protected helpers used by realm-aware services.

**Type**
```ts
export abstract class AbstractEntityService {
    protected isActorMasterRealmMember(actor: ActorContext): boolean;
    protected getActorRealmId(actor: ActorContext): string | undefined;
}
```

- `isActorMasterRealmMember(actor)` — `true` when the actor's identity belongs to the master realm.
- `getActorRealmId(actor)` — extracts the actor's realm id, checking both `data.realmId` and `data.realm.id`.

**Example**
```ts
import { AbstractEntityService } from '@authup/server-kit';
import type { ActorContext } from '@authup/server-kit';

export class RoleService extends AbstractEntityService {
    async create(data: Record<string, any>, actor: ActorContext) {
        if (!data.realmId && actor.identity) {
            data.realmId = this.getActorRealmId(actor) || null;
        }
        // ...
    }
}
```
