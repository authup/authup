/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from '@posva/event-emitter';
import type { PolicyEvaluationContext } from '../policy';
import { PolicyEnforcer } from '../policy';

import type { AbilitiesFilterOptions, Ability } from './types';

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
     * Check if permission evaluates to true.
     *
     * @param name
     * @param evaluationContext
     */
    has(name: string | Ability, evaluationContext: PolicyEvaluationContext = {}) : boolean {
        return this.hasMany([name], evaluationContext);
    }

    // ----------------------------------------------

    /**
     * Check if all permissions evaluate to true.
     *
     * @param input
     * @param evaluationContext
     */
    hasMany(input: (Ability | string)[], evaluationContext: PolicyEvaluationContext = {}) : boolean {
        if (input.length === 0) {
            return true;
        }

        for (let i = 0; i < input.length; i++) {
            const inputItem = input[i];

            let owned : Ability[];
            if (typeof inputItem === 'string') {
                owned = this.find({
                    realmId: null,
                    name: inputItem,
                });
            } else {
                owned = this.find({
                    realmId: inputItem.realmId ?? null,
                    name: inputItem.name,
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
                const outcome = this.policyEnforcer.evaluate(ownedItem.policy, evaluationContext);
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
     * @param input
     */
    find(input?: string | AbilitiesFilterOptions) : Ability[] {
        if (typeof input === 'undefined') {
            return this.items;
        }

        let options : AbilitiesFilterOptions;
        if (typeof input === 'string') {
            options = { name: input };
        } else {
            options = input;
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

            if (options.fn) {
                if (!options.fn(this.items[i])) {
                    continue;
                }
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
