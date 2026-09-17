/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PermissionError, definePolicyData } from '@authup/access';
import { inArray } from '@rapiq/core';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { ClientRoleValidator, PermissionName } from '@authup/core-kit';
import type { ClientRole } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { IClientRoleRepository, IClientRoleService } from './types.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { clientRoleSchema } from './schema.ts';

const READ_PERMISSION_NAMES = [
    PermissionName.CLIENT_ROLE_READ,
    PermissionName.CLIENT_ROLE_UPDATE,
    PermissionName.CLIENT_ROLE_DELETE,
];

export type ClientRoleServiceContext = {
    repository: IClientRoleRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class ClientRoleService extends JunctionEntityService implements IClientRoleService {
    protected readonly ownerRealmKey = 'clientRealmId';

    protected repository: IClientRoleRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: ClientRoleValidator;

    constructor(ctx: ClientRoleServiceContext) {
        super();
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new ClientRoleValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<ClientRole>> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        let parsed = await decodeQuery(query, { schema: clientRoleSchema, actor });

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

        const data: ClientRole[] = [];
        let { total } = meta;

        for (const entity of entities) {
            try {
                await actor.permissionEvaluator.evaluateOneOf({
                    name: READ_PERMISSION_NAMES,
                    data: definePolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity),
                        [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(entity),
                    }),
                });
                data.push(entity);
            } catch {
                total -= 1;
            }
        }

        return { data, meta: { ...meta, total } };
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<ClientRole> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluateOneOf({
            name: READ_PERMISSION_NAMES,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(entity),
            }),
        });

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<ClientRole> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_ROLE_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            roleId: validated.roleId,
            clientId: validated.clientId,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'client-role' });
        }

        if (validated.role) {
            validated.roleRealmId = validated.role.realmId;
        }

        if (validated.client) {
            validated.clientRealmId = validated.client.realmId;
        }

        if (validated.role && actor.identity) {
            const hasPermissions = await this.identityPermissionProvider.isSuperset(
                await this.getActorGrants(actor),
                await this.identityPermissionProvider.getFor({
                    type: 'role',
                    id: validated.roleId,
                    clientId: validated.role.clientId,
                }),
            );
            if (!hasPermissions) {
                throw new PermissionError({ message: 'You don\'t own the required permissions.' });
            }
        }

        // Stamp the owner (client) realm so the realmScope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_ROLE_CREATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(validated),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(validated),
            }),
        });

        let entity = this.repository.create(validated);
        entity = await this.repository.save(entity);

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<ClientRole> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        // Stamp the owner (client) realm so the realmScope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_ROLE_DELETE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(entity),
            }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
