/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationData } from '../policy';
import { PolicyEngine } from '../policy';
import type { PermissionFindOneOptions, PermissionRepository } from './repository';
import { PermissionMemoryRepository } from './repository';

import type { PermissionItem, PermissionManagerOptions } from './types';

export class PermissionManager {
    protected repository : PermissionRepository;

    protected policyEngine : PolicyEngine;

    protected realmId?: string;

    // ----------------------------------------------

    constructor(options: PermissionManagerOptions = {}) {
        if (options.repository) {
            this.repository = options.repository;
        } else {
            this.repository = new PermissionMemoryRepository();
        }

        if (options.realmId) {
            this.realmId = options.realmId;
        }

        this.policyEngine = new PolicyEngine();
    }

    // ----------------------------------------------

    /**
     * Check if a permission exists without any restriction.
     *
     * @param name
     */
    async has(name: string | PermissionFindOneOptions) : Promise<boolean> {
        const entity = await this.get(name);
        return !!entity;
    }

    // ----------------------------------------------

    /**
     * Get a permission.
     *
     * @param name
     */
    async get(name: string | PermissionFindOneOptions) : Promise<PermissionItem | undefined> {
        let options : PermissionFindOneOptions;
        if (typeof name === 'string') {
            options = {
                name,
                realm_id: this.realmId,
            };
        } else {
            options = name;
        }

        return this.repository.findOne(options);
    }

    // ----------------------------------------------

    /**
     * Check if one of the following permission exists without any restriction.
     *
     * @param input
     */
    async hasOneOf(input: (string | PermissionFindOneOptions)[]) : Promise<boolean> {
        for (let i = 0; i < input.length; i++) {
            const entity = await this.has(input[i]);
            if (entity) {
                return true;
            }
        }

        return false;
    }

    // ----------------------------------------------

    /**
     * Check if all permissions exist without any restriction.
     *
     * @param items
     */
    async hasMany(items: (PermissionFindOneOptions | string)[]) : Promise<boolean> {
        for (let i = 0; i < items.length; i++) {
            const entity = await this.has(items[i]);
            if (!entity) {
                return false;
            }
        }

        return true;
    }

    async can(
        input: PermissionFindOneOptions | string,
        context?: PolicyEvaluationData
    ) : Promise<boolean>;

    async can(
        input: (PermissionFindOneOptions | string)[],
        context?: PolicyEvaluationData
    ) : Promise<boolean>;

    /**
     * Check if the owned abilities, satisfy the conditions for a given ability.
     *
     * @param input
     * @param context
     */
    async can(
        input: PermissionFindOneOptions | string | (PermissionFindOneOptions | string)[],
        context: PolicyEvaluationData = {},
    ) : Promise<boolean> {
        if (!Array.isArray(input)) {
            return this.can([input], context);
        }

        for (let i = 0; i < input.length; i++) {
            const entity = await this.get(input[i]);
            if (!entity) {
                return false;
            }

            if (!entity.policy) {
                continue;
            }

            try {
                const outcome = await this.policyEngine.evaluate(entity.policy, context);
                if (!outcome) {
                    return false;
                }
            } catch (e) {
                return false;
            }
        }

        return true;
    }

    async canOneOf(
        input: (PermissionFindOneOptions | string)[],
        context?: PolicyEvaluationData,
    ) : Promise<boolean> {
        for (let i = 0; i < input.length; i++) {
            const entity = await this.can(input[i], context);
            if (entity) {
                return true;
            }
        }

        return false;
    }
}
