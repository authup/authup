/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyData } from '../policy';
import { PolicyEngine } from '../policy';
import type { PermissionGetOptions, PermissionProvider } from './provider';
import { PermissionMemoryProvider } from './provider';

import type { PermissionCheckerOptions, PermissionItem } from './types';

export class PermissionChecker {
    protected provider : PermissionProvider;

    protected policyEngine : PolicyEngine;

    protected realmId?: string;

    // ----------------------------------------------

    constructor(options: PermissionCheckerOptions = {}) {
        if (options.provider) {
            this.provider = options.provider;
        } else {
            this.provider = new PermissionMemoryProvider();
        }

        if (options.realmId) {
            this.realmId = options.realmId;
        }

        this.policyEngine = new PolicyEngine();
    }

    // ----------------------------------------------

    /**
     * Check if an ability exists without any restriction.
     *
     * @param name
     */
    async has(name: string | PermissionGetOptions) : Promise<boolean> {
        const entity = await this.get(name);
        return !!entity;
    }

    // ----------------------------------------------

    /**
     * Get a permission.
     *
     * @param input
     */
    async get(input: string | PermissionGetOptions) : Promise<PermissionItem | undefined> {
        if (typeof input === 'string') {
            const options : PermissionGetOptions = {
                name: input,
            };

            if (typeof this.realmId !== 'undefined') {
                options.realmId = this.realmId;
            }

            return this.provider.get(options);
        }

        if (
            typeof input.realmId === 'undefined' &&
            typeof this.realmId !== 'undefined'
        ) {
            input.realmId = this.realmId;
        }

        return this.provider.get(input);
    }

    // ----------------------------------------------

    /**
     * Check if one of the following permission exists without any restriction.
     *
     * @param input
     */
    async hasOneOf(input: (string | PermissionGetOptions)[]) : Promise<boolean> {
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
    async hasMany(items: (PermissionGetOptions | string)[]) : Promise<boolean> {
        for (let i = 0; i < items.length; i++) {
            const entity = await this.has(items[i]);
            if (!entity) {
                return false;
            }
        }

        return true;
    }

    // ----------------------------------------------

    async check(
        input: PermissionGetOptions | string,
        context?: PolicyData
    ) : Promise<boolean>;

    async check(
        input: (PermissionGetOptions | string)[],
        context?: PolicyData
    ) : Promise<boolean>;

    /**
     * Check if the owned abilities, satisfy the conditions for a given ability.
     *
     * @param input
     * @param data
     */
    async check(
        input: PermissionGetOptions | string | (PermissionGetOptions | string)[],
        data: PolicyData = {},
    ) : Promise<boolean> {
        if (!Array.isArray(input)) {
            return this.check([input], data);
        }

        for (let i = 0; i < input.length; i++) {
            const entity = await this.get(input[i]);
            if (!entity) {
                return false;
            }

            if (entity.policy) {
                const outcome = await this.policyEngine.evaluate(entity.policy, data);
                if (!outcome) {
                    return false;
                }
            }
        }

        return true;
    }

    async safeCheck(
        input: PermissionGetOptions | string,
        context?: PolicyData
    ) : Promise<boolean>;

    async safeCheck(
        input: (PermissionGetOptions | string)[],
        context?: PolicyData
    ) : Promise<boolean>;

    /**
     * Check if the owned abilities, satisfy the conditions for a given ability.
     *
     * @param input
     * @param data
     */
    async safeCheck(
        input: PermissionGetOptions | string | (PermissionGetOptions | string)[],
        data: PolicyData = {},
    ) : Promise<boolean> {
        try {
            return await this.check(input as any, data);
        } catch (e) {
            return false;
        }
    }

    // ----------------------------------------------

    /**
     * Check if one of the permissions evaluates to true.
     *
     * @param input
     * @param data
     */
    async checkOneOf(
        input: (PermissionGetOptions | string)[],
        data: PolicyData = {},
    ) : Promise<boolean> {
        for (let i = 0; i < input.length; i++) {
            const entity = await this.check(input[i], data);
            if (entity) {
                return true;
            }
        }

        return false;
    }

    /**
     * Safe (no throw) check if one of the permissions evaluates to true.
     *
     * @param input
     * @param data
     */
    async safeCheckOneOf(
        input: (PermissionGetOptions | string)[],
        data: PolicyData = {},
    ) : Promise<boolean> {
        for (let i = 0; i < input.length; i++) {
            const entity = await this.safeCheck(input[i], data);
            if (entity) {
                return true;
            }
        }

        return false;
    }
}
