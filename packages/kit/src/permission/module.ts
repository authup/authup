/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyData } from '../policy';
import { PolicyEngine, PolicyError } from '../policy';
import { PermissionError } from './error';
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

        if (options.policyEngine) {
            this.policyEngine = options.policyEngine;
        } else {
            this.policyEngine = new PolicyEngine();
        }
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
    ) : Promise<void>;

    async check(
        input: (PermissionGetOptions | string)[],
        context?: PolicyData
    ) : Promise<void>;

    /**
     * Verify if one or more possible owned permissions satisfy their conditions.
     *
     * @throws PermissionError
     *
     * @param input
     * @param data
     */
    async check(
        input: PermissionGetOptions | string | (PermissionGetOptions | string)[],
        data: PolicyData = {},
    ) : Promise<void> {
        if (!Array.isArray(input)) {
            await this.check([input], data);
            return;
        }

        for (let i = 0; i < input.length; i++) {
            const entity = await this.get(input[i]);
            if (!entity) {
                throw PermissionError.notFound(this.toName(input[i]));
            }

            if (entity.policy) {
                let outcome : boolean;

                try {
                    outcome = await this.policyEngine.evaluate(entity.policy, {
                        ...data,
                        permission: entity,
                    });
                } catch (e) {
                    if (e instanceof PolicyError) {
                        throw PermissionError.evaluationFailed({
                            name: entity.name,
                            policy: entity.policy,
                            policyError: e,
                        });
                    }

                    outcome = false;
                }

                if (!outcome) {
                    throw PermissionError.evaluationFailed({
                        name: entity.name,
                        policy: entity.policy,
                    });
                }
            }
        }
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
     * Check if one or more possible owned permissions satisfy their conditions.
     *
     * @param input
     * @param data
     *
     * @return boolean
     */
    async safeCheck(
        input: PermissionGetOptions | string | (PermissionGetOptions | string)[],
        data: PolicyData = {},
    ) : Promise<boolean> {
        try {
            await this.check(input as any, data);

            return true;
        } catch (e) {
            return false;
        }
    }

    // ----------------------------------------------

    /**
     * Verify if one of the permissions evaluates to true.
     *
     * @throws PermissionError
     *
     * @param input
     * @param data
     */
    async checkOneOf(
        input: (PermissionGetOptions | string)[],
        data: PolicyData = {},
    ) : Promise<void> {
        let error : PermissionError | undefined;

        for (let i = 0; i < input.length; i++) {
            try {
                await this.check(input[i], data);

                return;
            } catch (e) {
                error = e as PermissionError;
            }
        }

        if (error) {
            throw error;
        }

        throw PermissionError.deniedAll(input.map((el) => this.toName(el)));
    }

    /**
     * Check if one of the permissions evaluates to true.
     *
     * @param input
     * @param data
     *
     * @return boolean
     */
    async safeCheckOneOf(
        input: (PermissionGetOptions | string)[],
        data: PolicyData = {},
    ) : Promise<boolean> {
        try {
            await this.checkOneOf(input, data);

            return true;
        } catch (e) {
            return false;
        }
    }

    // ----------------------------------------------

    private toName(input: string | PermissionGetOptions) {
        if (typeof input === 'string') {
            return input;
        }

        return input.name;
    }
}
