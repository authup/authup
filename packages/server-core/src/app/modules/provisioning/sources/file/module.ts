/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import {
    ClientValidator,
    PermissionValidator,
    RealmValidator,
    RobotValidator,
    RoleValidator,
    ScopeValidator,
    UserValidator,
} from '@authup/core-kit';
import { isObject } from '@authup/kit';
import { Container } from 'confinity';
import { isProvisioningContainer } from '../../check.ts';
import type {
    ClientProvisioningContainer,
    IProvisioningSource,
    PermissionProvisioningContainer,
    ProvisioningData,
    RealmProvisioningContainer,
    RealmProvisioningRelations,
    RobotProvisioningContainer,
    RoleProvisioningContainer,
    ScopeProvisioningContainer,
    UserProvisioningContainer,
} from '../../types.ts';
import type { FileEntitySchemaImporterOptions } from './types.ts';

export class FileProvisioningSource implements IProvisioningSource {
    protected options: FileEntitySchemaImporterOptions;

    protected clientValidator : ClientValidator;

    protected robotValidator : RobotValidator;

    protected userValidator: UserValidator;

    protected realmValidator: RealmValidator;

    protected permissionValidator: PermissionValidator;

    protected roleValidator: RoleValidator;

    protected scopeValidator: ScopeValidator;

    constructor(options: FileEntitySchemaImporterOptions) {
        this.options = options;

        this.clientValidator = new ClientValidator();
        this.userValidator = new UserValidator();
        this.realmValidator = new RealmValidator();
        this.permissionValidator = new PermissionValidator();
        this.roleValidator = new RoleValidator();
        this.robotValidator = new RobotValidator();
        this.scopeValidator = new ScopeValidator();
    }

    async load(): Promise<ProvisioningData> {
        const container = new Container({
            prefix: 'authup',
            cwd: this.options.cwd,
        });

        await container.load();

        const config = container.get('schema');
        if (!isObject(config)) {
            throw new Error('Config property "schema" must be an object');
        }

        return {
            roles: await this.validateRoles(
                this.readPropertyAsArray(config, 'roles'),
            ),
            permissions: await this.validatePermissions(
                this.readPropertyAsArray(config, 'permissions'),
            ),
            scopes: await this.validateScopes(
                this.readPropertyAsArray(config, 'scopes'),
            ),
            realms: await this.validateRealms(
                this.readPropertyAsArray(config, 'realms'),
            ),
        };
    }

    // ----------------------------------------------------------

    protected async validateRoles(roles: unknown[]) : Promise<RoleProvisioningContainer[]> {
        return Promise.all(roles.map((role) => this.validateRole(role)));
    }

    protected async validateRole(container: unknown) : Promise<RoleProvisioningContainer> {
        if (!isProvisioningContainer(container)) {
            throw new Error('Role is not embedded as provisioning container.');
        }

        const data = await this.roleValidator.run(container.data);

        return {
            data,
            relations: container.relations, // todo: validate
        };
    }

    // ----------------------------------------------------------

    protected async validatePermissions(entities: unknown[]) : Promise<PermissionProvisioningContainer[]> {
        return Promise.all(entities.map((entity) => this.validatePermission(entity)));
    }

    protected async validatePermission(container: unknown) : Promise<PermissionProvisioningContainer> {
        if (!isProvisioningContainer(container)) {
            throw new Error('Permission is not embedded as provisioning container.');
        }

        const data = await this.permissionValidator.run(container.data);

        return {
            data,
            relations: container.relations, // todo: validate
        };
    }

    // ----------------------------------------------------------

    protected async validateScopes(entities: unknown[]) : Promise<ScopeProvisioningContainer[]> {
        return Promise.all(entities.map((entity) => this.validateScope(entity)));
    }

    protected async validateScope(container: unknown) : Promise<ScopeProvisioningContainer> {
        if (!isProvisioningContainer(container)) {
            throw new Error('Permission is not embedded as provisioning container.');
        }

        const data = await this.scopeValidator.run(container.data);

        return {
            data,
            relations: container.relations, // todo: validate
        };
    }

    // ----------------------------------------------------------

    protected async validateRealms(entities: unknown[]) : Promise<RealmProvisioningContainer[]> {
        return Promise.all(entities.map((entity) => this.validateRealm(entity)));
    }

    protected async validateRealm(container: unknown) : Promise<RealmProvisioningContainer> {
        if (!isProvisioningContainer<Realm, RealmProvisioningRelations>(container)) {
            throw new Error('Realm is not embedded as provisioning container.');
        }

        const data = await this.permissionValidator.run(container.data);
        // todo: validate
        const { relations } = container;

        if (relations) {
            if (relations.roles) {
                relations.roles = await this.validateRoles(relations.roles);
            }

            if (relations.permissions) {
                relations.permissions = await this.validatePermissions(relations.permissions);
            }

            if (relations.users) {
                relations.users = await this.validateUsers(relations.users);
            }

            if (relations.clients) {
                relations.clients = await this.validateClients(relations.clients);
            }

            if (relations.robots) {
                relations.robots = await this.validateRobots(relations.robots);
            }
        }

        return {
            data,
            relations,
        };
    }

    // ----------------------------------------------------------

    protected async validateUsers(entities: unknown[]) : Promise<UserProvisioningContainer[]> {
        return Promise.all(entities.map((entity) => this.validateUser(entity)));
    }

    protected async validateUser(container: unknown) : Promise<UserProvisioningContainer> {
        if (!isProvisioningContainer(container)) {
            throw new Error('User is not embedded as provisioning container.');
        }

        const data = await this.userValidator.run(container.data);

        return {
            data,
            relations: container.relations, // todo: validate
        };
    }

    // ----------------------------------------------------------

    protected async validateClients(entities: unknown[]) : Promise<ClientProvisioningContainer[]> {
        return Promise.all(entities.map((entity) => this.validateClient(entity)));
    }

    protected async validateClient(container: unknown) : Promise<ClientProvisioningContainer> {
        if (!isProvisioningContainer(container)) {
            throw new Error('Client is not embedded as provisioning container.');
        }

        const data = await this.clientValidator.run(container.data);

        // todo: rough validation
        const { relations } = container;
        if (relations) {
            if (relations.roles) {
                relations.roles = await this.validateRoles(relations.roles);
            }

            if (relations.permissions) {
                relations.permissions = await this.validatePermissions(relations.permissions);
            }
        }

        return {
            data,
            relations: container.relations, // todo: validate
        };
    }

    // ----------------------------------------------------------

    protected async validateRobots(entities: unknown[]) : Promise<RobotProvisioningContainer[]> {
        return Promise.all(entities.map((entity) => this.validateRobot(entity)));
    }

    protected async validateRobot(container: unknown) : Promise<RobotProvisioningContainer> {
        if (!isProvisioningContainer(container)) {
            throw new Error('Robot is not embedded as provisioning container.');
        }

        const data = await this.robotValidator.run(container.data);

        return {
            data,
            relations: container.relations, // todo: validate
        };
    }

    // ----------------------------------------------------------

    private readPropertyAsArray(input: Record<string, any>, propertyKey: string): unknown[] {
        return input[propertyKey] && Array.isArray(input[propertyKey]) ? input[propertyKey] : [];
    }
}
