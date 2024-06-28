/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from '@posva/event-emitter';
import type { PolicyEvaluationContext } from '../policy';
import { PolicyEngine } from '../policy';

import type { Ability } from './types';

export class Abilities extends EventEmitter<{
    updated: []
}> {
    protected policyEnforcer : PolicyEngine;

    protected items : Record<string, Ability[]>;

    // ----------------------------------------------

    constructor(input: Ability[] = []) {
        super();

        this.policyEnforcer = new PolicyEngine();
        this.items = {};

        this.set(input);
    }

    // ----------------------------------------------

    /**
     * Check custom abilities of a specific realm.
     *
     * @param realmId
     */
    of(realmId?: string): Abilities {
        return new Abilities(this.items[realmId]);
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
                owned = this.find(item);
            } else {
                owned = this.find(item.name);
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
                owned = this.find(item);
            } else {
                owned = this.find(item.name);
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
     * @param name
     */
    find(name?: string) : Ability[] {
        const nsp = this.items['/'];
        if (!Array.isArray(nsp)) {
            return [];
        }

        if (name) {
            return nsp.filter((nsp) => nsp.name === name);
        }

        return nsp;
    }

    // ----------------------------------------------

    add(input: Ability) {
        this.addMany([input]);
    }

    addMany(input: Ability[]) {
        for (let i = 0; i < input.length; i++) {
            const ability = input[i];
            const namespace = ability.realmId || '/';

            if (!Array.isArray(this.items[namespace])) {
                this.items[namespace] = [];
            }

            this.items[namespace].push(ability);
        }

        this.emit('updated');
    }

    set(input: Ability[] | Ability) {
        this.items = {};

        if (Array.isArray(input)) {
            this.addMany(input);
            return;
        }

        this.add(input);
    }
}
