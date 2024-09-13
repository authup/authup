/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RealmMatchPolicy } from '@authup/kit';
import {
    BuiltInPolicyType,
} from '@authup/kit';
import type { DataSource } from 'typeorm';
import type { PolicyEntity } from '../../domains';
import { PolicyRepository } from '../../domains';
import { BuiltInPolicyName } from '../../security/policy/constants';

export class PolicyDefaultService {
    protected dataSource: DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
    }

    async get() : Promise<PolicyEntity> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const repository = new PolicyRepository(queryRunner.manager);

            const entity = await this.getComposite(repository);

            await queryRunner.commitTransaction();

            return entity;
        } catch (e) {
            await queryRunner.rollbackTransaction();

            throw e;
        } finally {
            await queryRunner.release();
        }
    }

    protected async getComposite(repository: PolicyRepository) : Promise<PolicyEntity> {
        const criteria : Partial<PolicyEntity> = {
            built_in: true,
            type: BuiltInPolicyType.COMPOSITE,
            name: BuiltInPolicyType.COMPOSITE,
        };
        let entity = await repository.findOne({
            where: criteria,
            relations: ['children'],
        });
        if (!entity) {
            entity = repository.create(criteria);
            await repository.save(entity);
        }

        let children : PolicyEntity[];
        if (entity) {
            children = entity.children || [];
        } else {
            children = [];
        }

        let index = children.findIndex(
            (el) => el.type === BuiltInPolicyType.REALM_MATCH &&
                el.name === BuiltInPolicyName.REALM_MATCH &&
                !!el.built_in,
        );

        if (index === -1) {
            const realmMatch = await this.getRealmMatch(repository, entity);
            children.push(realmMatch);
        }

        index = children.findIndex(
            (el) => el.type === BuiltInPolicyType.IDENTITY &&
                el.name === BuiltInPolicyName.IDENTITY &&
                !!el.built_in,
        );
        if (index === -1) {
            const identity = await this.getIdentity(repository, entity);
            children.push(identity);
        }

        index = children.findIndex(
            (el) => el.type === BuiltInPolicyType.PERMISSION_BINDING &&
                el.name === BuiltInPolicyName.PERMISSION_BINDING &&
                !!el.built_in,
        );
        if (index === -1) {
            const identity = await this.getPermissionBinding(repository, entity);
            children.push(identity);
        }

        return entity;
    }

    protected async getIdentity(
        repository: PolicyRepository,
        parent: PolicyEntity,
    ) : Promise<PolicyEntity> {
        const criteria : Partial<PolicyEntity> = {
            built_in: true,
            type: BuiltInPolicyType.REALM_MATCH,
            name: BuiltInPolicyType.REALM_MATCH,
        };
        let entity = await repository.findOneBy(criteria);

        if (entity) {
            return entity;
        }

        entity = repository.create(criteria);
        entity.parent = parent;

        await repository.save(entity);

        return entity;
    }

    protected async getRealmMatch(
        repository: PolicyRepository,
        parent: PolicyEntity,
    ) : Promise<PolicyEntity> {
        const criteria : Partial<PolicyEntity> = {
            built_in: true,
            type: BuiltInPolicyType.REALM_MATCH,
            name: BuiltInPolicyName.REALM_MATCH,
        };
        let entity = await repository.findOneBy(criteria);

        if (entity) {
            return entity;
        }

        const attributes : RealmMatchPolicy = {
            attributeName: ['realm_id'],
            attributeNameStrict: false,
            identityMasterMatchAll: true,
        };

        entity = repository.create(criteria);
        entity.parent = parent;

        await repository.saveWithAttributes(entity, attributes);

        return entity;
    }

    protected async getPermissionBinding(
        repository: PolicyRepository,
        parent: PolicyEntity,
    ) : Promise<PolicyEntity> {
        const criteria : Partial<PolicyEntity> = {
            built_in: true,
            type: BuiltInPolicyType.PERMISSION_BINDING,
            name: BuiltInPolicyName.PERMISSION_BINDING,
        };
        let entity = await repository.findOneBy(criteria);

        if (entity) {
            return entity;
        }

        entity = repository.create(criteria);
        entity.parent = parent;

        await repository.saveWithAttributes(entity);

        return entity;
    }
}
