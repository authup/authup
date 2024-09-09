/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicy, RealmMatchPolicy } from '@authup/kit';
import {
    BuiltInPolicyType,
} from '@authup/kit';
import type { DataSource } from 'typeorm';
import type { PolicyEntity } from '../../domains';
import { PolicyRepository } from '../../domains';

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
        let entity = await repository.findOneBy({
            built_in: true,
            type: BuiltInPolicyType.COMPOSITE,
            name: BuiltInPolicyType.COMPOSITE,
        });

        let children : PolicyEntity[];
        if (entity) {
            children = entity.children;
        } else {
            children = [];
        }

        let index = children.findIndex(
            (el) => el.type === BuiltInPolicyType.REALM_MATCH &&
                el.name === BuiltInPolicyType.REALM_MATCH &&
                !!el.built_in,
        );

        if (index === -1) {
            const realmMatch = await this.getRealmMatch(repository);
            children.push(realmMatch);
        }

        index = children.findIndex(
            (el) => el.type === BuiltInPolicyType.REALM_MATCH &&
                el.name === BuiltInPolicyType.REALM_MATCH &&
                !!el.built_in,
        );
        if (index === -1) {
            const identity = await this.getIdentity(repository);
            children.push(identity);
        }

        // todo: member policy is missing...

        if (!entity) {
            entity = repository.create({
                children,
            });
        }

        await repository.save(entity);

        return entity;
    }

    protected async getIdentity(repository: PolicyRepository) : Promise<PolicyEntity> {
        let entity = await repository.findOneBy({
            built_in: true,
            type: BuiltInPolicyType.REALM_MATCH,
            name: BuiltInPolicyType.REALM_MATCH,
        });

        if (entity) {
            return entity;
        }

        entity = repository.create({
            built_in: true,
            type: BuiltInPolicyType.IDENTITY,
            name: BuiltInPolicyType.IDENTITY,
        });

        const attributes : IdentityPolicy = {

        };

        await repository.saveWithAttributes(entity, attributes);

        return entity;
    }

    protected async getRealmMatch(repository: PolicyRepository) : Promise<PolicyEntity> {
        let entity = await repository.findOneBy({
            built_in: true,
            type: BuiltInPolicyType.REALM_MATCH,
            name: BuiltInPolicyType.REALM_MATCH,
        });

        if (entity) {
            return entity;
        }

        const attributes : RealmMatchPolicy = {
            attributeName: ['realm_id'],
            attributeNameStrict: false,
            identityMasterMatchAll: true,
        };

        entity = repository.create({
            built_in: true,
            type: BuiltInPolicyType.REALM_MATCH,
            name: BuiltInPolicyType.REALM_MATCH,
        });

        await repository.saveWithAttributes(entity, attributes);

        return entity;
    }
}
