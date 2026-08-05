/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ClientPermission,
    ClientRole,
    ClientScope,
    Permission,
    Role,
    Scope,
} from '@authup/core-kit';
import { pickRecord } from '@authup/kit';
import type { IClientRepository } from '../../../entities/index.ts';
import type { ClientProvisioningEntity } from '../../entities/client';
import type { PermissionProvisioningEntity } from '../../entities/permission';
import type { RoleProvisioningEntity } from '../../entities/role';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import type { IProvisioningSynchronizer } from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import { ProvisioningEntityResolver } from '../entity-resolver.ts';
import { ProvisioningJunctionSynchronizer } from '../junction-synchronizer.ts';
import type { ClientProvisioningSynchronizerContext } from './types.ts';

export class ClientProvisioningSynchronizer extends BaseProvisioningSynchronizer<ClientProvisioningEntity> {
    protected clientRepository: IClientRepository;

    protected permissionResolver: ProvisioningEntityResolver<Permission>;

    protected roleResolver: ProvisioningEntityResolver<Role>;

    protected scopeResolver: ProvisioningEntityResolver<Scope>;

    protected permissionJunction: ProvisioningJunctionSynchronizer<ClientPermission>;

    protected roleJunction: ProvisioningJunctionSynchronizer<ClientRole>;

    protected scopeJunction: ProvisioningJunctionSynchronizer<ClientScope>;

    protected permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningEntity>;

    protected roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningEntity>;

    constructor(ctx: ClientProvisioningSynchronizerContext) {
        super();

        this.clientRepository = ctx.clientRepository;

        this.permissionResolver = new ProvisioningEntityResolver(ctx.permissionRepository);
        this.roleResolver = new ProvisioningEntityResolver(ctx.roleRepository);
        this.scopeResolver = new ProvisioningEntityResolver(ctx.scopeRepository, { clientScoped: false });

        this.permissionJunction = new ProvisioningJunctionSynchronizer({
            repository: ctx.clientPermissionRepository,
            ownerKey: 'clientId',
            ownerRealmKey: 'clientRealmId',
        });
        this.roleJunction = new ProvisioningJunctionSynchronizer({
            repository: ctx.clientRoleRepository,
            ownerKey: 'clientId',
            ownerRealmKey: 'clientRealmId',
        });
        this.scopeJunction = new ProvisioningJunctionSynchronizer({
            repository: ctx.clientScopeRepository,
            ownerKey: 'clientId',
            ownerRealmKey: 'clientRealmId',
        });

        this.permissionSynchronizer = ctx.permissionSynchronizer;
        this.roleSynchronizer = ctx.roleSynchronizer;
    }

    async synchronize(input: ClientProvisioningEntity): Promise<ClientProvisioningEntity> {
        this.canonicalizeName(input.attributes);

        const strategy = normalizeEntityProvisioningStrategy(input.strategy);

        let attributes = await this.clientRepository.findOneBy({
            name: input.attributes.name,
            realmId: input.attributes.realmId || null,
        });

        if (strategy.type === ProvisioningEntityStrategyType.ABSENT) {
            if (attributes) {
                await this.clientRepository.remove(attributes);
            }
            return {
                ...input,
                attributes: attributes || input.attributes, 
            };
        }

        if (attributes) {
            switch (strategy.type) {
                case ProvisioningEntityStrategyType.MERGE:
                    attributes = this.clientRepository.merge(
                        attributes,
                        strategy.attributes ?
                            pickRecord(input.attributes, strategy.attributes) :
                            input.attributes,
                    );
                    attributes = await this.clientRepository.save(attributes);
                    break;
                case ProvisioningEntityStrategyType.REPLACE:
                    input.attributes.id = attributes.id;
                    attributes = await this.clientRepository.save(this.clientRepository.create(input.attributes));
                    break;
            }
        } else {
            attributes = await this.clientRepository.save(this.clientRepository.create(input.attributes));
        }

        // Permissions (Global + Realm)
        const permissions = [
            ...await this.permissionResolver.resolveGlobal(
                input.relations && input.relations.globalPermissions,
            ),
            ...(attributes.realmId ?
                await this.permissionResolver.resolveRealm(
                    input.relations && input.relations.realmPermissions,
                    attributes.realmId,
                ) :
                []),
        ];

        if (permissions.length > 0) {
            await this.permissionJunction.synchronize(
                attributes,
                permissions,
                'permissionId',
                'permissionRealmId',
            );
        }

        // Roles (Global + Realm)
        const roles = [
            ...await this.roleResolver.resolveGlobal(
                input.relations && input.relations.globalRoles,
            ),
            ...(attributes.realmId ?
                await this.roleResolver.resolveRealm(
                    input.relations && input.relations.realmRoles,
                    attributes.realmId,
                ) :
                []),
        ];

        if (roles.length > 0) {
            await this.roleJunction.synchronize(
                attributes,
                roles,
                'roleId',
                'roleRealmId',
            );
        }

        // Scopes (Global + Realm). The junction is the only source the
        // /authorize code-request verifier reads scopes from.
        const scopes = [
            ...await this.scopeResolver.resolveGlobal(
                input.relations && input.relations.globalScopes,
            ),
            ...(attributes.realmId ?
                await this.scopeResolver.resolveRealm(
                    input.relations && input.relations.realmScopes,
                    attributes.realmId,
                ) :
                []),
        ];

        if (scopes.length > 0) {
            await this.scopeJunction.synchronize(
                attributes,
                scopes,
                'scopeId',
                'scopeRealmId',
            );
        }

        // Containers

        if (input.relations && input.relations.permissions) {
            const children = input.relations.permissions.map((child) => {
                child.attributes.clientId = attributes.id;
                child.attributes.client = attributes;
                return child;
            });

            await this.permissionSynchronizer.synchronizeMany(children);
        }

        if (input.relations && input.relations.roles) {
            const children = input.relations.roles.map((child) => {
                child.attributes.clientId = attributes.id;
                child.attributes.client = attributes;
                return child;
            });

            await this.roleSynchronizer.synchronizeMany(children);
        }

        return {
            ...input,
            attributes,
        };
    }
}
