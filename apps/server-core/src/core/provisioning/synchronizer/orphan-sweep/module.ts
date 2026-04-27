/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { 
    Permission, 
    Policy, 
    Role, 
    Scope, 
} from '@authup/core-kit';
import type { IPermissionRepository, IPolicyRepository, IRoleRepository } from '../../../entities/index.ts';
import type { IClientPermissionRepository } from '../../../entities/client-permission/types.ts';
import type { IPermissionPolicyRepository } from '../../../entities/permission-policy/types.ts';
import type { IRobotPermissionRepository } from '../../../entities/robot-permission/types.ts';
import type { IRolePermissionRepository } from '../../../entities/role-permission/types.ts';
import type { IScopeRepository } from '../../../entities/scope/types.ts';
import type { IUserPermissionRepository } from '../../../entities/user-permission/types.ts';
import type { PermissionProvisioningEntity } from '../../entities/permission/index.ts';
import type { PolicyProvisioningEntity } from '../../entities/policy/index.ts';
import type { RoleProvisioningEntity } from '../../entities/role/index.ts';
import type { ScopeProvisioningEntity } from '../../entities/scope/index.ts';
import type { RootProvisioningEntity } from '../../entities/root/index.ts';
import type { OrphanSweepResult, OrphanSweepSynchronizerContext } from './types.ts';

export class OrphanSweepSynchronizer {
    protected policyRepository: IPolicyRepository;

    protected permissionRepository: IPermissionRepository;

    protected permissionPolicyRepository: IPermissionPolicyRepository;

    protected rolePermissionRepository?: IRolePermissionRepository;

    protected userPermissionRepository?: IUserPermissionRepository;

    protected clientPermissionRepository?: IClientPermissionRepository;

    protected robotPermissionRepository?: IRobotPermissionRepository;

    protected roleRepository: IRoleRepository;

    protected scopeRepository: IScopeRepository;

    protected defaultPolicyName?: string;

    constructor(ctx: OrphanSweepSynchronizerContext) {
        this.policyRepository = ctx.policyRepository;
        this.permissionRepository = ctx.permissionRepository;
        this.permissionPolicyRepository = ctx.permissionPolicyRepository;
        this.rolePermissionRepository = ctx.rolePermissionRepository;
        this.userPermissionRepository = ctx.userPermissionRepository;
        this.clientPermissionRepository = ctx.clientPermissionRepository;
        this.robotPermissionRepository = ctx.robotPermissionRepository;
        this.roleRepository = ctx.roleRepository;
        this.scopeRepository = ctx.scopeRepository;
        this.defaultPolicyName = ctx.defaultPolicyName;
    }

    async sweep(data: RootProvisioningEntity): Promise<OrphanSweepResult> {
        const result: OrphanSweepResult = {
            policies: [],
            permissions: [],
            roles: [],
            scopes: [],
        };

        result.policies = await this.sweepPolicies(data.policies, data.permissions);
        result.permissions = await this.sweepPermissions(data.permissions);
        result.roles = await this.sweepRoles(data.roles);
        result.scopes = await this.sweepScopes(data.scopes);

        return result;
    }

    private async sweepPolicies(
        declared?: PolicyProvisioningEntity[],
        declaredPermissions?: PermissionProvisioningEntity[],
    ): Promise<string[]> {
        const declaredNames = collectDeclaredPolicyNames(declared);
        if (declaredNames.size === 0) {
            return [];
        }

        const persisted = (await this.policyRepository.findManyBy({
            built_in: true,
            realm_id: null,
            parent_id: null,
        })) as Policy[];

        const orphans = persisted.filter((p) => !declaredNames.has(p.name));
        if (orphans.length === 0) {
            return [];
        }

        for (const orphan of orphans) {
            await this.assertNoLayer2References(orphan);
        }

        const affectedPermissionIds = new Set<string>();
        for (const orphan of orphans) {
            const junctions = await this.permissionPolicyRepository.findManyBy({ policy_id: orphan.id });
            for (const junction of junctions) {
                affectedPermissionIds.add(junction.permission_id);
                await this.permissionPolicyRepository.remove(junction);
            }
        }

        const removed: string[] = [];
        for (const orphan of orphans) {
            await this.policyRepository.deleteFromTree(orphan);
            removed.push(orphan.name);
        }

        if (affectedPermissionIds.size > 0) {
            await this.reassignDeclaredPolicies(affectedPermissionIds, declaredPermissions);
        }

        return removed;
    }

    private async assertNoLayer2References(orphan: Policy): Promise<void> {
        const sources: { name: string; repo?: { findManyBy(where: Record<string, any>): Promise<unknown[]> } }[] = [
            { name: 'role-permission', repo: this.rolePermissionRepository },
            { name: 'user-permission', repo: this.userPermissionRepository },
            { name: 'client-permission', repo: this.clientPermissionRepository },
            { name: 'robot-permission', repo: this.robotPermissionRepository },
        ];

        const refs: { name: string; count: number }[] = [];
        for (const { name, repo } of sources) {
            if (!repo) {
                continue;
            }
            const found = await repo.findManyBy({ policy_id: orphan.id });
            if (found.length > 0) {
                refs.push({ name, count: found.length });
            }
        }

        if (refs.length === 0) {
            return;
        }

        const summary = refs.map((r) => `${r.name}=${r.count}`).join(', ');
        throw new Error(
            `Provisioning: refusing to remove built-in policy '${orphan.name}': ` +
            `${refs.reduce((acc, r) => acc + r.count, 0)} Layer 2 reference(s) found (${summary}). ` +
            'These would be silently unrestricted by FK SET NULL. ' +
            'Re-declare the policy in the source, or migrate the references first.',
        );
    }

    private async reassignDeclaredPolicies(
        affectedPermissionIds: Set<string>,
        declaredPermissions?: PermissionProvisioningEntity[],
    ): Promise<void> {
        const declaredByName = new Map<string, string[]>();
        if (declaredPermissions) {
            for (const entry of declaredPermissions) {
                if (entry.attributes?.name && entry.relations?.policies) {
                    declaredByName.set(entry.attributes.name, entry.relations.policies);
                }
            }
        }

        for (const permissionId of affectedPermissionIds) {
            const remaining = await this.permissionPolicyRepository.findManyBy({ permission_id: permissionId });
            if (remaining.length > 0) {
                continue;
            }

            const permission = await this.permissionRepository.findOneById(permissionId);
            if (!permission) {
                continue;
            }

            const policyNames = declaredByName.get(permission.name) ??
                (this.defaultPolicyName ? [this.defaultPolicyName] : []);

            for (const policyName of policyNames) {
                const policy = await this.policyRepository.findOneByName(policyName);
                if (!policy) {
                    continue;
                }

                const entry = this.permissionPolicyRepository.create({
                    permission_id: permission.id,
                    permission_realm_id: permission.realm_id,
                    policy_id: policy.id,
                    policy_realm_id: policy.realm_id,
                });
                await this.permissionPolicyRepository.save(entry);
            }
        }
    }

    private async sweepPermissions(declared?: PermissionProvisioningEntity[]): Promise<string[]> {
        const declaredNames = collectDeclaredAttributeNames(declared);
        if (declaredNames.size === 0) {
            return [];
        }

        const persisted = (await this.permissionRepository.findManyBy({
            built_in: true,
            realm_id: null,
            client_id: null,
        })) as Permission[];

        return this.removeOrphans(persisted, declaredNames, (e) => this.permissionRepository.remove(e));
    }

    private async sweepRoles(declared?: RoleProvisioningEntity[]): Promise<string[]> {
        const declaredNames = collectDeclaredAttributeNames(declared);
        if (declaredNames.size === 0) {
            return [];
        }

        const persisted = (await this.roleRepository.findManyBy({
            built_in: true,
            realm_id: null,
            client_id: null,
        })) as Role[];

        return this.removeOrphans(persisted, declaredNames, (e) => this.roleRepository.remove(e));
    }

    private async sweepScopes(declared?: ScopeProvisioningEntity[]): Promise<string[]> {
        const declaredNames = collectDeclaredAttributeNames(declared);
        if (declaredNames.size === 0) {
            return [];
        }

        const persisted = (await this.scopeRepository.findManyBy({
            built_in: true,
            realm_id: null,
        })) as Scope[];

        return this.removeOrphans(persisted, declaredNames, (e) => this.scopeRepository.remove(e));
    }

    private async removeOrphans<T extends { name: string }>(
        persisted: T[],
        declaredNames: Set<string>,
        remove: (entity: T) => Promise<void>,
    ): Promise<string[]> {
        const orphans = persisted.filter((p) => !declaredNames.has(p.name));
        const removed: string[] = [];
        for (const orphan of orphans) {
            await remove(orphan);
            removed.push(orphan.name);
        }
        return removed;
    }
}

function collectDeclaredPolicyNames(declared?: PolicyProvisioningEntity[]): Set<string> {
    const names = new Set<string>();
    if (!declared) {
        return names;
    }
    for (const entry of declared) {
        if (entry.attributes?.name) {
            names.add(entry.attributes.name);
        }
    }
    return names;
}

function collectDeclaredAttributeNames(
    declared?: { attributes?: { name?: string } }[],
): Set<string> {
    const names = new Set<string>();
    if (!declared) {
        return names;
    }
    for (const entry of declared) {
        if (entry.attributes?.name) {
            names.add(entry.attributes.name);
        }
    }
    return names;
}
