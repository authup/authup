/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    PermissionError,
    evaluateRecord,
    evaluateRecordOneOf,
    reachesRecordOneOf,
} from '@authup/access';
import { inArray } from '@rapiq/core';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { PermissionName, UserRoleValidator } from '@authup/core-kit';
import type { UserRole } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { IUserRoleRepository, IUserRoleService } from './types.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { userRoleSchema } from './schema.ts';

const READ_PERMISSION_NAMES = [
    PermissionName.USER_ROLE_READ,
    PermissionName.USER_ROLE_CREATE,
    PermissionName.USER_ROLE_UPDATE,
];

export type UserRoleServiceContext = {
    repository: IUserRoleRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class UserRoleService extends JunctionEntityService implements IUserRoleService {
    protected readonly ownerRealmKey = 'userRealmId';

    protected repository: IUserRoleRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: UserRoleValidator;

    constructor(ctx: UserRoleServiceContext) {
        super();
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new UserRoleValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<UserRole>> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        let parsed = await decodeQuery(query, { schema: userRoleSchema, actor });

        // The realm reach of the grant, compiled into a row condition and lowered onto
        // the OWNER realm key — a junction row carries no `realmId` (issue #3594).
        const compiled = await actor.permissionEvaluator.compile({
            name: READ_PERMISSION_NAMES,
            realmAttributeName: this.ownerRealmKey,
        });
        if (compiled.verdict === 'deny') {
            parsed = appendQueryConditions(parsed, inArray('id', []));
        } else if (compiled.verdict === 'conditional') {
            parsed = appendQueryConditions(parsed, compiled.condition);
        }

        const { data: entities, meta } = await this.repository.findMany(parsed);

        if (compiled.verdict !== 'post') {
            return { data: entities, meta };
        }

        const data: UserRole[] = [];
        let { total } = meta;

        for (const entity of entities) {
            const reached = await reachesRecordOneOf(actor.permissionEvaluator, {
                name: READ_PERMISSION_NAMES,
                realm: this.junctionResourceRealm(entity),
                data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity) },
            });
            if (!reached) {
                total -= 1;
                continue;
            }

            data.push(entity);
        }

        return { data, meta: { ...meta, total } };
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<UserRole> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await evaluateRecordOneOf(actor.permissionEvaluator, {
            name: READ_PERMISSION_NAMES,
            realm: this.junctionResourceRealm(entity),
            data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity) },
        });

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<UserRole> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_ROLE_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            roleId: validated.roleId,
            userId: validated.userId,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'user-role' });
        }

        if (validated.role) {
            validated.roleRealmId = validated.role.realmId;
        }

        if (validated.user) {
            validated.userRealmId = validated.user.realmId;
        }

        if (validated.role && actor.identity) {
            const hasPermissions = await this.identityPermissionProvider.isSuperset(
                await this.getActorGrants(actor),
                await this.identityPermissionProvider.getFor({
                    type: 'role',
                    id: validated.roleId,
                }),
            );
            if (!hasPermissions) {
                throw new PermissionError({ message: 'You don\'t own the required permissions.' });
            }
        }

        // Stamp the owner (user) realm so the realmScope factor gates cross-realm writes.
        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.USER_ROLE_CREATE,
            realm: this.junctionResourceRealm(validated),
            data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(validated) },
        });

        let entity = this.repository.create(validated);
        entity = await this.repository.save(entity);

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<UserRole> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        // Stamp the owner (user) realm so the realmScope factor gates cross-realm writes.
        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.USER_ROLE_DELETE,
            realm: this.junctionResourceRealm(entity),
            data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity) },
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
