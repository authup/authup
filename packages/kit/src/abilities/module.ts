/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from '@posva/event-emitter';
import type { PolicyEvaluationContext } from '../policy';
import { PolicyEnforcer } from '../policy';

import type { AbilitiesFindOptions, Ability } from './types';

export class Abilities extends EventEmitter<{
    updated: []
}> {
    protected policyEnforcer : PolicyEnforcer;

    protected items: Ability[];

    // ----------------------------------------------

    constructor(input: Ability[] | Ability = []) {
        super();

        this.policyEnforcer = new PolicyEnforcer();

        this.set(input);
    }

    // ----------------------------------------------

    /**
     * Check if a permission exists without any restriction.
     *
     * @param name
     */
    has(name: string | Ability) : boolean {
        return this.hasMany([name]);
    }

    // ----------------------------------------------

    /**
     * Check if all permissions exist without any restriction.
     *
     * @param items
     */
    hasMany(items: (Ability | string)[]) : boolean {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            let owned: Ability[];
            if (typeof item === 'string') {
                owned = this.find({
                    realmId: null,
                    name: item,
                });
            } else {
                owned = this.find({
                    realmId: item.realmId ?? null,
                    name: item.name,
                });
            }

            if (owned.length === 0) {
                return false;
            }
        }

        return true;
    }

    can(
        input: Ability | string,
        context?: PolicyEvaluationContext
    ) : boolean;

    can(
        input: (Ability | string)[],
        context?: PolicyEvaluationContext
    ) : boolean;

    /**
     * Check if the owned abilities, satisfy the conditions for a given ability.
     *
     * @param input
     * @param context
     */
    can(
        input: Ability | string | (Ability | string)[],
        context: PolicyEvaluationContext = {},
    ) : boolean {
        if (!Array.isArray(input)) {
            return this.can([input], context);
        }

        for (let i = 0; i < input.length; i++) {
            const item = input[i];

            let owned : Ability[];
            if (typeof item === 'string') {
                owned = this.find({
                    realmId: null,
                    name: item,
                });
            } else {
                owned = this.find({
                    realmId: item.realmId ?? null,
                    name: item.name,
                });
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
                const outcome = this.policyEnforcer.evaluate(ownedItem.policy, context);
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

    // ----------------------------------------------

    /**
     * Find all matching abilities.
     *
     * @param options
     */
    find(options: AbilitiesFindOptions = {}) : Ability[] {
        if (typeof options === 'undefined') {
            return this.items;
        }

        const output : Ability[] = [];

        for (let i = 0; i < this.items.length; i++) {
            if (
                options.realmId === null &&
                typeof this.items[i].realmId !== 'undefined' &&
                this.items[i].realmId !== null
            ) {
                continue;
            }

            if (
                options.realmId &&
                this.items[i].realmId !== options.realmId
            ) {
                continue;
            }

            if (
                options.name &&
                this.items[i].name !== options.name
            ) {
                continue;
            }

            output.push(this.items[i]);
        }

        return output;
    }

    add(input: Ability) {
        this.addMany([input]);
    }

    addMany(input: Ability[]) {
        this.items.push(...input);
        this.emit('updated');
    }

    set(input: Ability[] | Ability) {
        this.items = Array.isArray(input) ?
            input :
            [input];

        this.emit('updated');
    }
}
