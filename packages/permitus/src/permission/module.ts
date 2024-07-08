/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from '@posva/event-emitter';
import type { PolicyEvaluationContext } from '../policy';
import { PolicyEngine } from '../policy';
import type { PermissionRepository } from './repository';
import { PermissionMemoryRepository } from './repository';

import type { PermissionEngineOptions, PermissionItem } from './types';

export class PermissionManager extends EventEmitter<{
    updated: []
}> {
    protected store : PermissionRepository;

    protected policyEngine : PolicyEngine;

    // ----------------------------------------------

    constructor(options: PermissionEngineOptions = {}) {
        super();

        this.store = options.repository || new PermissionMemoryRepository();
        this.policyEngine = options.policyEngine || new PolicyEngine();
    }

    // ----------------------------------------------

    /**
     * Check if a permission exists without any restriction.
     *
     * @param name
     */
    async has(name: string | PermissionItem) : Promise<boolean> {
        return this.hasMany([name]);
    }

    // ----------------------------------------------

    /**
     * Check if one of the following permission exists without any restriction.
     *
     * @param items
     */
    async hasOneOf(items: (string | PermissionItem)[]) : Promise<boolean> {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            let owned: PermissionItem[];
            if (typeof item === 'string') {
                owned = await this.store.getMany(item);
            } else {
                owned = await this.store.getMany(item.name);
            }

            if (owned.length > 0) {
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
    async hasMany(items: (PermissionItem | string)[]) : Promise<boolean> {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            let owned: PermissionItem[];
            if (typeof item === 'string') {
                owned = await this.store.getMany(item);
            } else {
                owned = await this.store.getMany(item.name);
            }

            if (owned.length === 0) {
                return false;
            }
        }

        return true;
    }

    async can(
        input: PermissionItem | string,
        context?: PolicyEvaluationContext
    ) : Promise<boolean>;

    async can(
        input: (PermissionItem | string)[],
        context?: PolicyEvaluationContext
    ) : Promise<boolean>;

    /**
     * Check if the owned abilities, satisfy the conditions for a given ability.
     *
     * @param input
     * @param context
     */
    async can(
        input: PermissionItem | string | (PermissionItem | string)[],
        context: PolicyEvaluationContext = {},
    ) : Promise<boolean> {
        if (!Array.isArray(input)) {
            return this.can([input], context);
        }

        for (let i = 0; i < input.length; i++) {
            const item = input[i];

            let owned : PermissionItem[];
            if (typeof item === 'string') {
                owned = await this.store.getMany(item);
            } else {
                owned = await this.store.getMany(item.name);
            }

            if (owned.length === 0) {
                return false;
            }

            let hasPolicies = false;
            let hasPositiveOutcome = false;
            for (let j = 0; j < owned.length; j++) {
                const ownedItem = owned[j];
                if (!ownedItem.policy) {
                    continue;
                }

                hasPolicies = true;
                const outcome = await this.policyEngine.evaluate(ownedItem.policy, context);
                if (outcome) {
                    hasPositiveOutcome = true;
                    break;
                }
            }

            if (hasPolicies) {
                if (!hasPositiveOutcome) {
                    return false;
                }
            }
        }

        return true;
    }
}
